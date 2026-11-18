import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { opcionesDeBaseDeDatos } from './config/base-de-datos';
import { leerEntorno } from './config/entorno';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductOptionValuesModule } from './product-option-values/product-option-values.module';
import { ProductOptionsModule } from './product-options/product-options.module';
import { ProductsModule } from './products/products.module';
import { RedisModule } from './redis/redis.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { SseModule } from './sse/sse.module';
import { TableSessionsModule } from './table-sessions/table-sessions.module';
import { TablesModule } from './tables/tables.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...opcionesDeBaseDeDatos(leerEntorno()),
        autoLoadEntities: true,
      }),
    }),
    RedisModule,
    UsersModule,
    RestaurantsModule,
    TablesModule,
    TableSessionsModule,
    OrdersModule,
    ProductsModule,
    ProductOptionsModule,
    ProductOptionValuesModule,
    PaymentsModule,
    AuthModule,
    SseModule,
  ],
})
export class AppModule {}
