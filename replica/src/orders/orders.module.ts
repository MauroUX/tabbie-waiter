import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderProductDetails } from './order-product-details.entity';
import { OrderProductOption } from './order-product-option.entity';
import { Order } from './order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderProductDetails, OrderProductOption])],
  exports: [TypeOrmModule],
})
export class OrdersModule {}
