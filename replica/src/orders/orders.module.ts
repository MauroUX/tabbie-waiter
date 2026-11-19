import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuardsModule } from '../guards/auth/auth-guards.module';
import { SseModule } from '../sse/sse.module';
import { OrderProductDetails } from './order-product-details.entity';
import { OrderProductOption } from './order-product-option.entity';
import { Order } from './order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderProductDetails, OrderProductOption]), AuthGuardsModule, SseModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [TypeOrmModule],
})
export class OrdersModule {}
