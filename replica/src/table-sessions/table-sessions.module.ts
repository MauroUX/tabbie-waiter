import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableSession } from './table-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TableSession])],
  exports: [TypeOrmModule],
})
export class TableSessionsModule {}
