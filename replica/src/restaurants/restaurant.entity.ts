import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CampoSensible } from '../openapi/campo-sensible';
import { Order } from '../orders/order.entity';
import { Product } from '../products/product.entity';
import { Table } from '../tables/table.entity';

/** Tabla `restaurant` (modelo-de-datos.md, 2.1). El @Check de los umbrales no existe en MySQL. */
@Entity('restaurant')
@Index(['mercadoPagoUserId'])
export class Restaurant {
  @ApiProperty({ type: 'string', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ type: 'string' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  phone: string | null;

  /** Campo sensible que llega en T05 a propósito (O4). */
  @CampoSensible({ type: 'string', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  mercadoPagoToken: string | null;

  /** Campo sensible que llega en T05 a propósito (O4). */
  @CampoSensible({ type: 'string', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  mercadoPagoRefreshToken: string | null;

  /** `bigint`: llega como string. */
  @ApiProperty({ type: 'string', nullable: true, description: 'bigint: llega como string.' })
  @Column({ type: 'bigint', nullable: true })
  mercadoPagoUserId: string | null;

  @ApiProperty({ type: 'boolean' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'text', nullable: true })
  specialtySubtitle: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'text', nullable: true })
  logoUrl: string | null;

  @ApiProperty({ enum: ['before-order', 'after-order'] })
  @Column({ type: 'enum', enum: ['before-order', 'after-order'], default: 'after-order' })
  paymentStyle: 'before-order' | 'after-order';

  @ApiProperty({ type: 'integer' })
  @Column({ type: 'int', default: 300 })
  yellowTicketSeconds: number;

  @ApiProperty({ type: 'integer' })
  @Column({ type: 'int', default: 420 })
  redTicketSeconds: number;

  @ApiProperty({ type: 'integer' })
  @Column({ type: 'int', default: 600 })
  redPulseTicketSeconds: number;

  @OneToMany(() => Product, (producto) => producto.restaurant)
  products: Relation<Product[]>;

  @OneToMany(() => Table, (mesa) => mesa.restaurant)
  tables: Relation<Table[]>;

  @OneToMany(() => Order, (pedido) => pedido.restaurant)
  orders: Relation<Order[]>;
}
