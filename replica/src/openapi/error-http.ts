import { ApiProperty } from '@nestjs/swagger';

/** Cuerpo de los errores HTTP de la réplica (el que arma NestJS con `HttpException`). */
export class ErrorHttp {
  @ApiProperty({ type: 'integer', example: 401 })
  statusCode: number;

  @ApiProperty({ type: 'string', description: 'El motivo del rechazo.' })
  message: string;

  @ApiProperty({ type: 'string', example: 'Unauthorized' })
  error: string;
}
