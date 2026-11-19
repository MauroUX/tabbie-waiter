import { ApiProperty } from '@nestjs/swagger';
import { CampoSensible } from '../openapi/campo-sensible';
import { ROLES_DE_USUARIO } from '../users/user.entity';
import type { RolDeUsuario } from '../users/user.entity';

export class LoginDto {
  @CampoSensible({ type: 'string', description: 'ID token de Firebase del usuario autenticado.' })
  firebaseIdToken: string;
}

export class GuestDto {
  @ApiProperty({
    type: 'string',
    pattern: '^[A-Za-z0-9-]{1,64}$',
    description: 'Identificador del invitado, de 1 a 64 caracteres.',
  })
  guestId: string;
}

export class UsuarioDeLogin {
  @ApiProperty({ type: 'integer' })
  id: number;

  @CampoSensible({ type: 'string' })
  email: string;

  @ApiProperty({ type: 'string', nullable: true })
  name: string | null;

  @ApiProperty({ enum: ROLES_DE_USUARIO })
  role: RolDeUsuario;

  @ApiProperty({ type: 'string', description: 'El uuid del restaurante, o "-1" si el usuario no tiene.' })
  restaurantId: string;
}

export class RespuestaDeLogin {
  @CampoSensible({ type: 'string', description: 'JWT propio, HS256, con los claims userId, role, iat y exp.' })
  access_token: string;

  @ApiProperty({ type: () => UsuarioDeLogin })
  user: UsuarioDeLogin;
}
