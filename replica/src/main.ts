import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { leerEntorno } from './config/entorno';

async function arrancar(): Promise<void> {
  // Primero las variables: si falta una obligatoria, termina con un error que la nombra.
  const entorno = leerEntorno();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(entorno.puerto, '0.0.0.0');
  new Logger('Replica').log(`La réplica escucha en el puerto ${entorno.puerto}`);
}

arrancar().catch((error: Error) => {
  // Nunca en silencio: el motivo queda en el registro y el proceso termina con código 1.
  console.error(`La réplica no arrancó: ${error.message}`);
  process.exit(1);
});
