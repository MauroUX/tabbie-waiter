import { Controller, ForbiddenException, MessageEvent, Req, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiOperation, ApiProduces, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../guards/auth/jwt-auth.guard';
import { ErrorHttp } from '../openapi/error-http';
import type { User } from '../users/user.entity';
import { SseService } from './sse.service';

@ApiTags('sse')
@ApiBearerAuth()
@Controller('sse')
export class SseController {
  constructor(private readonly sse: SseService) {}

  /** T16 y T17. J, sin roles: el stream del restaurante del usuario. */
  @Sse('waiters')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Stream de eventos para los mozos del restaurante (T16, T17)',
    description:
      'Server-Sent Events del restaurante del usuario. El JWT va en Authorization: Bearer o en ?token=; con un JWT ' +
      'vencido responde 401 antes de abrir el stream. Sin heartbeat ni replay. Eventos: ' +
      '`order-confirmed-notification` (data: {"body": "<JSON en string>"} con orderId, tableNumber, tableSessionId, ' +
      'restaurantId y confirmedAt; lo emite PUT /orders/:id/confirm, TK-03), ' +
      '`in-person-payment-request` (data: la solicitud de cobro; lo emite POST /payments/in-person-request, TK-03) e ' +
      '`in-person-payment-request-deleted` (data: {requestId, restaurantId}; lo emite ' +
      'DELETE /payments/in-person-requests/:requestId, TK-13). Este ticket no emite ninguno.',
  })
  @ApiProduces('text/event-stream')
  @ApiResponse({
    status: 200,
    description: 'Stream abierto.',
    content: { 'text/event-stream': { schema: { type: 'string' } } },
  })
  // Los errores salen como JSON antes de abrir el stream, no como text/event-stream.
  @ApiExtraModels(ErrorHttp)
  @ApiResponse({
    status: 401,
    description: 'Sin JWT, vencido, con otra firma o con un userId inexistente.',
    content: { 'application/json': { schema: { $ref: getSchemaPath(ErrorHttp) } } },
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene restaurante (DP-64).',
    content: { 'application/json': { schema: { $ref: getSchemaPath(ErrorHttp) } } },
  })
  mozos(@Req() peticion: { user: User }): Observable<MessageEvent> {
    const restaurante = peticion.user.restaurant;
    if (restaurante === null || restaurante === undefined) {
      // DP-64: con un JWT válido de un usuario sin restaurante, 403 explícito antes de abrir el stream.
      throw new ForbiddenException('El usuario no tiene restaurante: no hay stream que abrir');
    }
    return this.sse.obtenerStream(restaurante.id) as Observable<MessageEvent>;
  }
}
