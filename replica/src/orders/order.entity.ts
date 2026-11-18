import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Restaurant } from '../restaurants/restaurant.entity';
import { TableSession } from '../table-sessions/table-session.entity';
import { User } from '../users/user.entity';
import { OrderProductDetails } from './order-product-details.entity';

export type TipoDePedido = 'appetizer' | 'main_course' | 'dessert';
export type EstadoDePedido = 'pending' | 'confirmed' | 'in_kitchen' | 'canceled';

/** Tabla `order` (modelo-de-datos.md, 2.6). */
@Entity('order')
@Index(['tableSession'])
@Index(['restaurant'])
@Index(['status'])
@Index(['tableSession', 'status'])
@Index(['tableSession', 'isPaid', 'createdAt'])
@Index(['tableSession', 'user', 'isPaid', 'createdAt'])
export class Order {
  @ApiProperty({ type: 'integer' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TableSession, (sesion) => sesion.orders, { nullable: true })
  @JoinColumn({ name: 'tableSessionId' })
  tableSession: Relation<TableSession> | null;

  @ApiProperty({ type: () => User, nullable: true })
  @ManyToOne(() => User, (usuario) => usuario.orders, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: Relation<User> | null;

  @ManyToOne(() => Restaurant, (restaurante) => restaurante.orders, { nullable: true })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Relation<Restaurant> | null;

  @ApiProperty({ type: () => [OrderProductDetails] })
  @OneToMany(() => OrderProductDetails, (linea) => linea.order, { eager: true, cascade: true })
  items: Relation<OrderProductDetails[]>;

  @ApiProperty({ enum: ['appetizer', 'main_course', 'dessert'] })
  @Column({ type: 'enum', enum: ['appetizer', 'main_course', 'dessert'], default: 'main_course' })
  type: TipoDePedido;

  @ApiProperty({ enum: ['pending', 'confirmed', 'in_kitchen', 'canceled'] })
  @Column({ type: 'enum', enum: ['pending', 'confirmed', 'in_kitchen', 'canceled'], default: 'pending' })
  status: EstadoDePedido;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  @Column({ type: 'datetime', nullable: true })
  sentToKitchenAt: Date | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  @Column({ type: 'datetime', nullable: true })
  canceledAt: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @ApiProperty({ type: 'boolean' })
  @Column({ type: 'boolean', default: false })
  isPaid: boolean;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  @Column({ type: 'datetime', nullable: true })
  paidAt: Date | null;
}
