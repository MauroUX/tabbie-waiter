import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { leerEntorno } from '../../config/entorno';
import { User } from '../../users/user.entity';

export interface PayloadDeJwt {
  userId: number;
  role: string;
  iat: number;
  exp: number;
}

/**
 * JWT propio (DP-57): HS256 con `JWT_SECRET`. Lo toma de `Authorization: Bearer` y, si no está, de `?token=`.
 * Verifica firma y `exp` (no ignora el vencimiento). Carga `user` con su `restaurant` (eager) por el `userId`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectRepository(User) private readonly usuarios: Repository<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: leerEntorno().jwtSecret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: PayloadDeJwt): Promise<User> {
    const userId = Number(payload?.userId);
    if (!Number.isInteger(userId)) {
      throw new UnauthorizedException('El JWT no trae userId');
    }
    const usuario = await this.usuarios.findOne({ where: { id: userId } });
    if (usuario === null) {
      throw new UnauthorizedException('El usuario del JWT no existe');
    }
    return usuario;
  }
}
