// Origen de datos para el CLI de TypeORM (migration:run y migration:revert), con las mismas variables DB_* que la réplica.
// Uso dentro del contenedor: node node_modules/typeorm/cli.js migration:revert -d dist/data-source.js
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { opcionesDeBaseDeDatos } from './config/base-de-datos';
import { leerEntorno } from './config/entorno';

export default new DataSource({
  ...opcionesDeBaseDeDatos(leerEntorno()),
  migrationsRun: false,
  entities: [join(__dirname, '**', '*.entity.{js,ts}')],
});
