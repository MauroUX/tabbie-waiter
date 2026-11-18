import { SetMetadata } from '@nestjs/common';
import type { RolDeUsuario } from '../../users/user.entity';

export const ROLES_KEY = 'roles';

/** Lista de roles que admite la ruta. Solo restringe si la ruta nombra `RolesGuard` en `@UseGuards` (O2, DP-50). */
export const Roles = (...roles: RolDeUsuario[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
