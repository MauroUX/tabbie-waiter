import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../guards/auth/auth-guards.module';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';

@Module({
  imports: [AuthGuardsModule],
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
