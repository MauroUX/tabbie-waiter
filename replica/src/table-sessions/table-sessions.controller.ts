import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/auth/jwt-auth.guard';
import { Roles } from '../guards/roles/roles.decorator';
import { ErrorHttp } from '../openapi/error-http';
import { JoinDto, PagoDeSesion, SesionDeJoin } from './dto';
import { TableSessionsService } from './table-sessions.service';

@ApiTags('table-sessions')
@Controller('table-sessions')
export class TableSessionsController {
  constructor(private readonly sesiones: TableSessionsService) {}

  /** `/join` (DP-74). Sin guard, como en el contexto. */
  @Post('join/restaurant/:restaurantId/table/:tableNumber')
  @ApiOperation({
    summary: 'El comensal se une a la mesa (DP-74)',
    description:
      'Sin guard. Con la mesa libre abre la table_session y la deja ocupada; con la mesa ocupada suma al comensal a la ' +
      'sesión activa sin duplicarlo. Bloquea la fila de la mesa en una transacción. Responde con la sesión y sus users.',
  })
  @ApiParam({ name: 'restaurantId', type: 'string', description: 'Uuid del restaurante.' })
  @ApiParam({ name: 'tableNumber', type: 'integer', description: 'Número de la mesa en el restaurante.' })
  @ApiBody({ type: JoinDto })
  @ApiCreatedResponse({ type: SesionDeJoin })
  @ApiResponse({ status: 400, description: 'Body sin userId entero.', type: ErrorHttp })
  @ApiResponse({ status: 404, description: 'Restaurante, mesa o usuario inexistente.', type: ErrorHttp })
  unirse(
    @Param('restaurantId') restaurantId: string,
    @Param('tableNumber') numeroDeMesa: string,
    @Body() cuerpo: JoinDto,
  ): Promise<SesionDeJoin> {
    return this.sesiones.unirse(restaurantId, numeroDeMesa, cuerpo?.userId);
  }

  /**
   * T07 (DP-82). O2, reproducido a propósito (DP-50): `@Roles` sin `RolesGuard` y sin chequeo de restaurante, así que
   * cualquier JWT válido (un invitado, un mozo de otro restaurante) lee los pagos de cualquier sesión. No es un fallo
   * de la réplica: la app lo rodea (C10) y SEG-c2 lo comprueba en TK-13.
   */
  @Get(':id/payments')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'waiter', 'backoffice')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Pagos de la sesión (T07)',
    description:
      'Los payment de la sesión por createdAt e id ascendente, cada uno con su user y el restaurant del user (null en ' +
      'los pagos manuales). Sin pagos o con una sesión que no existe, []. Reproduce O2 a propósito (DP-50): sin ' +
      'RolesGuard ni chequeo de restaurante.',
  })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiOkResponse({ type: [PagoDeSesion] })
  @ApiResponse({ status: 400, description: 'El id no es un entero.', type: ErrorHttp })
  @ApiResponse({ status: 401, description: 'Sin JWT válido.', type: ErrorHttp })
  pagos(@Param('id') id: string): Promise<PagoDeSesion[]> {
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) {
      throw new BadRequestException('El id de la sesión tiene que ser un entero');
    }
    return this.sesiones.pagosDe(Number(id));
  }
}
