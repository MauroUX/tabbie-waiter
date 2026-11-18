import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductOptionValue } from './product-option-value.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductOptionValue])],
  exports: [TypeOrmModule],
})
export class ProductOptionValuesModule {}
