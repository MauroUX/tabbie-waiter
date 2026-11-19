// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas de contrato: validar un valor contra un esquema
// de `components.schemas` de docs/api/openapi.yaml (el `data` de los eventos de /sse/waiters, design.md D6).
// No cubre scenarios. Igual que apoyo/openapi.ts: Ajv con strict: false y `nullable` de OpenAPI 3.0 traducido.
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { cargarOpenApi } from './openapi';

type Objeto = Record<string, unknown>;

const ID_DOCUMENTO = 'https://openapi.example.com/componentes.json';

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** `nullable: true` (OpenAPI 3.0) pasa a `anyOf: [esquema, {type: 'null'}]`. */
function traducirNullable(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(traducirNullable);
  }
  if (!esObjeto(valor)) {
    return valor;
  }
  const copia: Objeto = {};
  for (const [clave, interno] of Object.entries(valor)) {
    if (clave !== 'nullable') {
      copia[clave] = traducirNullable(interno);
    }
  }
  if (valor.nullable === true) {
    return { anyOf: [copia, { type: 'null' }] };
  }
  return copia;
}

/** El esquema `components.schemas.<nombre>` tal como está en el documento, o `undefined`. */
export function esquemaDeComponente(nombre: string): Objeto | undefined {
  const componentes = cargarOpenApi().components;
  const esquemas = esObjeto(componentes) ? componentes.schemas : undefined;
  const esquema = esObjeto(esquemas) ? esquemas[nombre] : undefined;
  return esObjeto(esquema) ? esquema : undefined;
}

/** Valida el valor contra `components.schemas.<nombre>` y devuelve los errores (lista vacía si valida). */
export function erroresContraEsquema(nombre: string, valor: unknown): string[] {
  const documento = cargarOpenApi();
  if (esquemaDeComponente(nombre) === undefined) {
    throw new Error(`El OpenAPI no tiene el esquema components.schemas.${nombre}.`);
  }
  const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
  addFormats(ajv);
  ajv.addSchema(traducirNullable(documento) as Objeto, ID_DOCUMENTO);
  const validar = ajv.getSchema(`${ID_DOCUMENTO}#/components/schemas/${nombre}`);
  if (!validar) {
    throw new Error(`No se pudo compilar el esquema components.schemas.${nombre} del OpenAPI.`);
  }
  if (validar(valor)) {
    return [];
  }
  return (validar.errors ?? []).map(
    (error) => `${error.instancePath || '(raíz)'} ${error.message ?? ''} ${JSON.stringify(error.params)}`,
  );
}
