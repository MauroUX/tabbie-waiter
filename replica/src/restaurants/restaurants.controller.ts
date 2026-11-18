import { Controller, ForbiddenException, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/auth/jwt-auth.guard';
import { Roles } from '../guards/roles/roles.decorator';
import { RolesGuard } from '../guards/roles/roles.guard';
import { ErrorHttp } from '../openapi/error-http';
import { Table } from '../tables/table.entity';
import type { User } from '../users/user.entity';
import { RestaurantsService } from './restaurants.service';

@ApiTags('restaurants')
@ApiBearerAuth()
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantes: RestaurantsService) {}

  /** T05. J + R: `admin`, `backoffice` y `waiter`, más el chequeo de restaurante. */
  @Get(':id/tables/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'backoffice', 'waiter')
  @ApiOperation({
    summary: 'Mesas ocupadas del restaurante con sus pedidos (T05)',
    description:
      'Mesas con isBusy y una sesión activa (closedAt nulo), por number ascendente. Cada sesión trae sus usuarios y ' +
      'sus pedidos (sin los pending, con los canceled, por createdAt ascendente). Reproduce O4 a propósito (DP-50): ' +
      'no excluye campos, así que llegan mercadoPagoToken, mercadoPagoRefreshToken y los email. ' +
      'El JWT va en Authorization: Bearer o en ?token=.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Uuid del restaurante.' })
  @ApiOkResponse({ type: [Table] })
  @ApiResponse({ status: 401, description: 'Sin JWT, vencido, con otra firma o con un userId inexistente.', type: ErrorHttp })
  @ApiResponse({ status: 403, description: 'Rol fuera de @Roles o restaurante distinto del del usuario.', type: ErrorHttp })
  async mesasActivas(@Param('id') id: string, @Req() peticion: { user: User }): Promise<Table[]> {
    // Rechaza solo si el usuario tiene un restaurante y es otro (contexto, C3).
    const restauranteDelUsuario = peticion.user.restaurant;
    if (restauranteDelUsuario !== null && restauranteDelUsuario !== undefined && restauranteDelUsuario.id !== id) {
      throw new ForbiddenException('El usuario pertenece a otro restaurante');
    }
    return this.restaurantes.findActiveTables(id);
  }
}
