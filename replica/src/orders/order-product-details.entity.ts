import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Product } from '../products/product.entity';
import { OrderProductOption } from './order-product-option.entity';
import { Order } from './order.entity';

/** Tabla `order_product_details` (modelo-de-datos.md, 2.7). */
@Entity('order_product_details')
@Index(['order'])
@Index(['product'])
@Index(['order', 'product'])
export class OrderProductDetails {
  @ApiProperty({ type: 'integer' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (pedido) => pedido.items, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'orderId' })
  order: Relation<Order> | null;

  @ApiProperty({ type: () => Product, nullable: true })
  @ManyToOne(() => Product, { eager: true, nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Relation<Product> | null;

  @ApiProperty({ type: 'integer' })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({ type: 'integer' })
  @Column({ type: 'int', default: 0 })
  quantityPaid: number;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @ApiProperty({ type: () => [OrderProductOption] })
  @OneToMany(() => OrderProductOption, (opcion) => opcion.orderProduct, { eager: true, cascade: true })
  selectedOptions: Relation<OrderProductOption[]>;
}
