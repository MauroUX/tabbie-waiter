import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuardsModule } from '../guards/auth/auth-guards.module';
import { TableSession } from './table-session.entity';
import { TableSessionsController } from './table-sessions.controller';
import { TableSessionsService } from './table-sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([TableSession]), AuthGuardsModule],
  controllers: [TableSessionsController],
  providers: [TableSessionsService],
  exports: [TypeOrmModule],
})
export class TableSessionsModule {}
