import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ProductOption } from '../product-options/product-option.entity';

/** Tabla `product_option_value` (modelo-de-datos.md, 2.12). `price` es `decimal(10,0)` y llega como string. */
@Entity('product_option_value')
@Index(['productOption'])
export class ProductOptionValue {
  @ApiProperty({ type: 'integer' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: 'string' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ type: 'integer' })
  @Column({ type: 'int' })
  limit: number;

  @ApiProperty({ type: 'string', description: 'decimal(10,0): llega como string.' })
  @Column({ type: 'decimal', precision: 10, scale: 0 })
  price: string;

  @ManyToOne(() => ProductOption, (opcion) => opcion.productOptionValues, { nullable: true })
  @JoinColumn({ name: 'productOptionId' })
  productOption: Relation<ProductOption> | null;
}
