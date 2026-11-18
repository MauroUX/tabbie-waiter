import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuardsModule } from '../guards/auth/auth-guards.module';
import { Order } from '../orders/order.entity';
import { Table } from '../tables/table.entity';
import { RestaurantsController } from './restaurants.controller';
import { Restaurant } from './restaurant.entity';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Table, Order]), AuthGuardsModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [TypeOrmModule],
})
export class RestaurantsModule {}
