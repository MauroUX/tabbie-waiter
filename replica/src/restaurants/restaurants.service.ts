import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { Table } from '../tables/table.entity';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Table) private readonly mesas: Repository<Table>,
    @InjectRepository(Order) private readonly pedidos: Repository<Order>,
  ) {}

  /**
   * T05 (DP-60): las mesas ocupadas del restaurante, por `number` ascendente. Una mesa está ocupada si
   * `isBusy` es verdadero y `activeSessionId` apunta a una `table_session` con `closedAt` nulo.
   * Devuelve las entidades tal cual, sin excluir campos: O4 se reproduce a propósito (DP-50).
   */
  async findActiveTables(restaurantId: string): Promise<Table[]> {
    const mesas = await this.mesas.find({
      where: { restaurant: { id: restaurantId }, isBusy: true, activeSession: { closedAt: IsNull() } },
      relations: { restaurant: true, activeSession: { users: true } },
      order: { number: 'ASC', activeSession: { users: { id: 'ASC' } } },
    });
    if (mesas.length === 0) {
      return [];
    }

    // Los pedidos van aparte: filtrarlos dentro de la misma consulta descartaría las mesas sin pedidos.
    // Sin los `pending` y con los `canceled`, por `createdAt` ascendente. Los ítems, el producto, las opciones
    // y los valores son eager; el usuario de cada pedido trae su restaurante (eager).
    // El filtro de la consulta garantiza la sesión activa; la comprobación es para el tipo.
    const sesiones = mesas.flatMap((mesa) => (mesa.activeSession === null ? [] : [mesa.activeSession.id]));
    const pedidos = await this.pedidos.find({
      where: { tableSession: { id: In(sesiones) }, status: Not('pending') },
      relations: { user: true, tableSession: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    const porSesion = new Map<number, Order[]>();
    for (const pedido of pedidos) {
      const sesionId = pedido.tableSession?.id;
      // La sesión se cargó solo para agrupar: no forma parte de la respuesta.
      Reflect.deleteProperty(pedido, 'tableSession');
      if (sesionId !== undefined) {
        porSesion.set(sesionId, [...(porSesion.get(sesionId) ?? []), pedido]);
      }
    }
    for (const mesa of mesas) {
      if (mesa.activeSession !== null) {
        mesa.activeSession.orders = porSesion.get(mesa.activeSession.id) ?? [];
      }
    }
    return mesas;
  }
}
