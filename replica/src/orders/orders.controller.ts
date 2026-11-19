import { Body, Controller, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
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
import { RolesGuard } from '../guards/roles/roles.guard';
import { ErrorHttp } from '../openapi/error-http';
import type { User } from '../users/user.entity';
import { CrearPedidoDto, PedidoDeRespuesta } from './dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly pedidos: OrdersService) {}

  /** DP-75. J, sin roles. */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'El comensal crea un pedido pending (DP-75)',
    description:
      'J, sin roles. El userId sale del JWT y el restaurantId, de la mesa de la sesión. Un pedido pending no aparece ' +
      'en T05 ni cuenta en table_session.total.',
  })
  @ApiBody({ type: CrearPedidoDto })
  @ApiCreatedResponse({ type: PedidoDeRespuesta })
  @ApiResponse({ status: 400, description: 'Cuerpo inválido, producto, opción o valor que no corresponden.', type: ErrorHttp })
  @ApiResponse({ status: 401, description: 'Sin JWT válido.', type: ErrorHttp })
  @ApiResponse({ status: 403, description: 'El usuario no está en la sesión.', type: ErrorHttp })
  @ApiResponse({ status: 404, description: 'La sesión no existe.', type: ErrorHttp })
  @ApiResponse({ status: 409, description: 'La sesión está cerrada.', type: ErrorHttp })
  crear(@Req() peticion: { user: User }, @Body() cuerpo: CrearPedidoDto): Promise<PedidoDeRespuesta> {
    return this.pedidos.crear(peticion.user, cuerpo);
  }

  /** DP-76. J + R: `admin` y `user`. */
  @Put(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  @ApiOperation({
    summary: 'Confirma un pedido pending (DP-76)',
    description:
      'Sin body. Fija status confirmed y confirmedAt (UTC, sin fracción), recalcula table_session.total (DP-77) y ' +
      'emite order-confirmed-notification al restaurante del pedido (DP-78). El mozo no confirma: 403.',
  })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiOkResponse({ type: PedidoDeRespuesta })
  @ApiResponse({ status: 400, description: 'El id no es un entero.', type: ErrorHttp })
  @ApiResponse({ status: 401, description: 'Sin JWT válido.', type: ErrorHttp })
  @ApiResponse({ status: 403, description: 'Rol fuera de admin y user, o un user que no está en la sesión del pedido.', type: ErrorHttp })
  @ApiResponse({ status: 404, description: 'El pedido no existe.', type: ErrorHttp })
  @ApiResponse({ status: 409, description: 'El pedido no está pending.', type: ErrorHttp })
  confirmar(@Req() peticion: { user: User }, @Param('id') id: string): Promise<PedidoDeRespuesta> {
    return this.pedidos.confirmar(peticion.user, id);
  }
}
