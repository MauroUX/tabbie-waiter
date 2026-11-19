import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { SseService } from '../sse/sse.service';
import { TableSession } from '../table-sessions/table-session.entity';
import type { User } from '../users/user.entity';
import type { PedidoDeRespuesta } from './dto';
import { Order } from './order.entity';
import { recalcularTotalDeSesion } from './total-de-sesion';

export const EVENTO_PEDIDO_CONFIRMADO = 'order-confirmed-notification';

interface OpcionValidada {
  productOptionId: number;
  valueIds: number[];
}
interface ItemValidado {
  productId: number;
  quantity: number;
  note: string | null;
  selectedOptions: OpcionValidada[];
}
interface CuerpoValidado {
  tableSessionId: number;
  items: ItemValidado[];
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const esEntero = (valor: unknown): valor is number => typeof valor === 'number' && Number.isInteger(valor);

/** Validación manual del cuerpo de `POST /orders` (la réplica no usa class-validator). */
function validarCuerpo(cuerpo: unknown): CuerpoValidado {
  if (!esObjeto(cuerpo)) {
    throw new BadRequestException('El body tiene que ser un objeto con tableSessionId e items');
  }
  if (!esEntero(cuerpo.tableSessionId)) {
    throw new BadRequestException('tableSessionId es obligatorio y tiene que ser un entero');
  }
  if (!Array.isArray(cuerpo.items) || cuerpo.items.length === 0) {
    throw new BadRequestException('items tiene que ser una lista con al menos un ítem');
  }
  const items = cuerpo.items.map((item: unknown, i: number): ItemValidado => {
    if (!esObjeto(item)) {
      throw new BadRequestException(`items[${i}] tiene que ser un objeto`);
    }
    if (!esEntero(item.productId)) {
      throw new BadRequestException(`items[${i}].productId es obligatorio y tiene que ser un entero`);
    }
    if (!esEntero(item.quantity) || item.quantity < 1) {
      throw new BadRequestException(`items[${i}].quantity (cantidad) tiene que ser un entero mayor o igual a 1`);
    }
    if (item.note !== undefined && item.note !== null && typeof item.note !== 'string') {
      throw new BadRequestException(`items[${i}].note tiene que ser un texto`);
    }
    const crudas = item.selectedOptions ?? [];
    if (!Array.isArray(crudas)) {
      throw new BadRequestException(`items[${i}].selectedOptions tiene que ser una lista`);
    }
    const selectedOptions = crudas.map((opcion: unknown, j: number): OpcionValidada => {
      if (!esObjeto(opcion) || !esEntero(opcion.productOptionId)) {
        throw new BadRequestException(`items[${i}].selectedOptions[${j}].productOptionId tiene que ser un entero`);
      }
      if (!Array.isArray(opcion.valueIds) || !opcion.valueIds.every(esEntero)) {
        throw new BadRequestException(`items[${i}].selectedOptions[${j}].valueIds tiene que ser una lista de enteros`);
      }
      return { productOptionId: opcion.productOptionId, valueIds: opcion.valueIds as number[] };
    });
    return { productId: item.productId, quantity: item.quantity, note: (item.note as string | null) ?? null, selectedOptions };
  });
  return { tableSessionId: cuerpo.tableSessionId, items };
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource() private readonly origen: DataSource,
    @InjectRepository(Order) private readonly pedidos: Repository<Order>,
    private readonly sse: SseService,
  ) {}

  /** `POST /orders` (DP-75): el pedido nace `pending`, del usuario del JWT y del restaurante de la mesa. */
  async crear(usuario: User, cuerpoCrudo: unknown): Promise<PedidoDeRespuesta> {
    const cuerpo = validarCuerpo(cuerpoCrudo);
    const manager = this.origen.manager;

    const sesion = await manager.findOne(TableSession, {
      where: { id: cuerpo.tableSessionId },
      relations: { table: { restaurant: true } },
    });
    if (sesion === null) {
      throw new NotFoundException(`No existe la sesión ${cuerpo.tableSessionId}`);
    }
    if (sesion.closedAt !== null) {
      throw new ConflictException(`La sesión ${sesion.id} está cerrada`);
    }
    if (!(await this.estaEnLaSesion(manager, sesion.id, usuario.id))) {
      throw new ForbiddenException('El usuario no está en la sesión de la mesa');
    }
    const restauranteId = sesion.table?.restaurant?.id;
    if (restauranteId === undefined) {
      throw new ConflictException(`La mesa de la sesión ${sesion.id} no tiene restaurante`);
    }

    await this.validarProductos(manager, restauranteId, cuerpo.items);

    const guardado = await this.pedidos.save(
      this.pedidos.create({
        tableSession: { id: sesion.id },
        user: { id: usuario.id },
        restaurant: { id: restauranteId },
        items: cuerpo.items.map((item) => ({
          product: { id: item.productId },
          quantity: item.quantity,
          note: item.note,
          selectedOptions: item.selectedOptions.map((opcion) => ({
            productOption: { id: opcion.productOptionId },
            values: opcion.valueIds.map((id) => ({ id })),
          })),
        })),
      }),
    );
    return this.leerPedido(guardado.id);
  }

  /** `PUT /orders/:id/confirm` (DP-76): confirma, recalcula el total (DP-77) y emite T16 (DP-78). */
  async confirmar(usuario: User, idCrudo: string): Promise<PedidoDeRespuesta> {
    if (!/^\d+$/.test(idCrudo) || !Number.isSafeInteger(Number(idCrudo))) {
      throw new BadRequestException('El id del pedido tiene que ser un entero');
    }
    const pedidoId = Number(idCrudo);

    const { sesionId, restauranteId } = await this.origen.transaction(async (manager) => {
      // Con la fila bloqueada, dos confirmaciones a la vez no pasan las dos por `pending`.
      const [fila] = (await manager.query(
        'SELECT status, tableSessionId, restaurantId FROM `order` WHERE id = ? FOR UPDATE',
        [pedidoId],
      )) as Array<{ status: string; tableSessionId: number | null; restaurantId: string | null }>;
      if (fila === undefined) {
        throw new NotFoundException(`No existe el pedido ${pedidoId}`);
      }
      if (fila.tableSessionId === null || fila.restaurantId === null) {
        throw new ConflictException(`El pedido ${pedidoId} no tiene sesión o restaurante`);
      }
      // El mozo ya quedó afuera por rol; un `user` solo confirma los pedidos de su sesión.
      if (usuario.role === 'user' && !(await this.estaEnLaSesion(manager, fila.tableSessionId, usuario.id))) {
        throw new ForbiddenException('El usuario no está en la sesión del pedido');
      }
      if (fila.status !== 'pending') {
        throw new ConflictException(`El pedido ${pedidoId} no está pending: está ${fila.status}`);
      }
      // `confirmedAt` es un datetime sin fracción: se fija ya truncado a segundos (UTC).
      const confirmedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
      await manager.update(Order, { id: pedidoId }, { status: 'confirmed', confirmedAt });
      await recalcularTotalDeSesion(manager, fila.tableSessionId);
      return { sesionId: fila.tableSessionId, restauranteId: fila.restaurantId };
    });

    const pedido = await this.leerPedido(pedidoId);
    const sesion = await this.origen.manager.findOneOrFail(TableSession, {
      where: { id: sesionId },
      relations: { table: true },
    });
    // El `confirmedAt` del evento sale de la columna, tal como lo devuelve la respuesta.
    this.sse.emitir(restauranteId, {
      type: EVENTO_PEDIDO_CONFIRMADO,
      data: {
        body: JSON.stringify({
          orderId: pedidoId,
          tableNumber: sesion.table.number,
          tableSessionId: sesionId,
          restaurantId: restauranteId,
          confirmedAt: pedido.confirmedAt?.toISOString() ?? null,
        }),
      },
    });
    return pedido;
  }

  private async estaEnLaSesion(manager: EntityManager, sesionId: number, userId: number): Promise<boolean> {
    const filas: unknown[] = await manager.query(
      'SELECT 1 FROM `table_session_users_user` WHERE `tableSessionId` = ? AND `userId` = ?',
      [sesionId, userId],
    );
    return filas.length > 0;
  }

  /** Cada producto existe en el restaurante de la mesa, y cada opción y valor elegidos son de ese producto. */
  private async validarProductos(manager: EntityManager, restauranteId: string, items: ItemValidado[]): Promise<void> {
    const ids = [...new Set(items.map((item) => item.productId))];
    const productos = await manager.find(Product, {
      where: { id: In(ids), restaurant: { id: restauranteId }, deletedSince: IsNull() },
      relations: { productOptions: { productOptionValues: true } },
    });
    const porId = new Map(productos.map((producto) => [producto.id, producto]));
    for (const item of items) {
      const producto = porId.get(item.productId);
      if (producto === undefined) {
        throw new BadRequestException(`El producto ${item.productId} no existe en el restaurante de la mesa`);
      }
      for (const elegida of item.selectedOptions) {
        const opcion = producto.productOptions.find((o) => o.id === elegida.productOptionId);
        if (opcion === undefined) {
          throw new BadRequestException(
            `La opción ${elegida.productOptionId} no corresponde al producto ${item.productId}`,
          );
        }
        for (const valorId of elegida.valueIds) {
          if (!opcion.productOptionValues.some((v) => v.id === valorId)) {
            throw new BadRequestException(`El valor ${valorId} no corresponde a la opción ${opcion.id}`);
          }
        }
      }
    }
  }

  /** El pedido con el árbol de ítems (eager) y, como columnas, los ids de usuario, restaurante y sesión; sin `user`. */
  private async leerPedido(id: number): Promise<PedidoDeRespuesta> {
    const pedido = await this.pedidos.findOneOrFail({ where: { id } });
    const [ids] = (await this.origen.manager.query(
      'SELECT userId, restaurantId, tableSessionId FROM `order` WHERE id = ?',
      [id],
    )) as Array<{ userId: number | null; restaurantId: string | null; tableSessionId: number | null }>;
    return { ...pedido, userId: ids.userId, restaurantId: ids.restaurantId, tableSessionId: ids.tableSessionId } as PedidoDeRespuesta;
  }
}
