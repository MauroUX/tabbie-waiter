import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Payment } from '../payments/payment.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';
import { TableSession } from './table-session.entity';

@Injectable()
export class TableSessionsService {
  constructor(@InjectDataSource() private readonly origen: DataSource) {}

  /**
   * `/join` (DP-74): suma al comensal a la sesión activa de la mesa, o abre una si está libre.
   * Todo en una transacción con la fila de la mesa bloqueada: dos comensales a la vez no abren dos sesiones.
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
      const restaurante = await manager.findOne(Restaurant, { where: { id: restaurantId } });
      if (restaurante === null) {
        throw new NotFoundException(`No existe el restaurante ${restaurantId}`);
      }
      const usuario = await manager.findOne(User, { where: { id: userId } });
      if (usuario === null) {
        throw new NotFoundException(`No existe el usuario ${userId}`);
      }
      const mesa = await manager
        .createQueryBuilder(Table, 'mesa')
        .where('mesa.restaurantId = :restaurantId AND mesa.number = :numero', { restaurantId, numero })
        .setLock('pessimistic_write')
        .getOne();
      if (mesa === null) {
        throw new NotFoundException(`No existe la mesa ${numero} en el restaurante ${restaurantId}`);
      }

      let sesion = await this.sesionActiva(manager, mesa);
      if (sesion === null) {
        sesion = await manager.save(TableSession, manager.create(TableSession, { tableId: mesa.id }));
        await manager.update(Table, { id: mesa.id }, { isBusy: true, activeSessionId: sesion.id });
      }
      // Sin duplicar al comensal: si ya está en la intermedia, no se vuelve a insertar.
      const filas: unknown[] = await manager.query(
        'SELECT 1 FROM `table_session_users_user` WHERE `tableSessionId` = ? AND `userId` = ?',
        [sesion.id, userId],
      );
      if (filas.length === 0) {
        await manager.createQueryBuilder().relation(TableSession, 'users').of(sesion.id).add(userId);
      }
      return sesion.id;
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

  /** La sesión a la que apunta `activeSessionId`, si la mesa está ocupada y esa sesión sigue abierta. */
  private async sesionActiva(manager: EntityManager, mesa: Table): Promise<TableSession | null> {
    if (!mesa.isBusy || mesa.activeSessionId === null) {
      return null;
    }
    const sesion = await manager.findOne(TableSession, { where: { id: mesa.activeSessionId } });
    return sesion !== null && sesion.closedAt === null ? sesion : null;
  }
}
