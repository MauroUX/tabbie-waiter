import { ApiProperty } from '@nestjs/swagger';
import { Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ProductOptionValue } from '../product-option-values/product-option-value.entity';
import { ProductOption } from '../product-options/product-option.entity';
import { OrderProductDetails } from './order-product-details.entity';

/** Tabla `order_product_option` (modelo-de-datos.md, 2.8), con la intermedia de 2.9. */
@Entity('order_product_option')
@Index(['orderProduct'])
@Index(['productOption'])
export class OrderProductOption {
  @ApiProperty({ type: 'integer' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OrderProductDetails, (linea) => linea.selectedOptions, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'orderProductId' })
  orderProduct: Relation<OrderProductDetails> | null;

  @ApiProperty({ type: () => ProductOption, nullable: true })
  @ManyToOne(() => ProductOption, { eager: true, nullable: true })
  @JoinColumn({ name: 'productOptionId' })
  productOption: Relation<ProductOption> | null;

  @ApiProperty({ type: () => [ProductOptionValue] })
  @ManyToMany(() => ProductOptionValue, { eager: true })
  @JoinTable({ name: 'order_product_option_values_product_option_value' })
  values: Relation<ProductOptionValue[]>;
}
