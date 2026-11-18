import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CampoSensible } from '../openapi/campo-sensible';
import { Order } from '../orders/order.entity';
import { Payment } from '../payments/payment.entity';
import { Restaurant } from '../restaurants/restaurant.entity';

export type RolDeUsuario = 'user' | 'admin' | 'waiter' | 'backoffice';
export const ROLES_DE_USUARIO: RolDeUsuario[] = ['user', 'admin', 'waiter', 'backoffice'];

/** Tabla `user` (modelo-de-datos.md, 2.2). */
@Entity('user')
@Index(['restaurant'])
export class User {
  @ApiProperty({ type: 'integer' })
  @PrimaryGeneratedColumn()
  id: number;

  /** Campo sensible que llega en T05 a propósito (O4). */
  @CampoSensible({ type: 'string' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @ApiProperty({ enum: ROLES_DE_USUARIO })
  @Column({ type: 'enum', enum: ROLES_DE_USUARIO, default: 'user' })
  role: RolDeUsuario;

  @ApiProperty({ type: 'boolean' })
  @Column({ type: 'boolean', default: false })
  isGuest: boolean;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @ApiProperty({ type: () => Restaurant, nullable: true })
  @ManyToOne(() => Restaurant, { eager: true, nullable: true })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Relation<Restaurant> | null;

  @OneToMany(() => Order, (pedido) => pedido.user)
  orders: Relation<Order[]>;

  @OneToMany(() => Payment, (pago) => pago.user)
  payments: Relation<Payment[]>;
}
