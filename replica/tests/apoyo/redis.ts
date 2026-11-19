// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas de contrato: Redis de las solicitudes de cobro.
// No cubre scenarios. Conexión con REDIS_URL o con REDIS_HOST, REDIS_PORT y REDIS_PASSWORD (el entorno del servicio
// `pruebas`), la clave de una solicitud (modelo-de-datos.md, 3.1) y el vencimiento que tiene que usar la réplica (DP-80).
import Redis from 'ioredis';
import { variable, variableNumerica } from './entorno';

export type ClienteRedis = Redis;

/** Abre y conecta un cliente de Redis con las variables del entorno de las pruebas. */
export async function conectarRedis(): Promise<ClienteRedis> {
  const url = process.env.REDIS_URL;
  const clave = process.env['REDIS_PASSWORD'];
  const opciones = { lazyConnect: true, maxRetriesPerRequest: 1 };
  const cliente =
    url !== undefined && url !== ''
      ? new Redis(url, opciones)
      : new Redis({
          host: variable('REDIS_HOST'),
          port: variableNumerica('REDIS_PORT'),
          password: clave !== '' ? clave : undefined,
          ...opciones,
        });
  await cliente.connect();
  return cliente;
}

/** `in-person-request:restaurant-<restaurantId>:<id>` (contexto, 3.3; DP-79). */
export function claveDeSolicitud(restauranteId: string, id: string): string {
  return `in-person-request:restaurant-${restauranteId}:${id}`;
}

/** Todas las claves que empiezan con el prefijo, con SCAN (sin KEYS). */
export async function clavesConPrefijo(redis: ClienteRedis, prefijo: string): Promise<string[]> {
  const claves: string[] = [];
  let cursor = '0';
  do {
    const [siguiente, lote] = await redis.scan(cursor, 'MATCH', `${prefijo}*`, 'COUNT', 200);
    cursor = siguiente;
    claves.push(...lote);
  } while (cursor !== '0');
  return [...new Set(claves)];
}

/** Las claves de solicitudes de un restaurante. */
export function clavesDeSolicitudesDe(redis: ClienteRedis, restauranteId: string): Promise<string[]> {
  return clavesConPrefijo(redis, `in-person-request:restaurant-${restauranteId}:`);
}

/** Borra las solicitudes de los restaurantes de la prueba (uuid propios: no toca las de nadie más). */
export async function borrarSolicitudesDe(redis: ClienteRedis, restaurantes: string[]): Promise<void> {
  for (const restauranteId of restaurantes) {
    const claves = await clavesDeSolicitudesDe(redis, restauranteId);
    if (claves.length > 0) {
      await redis.del(...claves);
    }
  }
}

/** El vencimiento que tiene que poner la réplica: REDIS_EXPIRATION_TIME, o 3600 s si está vacía (DP-80). */
export function vencimientoEsperado(): number {
  const valor = process.env.REDIS_EXPIRATION_TIME;
  if (valor === undefined || valor === '') {
    return 3600;
  }
  return variableNumerica('REDIS_EXPIRATION_TIME');
}
