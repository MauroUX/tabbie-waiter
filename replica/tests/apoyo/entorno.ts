// Change tk-01-replica-base · apoyo de las pruebas de contrato: lectura de variables de entorno.
// No cubre scenarios. Ningún valor es literal: todo sale del entorno del servicio `pruebas` de compose.yaml.

/** Devuelve la variable o falla con un mensaje que la nombra. */
export function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') {
    throw new Error(`Falta la variable de entorno ${nombre}: la da el servicio "pruebas" de compose.yaml.`);
  }
  return valor;
}

/** Devuelve la variable como número entero o falla con un mensaje que la nombra. */
export function variableNumerica(nombre: string): number {
  const texto = variable(nombre);
  const numero = Number(texto);
  if (!Number.isInteger(numero)) {
    throw new Error(`La variable de entorno ${nombre} no es un número entero.`);
  }
  return numero;
}

/** URL base de la réplica, sin barra final. */
export function urlReplica(): string {
  return variable('REPLICA_URL').replace(/\/+$/, '');
}

/** El repo entero montado de solo lectura, con .git. */
export function rutaRepo(): string {
  return process.env.REPO_PATH && process.env.REPO_PATH !== '' ? process.env.REPO_PATH : '/repo';
}

/** El documento OpenAPI que genera la réplica (DP-52). */
export function rutaOpenApi(): string {
  return process.env.OPENAPI_PATH && process.env.OPENAPI_PATH !== ''
    ? process.env.OPENAPI_PATH
    : '/repo/docs/api/openapi.yaml';
}

/** `USE_FIREBASE` se activa solo con el valor `true` (design.md, D6). */
export function firebaseActivado(): boolean {
  return process.env.USE_FIREBASE === 'true';
}

/** Las pruebas que necesitan Firebase corren solo con `PRUEBAS_LOCALES=1` (DP-43). */
export function pruebasLocales(): boolean {
  return process.env.PRUEBAS_LOCALES === '1';
}
