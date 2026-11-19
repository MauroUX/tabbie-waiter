// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas del simulador: variables de entorno.
// No cubre scenarios. Ningún valor es literal: todo sale del entorno del servicio `pruebas-simulador` de compose.yaml.

/** Devuelve la variable o falla con un mensaje que la nombra. */
export function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') {
    throw new Error(`Falta la variable de entorno ${nombre}: la da el servicio "pruebas-simulador" de compose.yaml.`);
  }
  return valor;
}

/** URL base de la réplica, sin barra final. El simulador la hereda del mismo entorno. */
export function urlReplica(): string {
  return variable('REPLICA_URL').replace(/\/+$/, '');
}

/** La línea de comandos compilada del simulador (en la imagen, /simulador/dist/cli.js). */
export function cliDelSimulador(): string {
  return variable('SIMULADOR_CLI');
}

/** El repo entero montado de solo lectura, con .git. */
export function rutaRepo(): string {
  return process.env.REPO_PATH && process.env.REPO_PATH !== '' ? process.env.REPO_PATH : '/repo';
}
