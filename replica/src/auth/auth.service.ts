import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Auth } from 'firebase-admin/auth';
import { Repository } from 'typeorm';
import { FIREBASE_AUTH } from '../firebase-admin/firebase-admin.module';
import { User } from '../users/user.entity';
import type { RespuestaDeLogin } from './dto';

/** Vencimiento del JWT de los mozos si `JWT_EXPIRATION_WAITERS` no está (contexto, C1). */
const VENCIMIENTO_DE_MOZOS_POR_DEFECTO = '16h';
const SIN_RESTAURANTE = '-1';

@Injectable()
export class AuthService {
  private readonly registro = new Logger(AuthService.name);

  constructor(
    @Inject(FIREBASE_AUTH) private readonly firebase: Auth | null,
    @InjectRepository(User) private readonly usuarios: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  /** T01: canjea un ID token de Firebase por un JWT propio. */
  async login(firebaseIdToken: unknown): Promise<RespuestaDeLogin> {
    if (this.firebase === null) {
      // DP-59: un 503 explícito, no un 401 que la app leería como credenciales incorrectas.
      throw new ServiceUnavailableException(
        'Firebase desactivado (USE_FIREBASE): la réplica no puede verificar el ID token y no emite JWT',
      );
    }
    if (typeof firebaseIdToken !== 'string' || firebaseIdToken.trim() === '') {
      throw new UnauthorizedException('Falta el firebaseIdToken en el body');
    }
    let email: string | undefined;
    let nombre: string | undefined;
    try {
      const decodificado = await this.firebase.verifyIdToken(firebaseIdToken);
      email = decodificado.email;
      nombre = typeof decodificado.name === 'string' ? decodificado.name : undefined;
    } catch (error) {
      // Nunca se registra el token, solo el código que informa Firebase.
      this.registro.warn(`ID token rechazado: ${(error as { code?: string }).code ?? 'sin código'}`);
      throw new UnauthorizedException('El firebaseIdToken es inválido o está vencido');
    }
    if (email === undefined || email === '') {
      throw new UnauthorizedException('El firebaseIdToken no trae email');
    }

    const usuario = await this.buscarOCrear(email, nombre);
    const vencimiento = this.vencimientoPara(usuario.role);
    let accessToken: string;
    try {
      accessToken = await this.jwt.signAsync({ userId: usuario.id, role: usuario.role }, { expiresIn: vencimiento });
    } catch (error) {
      throw new InternalServerErrorException(
        `No se pudo firmar el JWT: el vencimiento "${vencimiento}" no es válido (${(error as Error).message})`,
      );
    }
    return {
      access_token: accessToken,
      user: {
        id: usuario.id,
        email: usuario.email,
        name: usuario.name,
        role: usuario.role,
        restaurantId: usuario.restaurant?.id ?? SIN_RESTAURANTE,
      },
    };
  }

  /** Busca el `user` por email; si no existe, lo inserta con rol `user` y sin restaurante (contexto, T01). */
  private async buscarOCrear(email: string, nombre: string | undefined): Promise<User> {
    const existente = await this.usuarios.findOne({ where: { email } });
    if (existente !== null) {
      return existente;
    }
    try {
      return await this.usuarios.save(
        this.usuarios.create({ email, name: nombre ?? null, role: 'user', isGuest: false, restaurant: null }),
      );
    } catch (error) {
      // Dos logins simultáneos del mismo email: gana el primero y el segundo lee su fila.
      const carrera = await this.usuarios.findOne({ where: { email } });
      if (carrera !== null) {
        return carrera;
      }
      throw error;
    }
  }

  /** `JWT_EXPIRATION_WAITERS` (16h por defecto) para el mozo; `JWT_EXPIRATION`, sin valor por defecto, para los demás. */
  private vencimientoPara(rol: string): string | number {
    const nombre = rol === 'waiter' ? 'JWT_EXPIRATION_WAITERS' : 'JWT_EXPIRATION';
    const crudo = process.env[nombre]?.trim();
    if (crudo === undefined || crudo === '') {
      if (rol === 'waiter') {
        return VENCIMIENTO_DE_MOZOS_POR_DEFECTO;
      }
      throw new InternalServerErrorException(
        `Falta la variable de entorno JWT_EXPIRATION, que el login necesita para un usuario con rol ${rol}`,
      );
    }
    // Un número solo son segundos; con unidad ("16h", "30m") lo interpreta la librería de JWT.
    return /^\d+$/.test(crudo) ? Number(crudo) : crudo;
  }
}
