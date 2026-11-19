import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/auth/jwt-auth.guard';
import { ErrorHttp } from '../openapi/error-http';
import { EventoSolicitudDeCobro } from '../sse/eventos';
import type { User } from '../users/user.entity';
import { SolicitudDeCobroEntrada } from './dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly pagos: PaymentsService) {}

  /** DP-79. J, sin roles. */
  @Post('in-person-request')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'El comensal pide pagar en persona (DP-79)',
    description:
      'J. Guarda el body sin validar en Redis (si trae {body: "<JSON>"}, el de adentro) con un id uuid v4 que genera la ' +
      'réplica, con vencimiento REDIS_EXPIRATION_TIME, y emite in-person-payment-request al restaurante del body. ' +
      'El único rechazo de negocio es 400 si falta restaurantId.',
  })
  @ApiBody({ type: SolicitudDeCobroEntrada })
  @ApiCreatedResponse({ type: EventoSolicitudDeCobro })
  @ApiResponse({ status: 400, description: 'Falta restaurantId.', type: ErrorHttp })
  @ApiResponse({ status: 401, description: 'Sin JWT válido.', type: ErrorHttp })
  crear(@Body() cuerpo: unknown): Promise<Record<string, unknown>> {
    return this.pagos.crearSolicitud(cuerpo);
  }

  /** T06 (DP-81). J, sin `RolesGuard`: las solicitudes del restaurante del usuario. */
  @Get('in-person-requests')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Solicitudes de cobro del restaurante del usuario (T06)',
    description:
      'Las solicitudes guardadas en Redis (SCAN), incluidas las de MercadoPago, sin orden garantizado. Sin ' +
      'solicitudes, []. Un valor que no es JSON se omite. Un usuario sin restaurante recibe 403 (DP-64).',
  })
  @ApiOkResponse({ type: [EventoSolicitudDeCobro] })
  @ApiResponse({ status: 401, description: 'Sin JWT válido.', type: ErrorHttp })
  @ApiResponse({ status: 403, description: 'El usuario no tiene restaurante.', type: ErrorHttp })
  solicitudes(@Req() peticion: { user: User }): Promise<Record<string, unknown>[]> {
    const restaurante = peticion.user.restaurant;
    if (restaurante === null || restaurante === undefined) {
      throw new ForbiddenException('El usuario no tiene restaurante: no hay solicitudes que leer');
    }
    return this.pagos.solicitudesDe(restaurante.id);
  }
}
