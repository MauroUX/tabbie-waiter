// Change tk-01-replica-base · apoyo de las pruebas de contrato: validación contra docs/api/openapi.yaml (DP-52).
// No cubre scenarios. Lee el documento en tiempo de ejecución, resuelve los $ref a #/components/...
// con Ajv (strict: false) y traduce `nullable` de OpenAPI 3.0 a JSON Schema.
import { existsSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import type { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { rutaOpenApi } from './entorno';

type Objeto = Record<string, unknown>;

const ID_DOCUMENTO = 'https://openapi.example.com/openapi.json';

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Carga el documento OpenAPI tal como está en disco. */
export function cargarOpenApi(): Objeto {
  const ruta = rutaOpenApi();
  if (!existsSync(ruta)) {
    throw new Error(`No existe el documento OpenAPI en ${ruta} (OPENAPI_PATH).`);
  }
  const documento = yaml.load(readFileSync(ruta, 'utf8'));
  if (!esObjeto(documento)) {
    throw new Error(`El documento OpenAPI de ${ruta} no es un objeto YAML.`);
  }
  return documento;
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

function segmento(texto: string): string {
  return encodeURIComponent(texto.replace(/~/g, '~0').replace(/\//g, '~1'));
}

function porPuntero(documento: Objeto, puntero: string): unknown {
  let actual: unknown = documento;
  for (const parte of puntero.replace(/^#\//, '').split('/')) {
    if (!esObjeto(actual)) {
      return undefined;
    }
    actual = actual[decodeURIComponent(parte).replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  return actual;
}

export interface RespuestaEsperada {
  ruta: string;
  metodo: 'get' | 'post' | 'put' | 'patch' | 'delete';
  codigo: number;
  mediaType?: string;
}

/** Compila el validador del cuerpo de una respuesta, o falla diciendo qué falta en el documento. */
export function validadorDeRespuesta({
  ruta,
  metodo,
  codigo,
  mediaType = 'application/json',
}: RespuestaEsperada): ValidateFunction {
  const documento = cargarOpenApi();
  let punteroRespuesta = `#/paths/${segmento(ruta)}/${metodo}/responses/${codigo}`;
  let respuesta = porPuntero(documento, punteroRespuesta);
  if (esObjeto(respuesta) && typeof respuesta.$ref === 'string') {
    punteroRespuesta = respuesta.$ref;
    respuesta = porPuntero(documento, punteroRespuesta);
  }
  if (!esObjeto(respuesta)) {
    throw new Error(`El OpenAPI no tiene la respuesta ${codigo} de ${metodo.toUpperCase()} ${ruta}.`);
  }
  const punteroEsquema = `${punteroRespuesta}/content/${segmento(mediaType)}/schema`;
  if (porPuntero(documento, punteroEsquema) === undefined) {
    throw new Error(
      `El OpenAPI no tiene esquema ${mediaType} para la respuesta ${codigo} de ${metodo.toUpperCase()} ${ruta}.`,
    );
  }
  const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
  addFormats(ajv);
  ajv.addSchema(traducirNullable(documento) as Objeto, ID_DOCUMENTO);
  const validar = ajv.getSchema(`${ID_DOCUMENTO}${punteroEsquema}`);
  if (!validar) {
    throw new Error(`No se pudo compilar el esquema ${punteroEsquema} del OpenAPI.`);
  }
  return validar;
}

/** Valida el cuerpo contra el OpenAPI y devuelve los errores (lista vacía si valida). */
export function erroresContraOpenApi(esperada: RespuestaEsperada, cuerpo: unknown): string[] {
  const validar = validadorDeRespuesta(esperada);
  if (validar(cuerpo)) {
    return [];
  }
  return (validar.errors ?? []).map(
    (error) => `${error.instancePath || '(raíz)'} ${error.message ?? ''} ${JSON.stringify(error.params)}`,
  );
}

/**
 * Recorre todo el documento y junta, por nombre, la marca `x-sensitive` de cada propiedad
 * de cada `properties` que encuentra (componentes, cuerpos de petición y de respuesta).
 */
export function marcasSensibles(nombres: string[]): Map<string, boolean[]> {
  const documento = cargarOpenApi();
  const marcas = new Map<string, boolean[]>(nombres.map((nombre) => [nombre, []]));
  const recorrer = (valor: unknown): void => {
    if (Array.isArray(valor)) {
      valor.forEach(recorrer);
      return;
    }
    if (!esObjeto(valor)) {
      return;
    }
    for (const [clave, interno] of Object.entries(valor)) {
      if (clave === 'properties' && esObjeto(interno)) {
        for (const [propiedad, esquema] of Object.entries(interno)) {
          const lista = marcas.get(propiedad);
          if (lista) {
            lista.push(esObjeto(esquema) && esquema['x-sensitive'] === true);
          }
        }
      }
      recorrer(interno);
    }
  };
  recorrer(documento);
  return marcas;
}
