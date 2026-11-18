import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Order } from '../orders/order.entity';
import { Payment } from '../payments/payment.entity';
import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';

const DECIMAL = 'decimal(10,2): llega como string.';

/** Tabla `table_session` (modelo-de-datos.md, 2.4), con la intermedia `table_session_users_user` (2.5). Los `decimal` llegan como string. */
@Entity('table_session')
@Index(['tableId'])
@Index(['closedAt'])
@Index(['tableId', 'closedAt'])
export class TableSession {
  @ApiProperty({ type: 'integer' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: 'integer' })
  @Column({ type: 'int' })
  tableId: number;

  @ManyToOne(() => Table, (mesa) => mesa.tableSessions)
  @JoinColumn({ name: 'tableId' })
  table: Relation<Table>;

  @ApiProperty({ type: 'string', description: DECIMAL })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountPaid: string;

  @ApiProperty({ type: 'string', description: DECIMAL })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tips: string;

  @ApiProperty({ type: 'string', description: DECIMAL })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: string;

  @ApiProperty({ type: 'boolean' })
  @Column({ type: 'boolean', default: false })
  requestingHelp: boolean;

  @ApiProperty({ type: () => [User] })
  @ManyToMany(() => User)
  @JoinTable({ name: 'table_session_users_user' })
  users: Relation<User[]>;

  @ApiProperty({ type: () => [Order], description: 'Sin los pedidos pending; con los canceled; por createdAt ascendente.' })
  @OneToMany(() => Order, (pedido) => pedido.tableSession)
  orders: Relation<Order[]>;

  @OneToMany(() => Payment, (pago) => pago.session)
  payments: Relation<Payment[]>;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  @Column({ type: 'datetime', nullable: true })
  closedAt: Date | null;
}
