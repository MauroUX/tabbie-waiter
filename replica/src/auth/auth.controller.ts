import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorHttp } from '../openapi/error-http';
import { AuthService } from './auth.service';
import { LoginDto, RespuestaDeLogin } from './dto';

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
}
