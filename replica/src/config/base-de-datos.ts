import { join } from 'node:path';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import type { Entorno } from './entorno';

/**
 * Conexión a MySQL de la réplica (DP-51): el esquema sale solo de las migraciones.
 * `synchronize` desactivado, migraciones al arrancar, fechas en UTC y bigint como string (modelo-de-datos.md, sección 4).
 */
export function opcionesDeBaseDeDatos(entorno: Entorno): MysqlConnectionOptions {
  const { host, puerto, usuario, clave, nombre } = entorno.baseDeDatos;
  return {
    type: 'mysql',
    host,
    port: puerto,
    username: usuario,
    password: clave,
    database: nombre,
    timezone: 'Z',
    supportBigNumbers: true,
    bigNumberStrings: true,
    synchronize: false,
    migrationsRun: true,
    // El registro dice qué migración corrió y por qué falla una consulta; nunca lleva credenciales.
    logging: ['schema', 'migration', 'error'],
    migrationsTableName: 'migrations',
    migrations: [join(__dirname, '..', 'migrations', '*.{js,ts}')],
  };
}
