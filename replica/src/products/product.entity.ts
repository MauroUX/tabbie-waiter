import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ProductOption } from '../product-options/product-option.entity';
import { Restaurant } from '../restaurants/restaurant.entity';

/** Tabla `product` (modelo-de-datos.md, 2.10). `price` es `decimal(10,0)` y llega como string. */
@Entity('product')
@Index(['restaurant'])
@Index(['restaurant', 'name'])
@Index(['restaurant', 'deletedSince'])
@Index(['deletedSince'])
export class Product {
  @ApiProperty({ type: 'integer' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: 'string' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  @Column({ type: 'datetime', nullable: true })
  deletedSince: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  @ApiProperty({ type: 'boolean' })
  @Column({ type: 'boolean' })
  hide: boolean;

  @ApiProperty({ type: 'string', description: 'decimal(10,0): llega como string.' })
  @Column({ type: 'decimal', precision: 10, scale: 0 })
  price: string;

  @ApiProperty({ type: 'boolean' })
  @Column({ type: 'boolean', default: true })
  acceptsNotes: boolean;

  @ApiProperty({ type: 'boolean' })
  @Column({ type: 'boolean', default: false })
  isVegan: boolean;

  @ApiProperty({ type: 'boolean' })
  @Column({ type: 'boolean', default: false })
  glutenFree: boolean;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'text', nullable: true })
  category: string | null;

  @ManyToOne(() => Restaurant, (restaurante) => restaurante.products, { nullable: true })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Relation<Restaurant> | null;

  @OneToMany(() => ProductOption, (opcion) => opcion.product, { cascade: true })
  productOptions: Relation<ProductOption[]>;
}
