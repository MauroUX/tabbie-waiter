// Genera docs/api/openapi.yaml desde el código de la réplica (DP-52, design D4).
// Arma la app con `preview: true`: no instancia proveedores, así que no abre MySQL ni Redis ni Firebase.
// Uso (en el contenedor): node dist/scripts/generar-openapi.js [ruta de salida]
// La ruta sale del primer argumento o de OPENAPI_SALIDA.
import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import yaml from 'js-yaml';
import { AppModule } from '../app.module';
import { camposSensibles } from '../openapi/campo-sensible';

const ENCABEZADO =
  '# Generado desde el código de la réplica con @nestjs/swagger (DP-52). No se edita a mano.\n' +
  '# Se regenera con: docker compose --profile herramientas run --rm --build --no-deps openapi\n';

/** Agrega `x-sensitive: true` a cada propiedad registrada con `@CampoSensible`, en cada esquema donde aparece. */
function marcarCamposSensibles(documento: OpenAPIObject): void {
  const esquemas = documento.components?.schemas ?? {};
  for (const { clase, propiedad } of camposSensibles()) {
    const esquema = esquemas[clase] as { properties?: Record<string, Record<string, unknown>> } | undefined;
    const campo = esquema?.properties?.[propiedad];
    if (campo === undefined) {
      throw new Error(`El campo sensible ${clase}.${propiedad} no está en components.schemas del OpenAPI.`);
    }
    campo['x-sensitive'] = true;
  }
}

async function generar(): Promise<void> {
  const salida = process.argv[2] ?? process.env.OPENAPI_SALIDA;
  if (salida === undefined || salida.trim() === '') {
    throw new Error('Falta la ruta de salida: pasala como primer argumento o en OPENAPI_SALIDA.');
  }

  const app = await NestFactory.create(AppModule, { preview: true, abortOnError: false, logger: ['error'] });
  const configuracion = new DocumentBuilder()
    .setTitle('Réplica del backend de Tabbie')
    .setDescription(
      'Contrato de la réplica propia (0010, DP-48), tomado de docs/context/panel-mozos-actual.md. ' +
        'Los campos marcados x-sensitive: true son credenciales o datos personales que no se registran ni se muestran.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const documento = SwaggerModule.createDocument(app, configuracion);
  marcarCamposSensibles(documento);

  // Claves ordenadas, sin anchors y con LF: dos corridas seguidas producen el mismo archivo, byte a byte.
  const texto = ENCABEZADO + yaml.dump(JSON.parse(JSON.stringify(documento)), {
    sortKeys: true,
    noRefs: true,
    lineWidth: -1,
  });
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, texto, { encoding: 'utf8' });
  await app.close();
  console.log(`OpenAPI escrito en ${salida}`);
}

generar().catch((error: Error) => {
  console.error(`No se pudo generar el OpenAPI: ${error.message}`);
  process.exit(1);
});
