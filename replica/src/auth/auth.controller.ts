import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorHttp } from '../openapi/error-http';
import { AuthService } from './auth.service';
import { GuestDto, LoginDto, RespuestaDeLogin } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** T01. Público: sin guards. */
  @Post('login')
  @ApiOperation({
    summary: 'Canjea un ID token de Firebase por un JWT propio (T01)',
    description:
      'Público. Con USE_FIREBASE desactivada responde 503 y no emite ningún JWT. ' +
      'Un body sin firebaseIdToken, un token inválido o vencido, o un token sin email responden 401.',
  })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({ type: RespuestaDeLogin })
  @ApiResponse({ status: 401, description: 'ID token ausente, inválido, vencido o sin email.', type: ErrorHttp })
  @ApiResponse({ status: 503, description: 'Firebase desactivado (USE_FIREBASE).', type: ErrorHttp })
  login(@Body() cuerpo: LoginDto): Promise<RespuestaDeLogin> {
    return this.auth.login(cuerpo?.firebaseIdToken);
  }

  /** T02 (DP-72, DP-73). Público y sin Firebase: escribe el invitado en `user`. */
  @Post('guest')
  @ApiOperation({
    summary: 'JWT de invitado para un comensal (T02)',
    description:
      'Público, sin Firebase. Inserta o reusa la fila user del guestId (isGuest, rol user, sin restaurante, ' +
      'email invitado.<guestId>@example.com). El JWT vence a los JWT_EXPIRATION. Sin guestId o con otro formato, 400.',
  })
  @ApiBody({ type: GuestDto })
  @ApiCreatedResponse({ type: RespuestaDeLogin })
  @ApiResponse({ status: 400, description: 'guestId ausente o con formato inválido.', type: ErrorHttp })
  guest(@Body() cuerpo: GuestDto): Promise<RespuestaDeLogin> {
    return this.auth.loginDeInvitado(cuerpo?.guestId);
  }
}
