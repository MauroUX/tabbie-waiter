import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** J: exige un JWT propio vigente. Sin JWT, vencido, con otra firma o con un `userId` inexistente: 401. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(error: unknown, usuario: T | false, info: unknown): T {
    if (error) {
      // Un 401 de la estrategia pasa tal cual; un fallo que no es del JWT (por ejemplo, la base) no se disfraza de 401.
      throw error;
    }
    if (!usuario) {
      const motivo = info instanceof Error ? info.message : 'JWT ausente o inválido';
      throw new UnauthorizedException(motivo);
    }
    return usuario;
  }
}
