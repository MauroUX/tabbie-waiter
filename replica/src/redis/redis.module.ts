import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { leerEntorno } from '../config/entorno';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const INTENTOS = 10;

/**
 * Cliente de Redis: `REDIS_URL` si está; si no, `REDIS_HOST`, `REDIS_PORT` y `REDIS_PASSWORD`.
 * Conecta al arrancar; si no lo logra, el arranque falla con un error explícito (sin mostrar la clave).
 */
async function crearCliente(): Promise<Redis> {
  const registro = new Logger('RedisModule');
  const { redis } = leerEntorno();
  const opciones = {
    lazyConnect: true,
    retryStrategy: (intento: number) => (intento >= INTENTOS ? null : Math.min(intento * 500, 3000)),
  };
  const cliente =
    'url' in redis
      ? new Redis(redis.url, opciones)
      : new Redis({ host: redis.host, port: redis.puerto, password: redis.clave, ...opciones });

  cliente.on('error', (error: Error) => registro.error(`Redis: ${error.message}`));
  try {
    await cliente.connect();
  } catch (error) {
    cliente.disconnect();
    throw new Error(`No se pudo conectar a Redis: ${(error as Error).message}`);
  }
  registro.log('Conectado a Redis');
  return cliente;
}

@Global()
@Module({
  providers: [{ provide: REDIS_CLIENT, useFactory: crearCliente }],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly cliente: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.cliente.quit().catch(() => this.cliente.disconnect());
  }
}
