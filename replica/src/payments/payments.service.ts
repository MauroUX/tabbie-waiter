import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { leerEntorno } from '../config/entorno';
import { REDIS_CLIENT } from '../redis/redis.module';
import { SseService } from '../sse/sse.service';

export const EVENTO_SOLICITUD_DE_COBRO = 'in-person-payment-request';

type Solicitud = Record<string, unknown>;

const esObjeto = (valor: unknown): valor is Solicitud =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/** `in-person-request:restaurant-<restaurantId>:<id>` (contexto, 3.3; DP-79). */
const prefijoDe = (restauranteId: string): string => `in-person-request:restaurant-${restauranteId}:`;

@Injectable()
export class PaymentsService {
  private readonly registro = new Logger(PaymentsService.name);
  private readonly vencimientoSegundos = leerEntorno().redisExpiracionSegundos;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly sse: SseService,
  ) {}

  /**
   * `POST /payments/in-person-request` (DP-79): guarda el body sin validar (o el de adentro, si viene en `{body}`),
   * con un `id` uuid v4 propio, y emite T17 al restaurante del body. Solo exige `restaurantId`.
   */
  async crearSolicitud(cuerpo: unknown): Promise<Solicitud> {
    // DP-86: se desenvuelve {body: "<JSON>"} solo si body es un string con el JSON de un objeto; si no, el body se
    // guarda tal como llegó, con `body` incluido (contexto, 3.3).
    let solicitud: unknown = cuerpo;
    if (esObjeto(cuerpo) && typeof cuerpo.body === 'string') {
      try {
        const deAdentro: unknown = JSON.parse(cuerpo.body);
        if (esObjeto(deAdentro)) {
          solicitud = deAdentro;
        }
      } catch {
        // No es JSON: se guarda el body entero.
      }
    }
    if (!esObjeto(solicitud)) {
      throw new BadRequestException('La solicitud tiene que ser un objeto con restaurantId');
    }
    const restauranteId = solicitud.restaurantId;
    if (typeof restauranteId !== 'string' || restauranteId.trim() === '') {
      throw new BadRequestException('restaurantId es obligatorio y tiene que ser un texto no vacío');
    }

    const guardada: Solicitud = { ...solicitud, id: randomUUID() };
    await this.redis.set(
      `${prefijoDe(restauranteId)}${String(guardada.id)}`,
      JSON.stringify(guardada),
      'EX',
      this.vencimientoSegundos,
    );
    this.sse.emitir(restauranteId, { type: EVENTO_SOLICITUD_DE_COBRO, data: guardada });
    return guardada;
  }

  /** T06 (DP-81): las solicitudes del restaurante, con SCAN (no KEYS), sin orden garantizado. */
  async solicitudesDe(restauranteId: string): Promise<Solicitud[]> {
    // Los caracteres de patrón no existen en un uuid, pero se escapan por si el id trae alguno.
    const patron = `${prefijoDe(restauranteId).replace(/[\\*?[\]]/g, '\\$&')}*`;
    const claves = new Set<string>();
    let cursor = '0';
    do {
      const [siguiente, lote] = await this.redis.scan(cursor, 'MATCH', patron, 'COUNT', 200);
      cursor = siguiente;
      lote.forEach((clave) => claves.add(clave));
    } while (cursor !== '0');

    const solicitudes: Solicitud[] = [];
    for (const clave of claves) {
      const valor = await this.redis.get(clave);
      if (valor === null) {
        continue; // venció entre el SCAN y el GET
      }
      try {
        solicitudes.push(JSON.parse(valor) as Solicitud);
      } catch {
        // Solo la clave: el valor puede traer datos del comensal.
        this.registro.warn(`Solicitud omitida: el valor de la clave ${clave} no es JSON`);
      }
    }
    return solicitudes;
  }
}
