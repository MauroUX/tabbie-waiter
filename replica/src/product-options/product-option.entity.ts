import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ProductOptionValue } from '../product-option-values/product-option-value.entity';
import { Product } from '../products/product.entity';

/** Tabla `product_option` (modelo-de-datos.md, 2.11). */
@Entity('product_option')
@Index(['product'])
export class ProductOption {
  @ApiProperty({ type: 'integer' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: 'string' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ enum: ['single-choice', 'multiple-choice'] })
  @Column({ type: 'enum', enum: ['single-choice', 'multiple-choice'], default: 'single-choice' })
  type: 'single-choice' | 'multiple-choice';

  @ApiProperty({ type: 'integer' })
  @Column({ type: 'int' })
  limit: number;

  @ManyToOne(() => Product, (producto) => producto.productOptions, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Relation<Product> | null;

  @OneToMany(() => ProductOptionValue, (valor) => valor.productOption, { cascade: true })
  productOptionValues: Relation<ProductOptionValue[]>;
}
