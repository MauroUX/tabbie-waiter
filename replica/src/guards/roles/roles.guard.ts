import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '../../users/user.entity';
import { ROLES_KEY } from './roles.decorator';

/** R: un rol fuera de `@Roles(...)` responde 403 (DP-61). Actúa solo donde figura en `@UseGuards`. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (roles === undefined || roles.length === 0) {
      return true;
    }
    const usuario = contexto.switchToHttp().getRequest<{ user?: User }>().user;
    if (usuario === undefined || !roles.includes(usuario.role)) {
      throw new ForbiddenException('El rol del usuario no tiene acceso a este recurso');
    }
    return true;
  }
}
