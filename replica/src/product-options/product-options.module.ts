import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductOption } from './product-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductOption])],
  exports: [TypeOrmModule],
})
export class ProductOptionsModule {}
