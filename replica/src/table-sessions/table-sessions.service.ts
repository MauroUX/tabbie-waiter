import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Payment } from '../payments/payment.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { Table } from '../tables/table.entity';
import { TableSession } from './table-session.entity';

@Injectable()
export class TableSessionsService {
  constructor(@InjectDataSource() private readonly origen: DataSource) {}

  /**
   * `/join` (DP-74): suma al comensal a la sesión activa de la mesa, o abre una si está libre.
   * Todo en una transacción con la fila de la mesa bloqueada como primera sentencia (D9): dos comensales a la vez
   * no abren dos sesiones, y el mismo comensal dos veces no se duplica. Solo se unen comensales (DP-83).
   */
  async unirse(restaurantId: string, numeroDeMesa: string, userId: unknown): Promise<TableSession> {
    if (typeof userId !== 'number' || !Number.isInteger(userId)) {
      throw new BadRequestException('userId es obligatorio y tiene que ser un entero');
    }
    if (!/^\d+$/.test(numeroDeMesa) || !Number.isSafeInteger(Number(numeroDeMesa))) {
      throw new BadRequestException('El número de mesa tiene que ser un entero');
    }
    const numero = Number(numeroDeMesa);

    const sesionId = await this.origen.transaction(async (manager) => {
      // D9: la primera sentencia bloquea la fila de la mesa. MySQL corre en REPEATABLE READ: la primera lectura normal
      // fija la foto de la transacción, así que un bloqueo que llega después no vería lo que otro /join confirmó.
      const [mesa] = (await manager.query(
        'SELECT id, isBusy, activeSessionId FROM `table` WHERE restaurantId = ? AND number = ? FOR UPDATE',
        [restaurantId, numero],
      )) as Array<{ id: number; isBusy: number; activeSessionId: number | null }>;
      if (mesa === undefined) {
        const restaurante = await manager.findOne(Restaurant, { where: { id: restaurantId } });
        if (restaurante === null) {
          throw new NotFoundException(`No existe el restaurante ${restaurantId}`);
        }
        throw new NotFoundException(`No existe la mesa ${numero} en el restaurante ${restaurantId}`);
      }
      const [usuario] = (await manager.query('SELECT role, restaurantId FROM `user` WHERE id = ?', [userId])) as Array<{
        role: string;
        restaurantId: string | null;
      }>;
      if (usuario === undefined) {
        throw new NotFoundException(`No existe el usuario ${userId}`);
      }
      // DP-83: solo se unen comensales (rol user y sin restaurante). Sin datos del usuario en el mensaje, sin tocar la mesa.
      if (usuario.role !== 'user' || usuario.restaurantId !== null) {
        throw new ForbiddenException('Solo se unen a una mesa los comensales: el usuario no es un comensal');
      }

      let sesionId = await this.sesionActiva(manager, mesa);
      if (sesionId === null) {
        const sesion = await manager.save(TableSession, manager.create(TableSession, { tableId: mesa.id }));
        sesionId = sesion.id;
        await manager.update(Table, { id: mesa.id }, { isBusy: true, activeSessionId: sesionId });
      }
      // Sin duplicar al comensal: la lectura bloquea, y con la mesa bloqueada nadie más inserta en esta sesión.
      const filas: unknown[] = await manager.query(
        'SELECT 1 FROM `table_session_users_user` WHERE `tableSessionId` = ? AND `userId` = ? FOR UPDATE',
        [sesionId, userId],
      );
      if (filas.length === 0) {
        await manager.createQueryBuilder().relation(TableSession, 'users').of(sesionId).add(userId);
      }
      return sesionId;
    });

    return this.origen.manager.findOneOrFail(TableSession, {
      where: { id: sesionId },
      relations: { users: { restaurant: true } },
      order: { users: { id: 'ASC' } },
    });
  }

  /** T07 (DP-82): los pagos de la sesión por `createdAt` e `id` ascendente, con su `user` y el `restaurant` del user. */
  pagosDe(sesionId: number): Promise<Payment[]> {
    return this.origen.manager.find(Payment, {
      where: { sessionId: sesionId },
      relations: { user: { restaurant: true } },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  /** El id de la sesión a la que apunta `activeSessionId`, si la mesa está ocupada y esa sesión sigue abierta (lectura con bloqueo). */
  private async sesionActiva(
    manager: EntityManager,
    mesa: { isBusy: number; activeSessionId: number | null },
  ): Promise<number | null> {
    if (!mesa.isBusy || mesa.activeSessionId === null) {
      return null;
    }
    const [sesion] = (await manager.query('SELECT id, closedAt FROM `table_session` WHERE id = ? FOR UPDATE', [
      mesa.activeSessionId,
    ])) as Array<{ id: number; closedAt: Date | null }>;
    return sesion !== undefined && sesion.closedAt === null ? sesion.id : null;
  }
}
