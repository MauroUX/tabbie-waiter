// Change tk-01-replica-base · apoyo de las pruebas de contrato: abrir GET /sse/waiters con `http` de Node.
// No cubre scenarios. Lee el estado y los encabezados, espera un momento para ver si la conexión sigue
// abierta y la corta. No espera eventos: en este ticket nadie emite.
import http from 'node:http';
import { urlReplica } from './entorno';

export interface AperturaDelStream {
  estado: number;
  tipoDeContenido: string;
  /** La respuesta no terminó durante la espera. */
  sigueAbierta: boolean;
  cuerpo: string;
}

/** Espera tras los encabezados antes de cortar; no es una medición de tiempo. */
const ESPERA_MS = 1500;

export function abrirStream(encabezados: Record<string, string> = {}): Promise<AperturaDelStream> {
  const url = `${urlReplica()}/sse/waiters`;
  return new Promise((resolver, rechazar) => {
    let resuelto = false;
    const pedido = http.get(url, { headers: { Accept: 'text/event-stream', ...encabezados } });
    pedido.on('error', (error) => {
      if (!resuelto) {
        resuelto = true;
        rechazar(error);
      }
    });
    pedido.on('response', (respuesta) => {
      let cuerpo = '';
      let termino = false;
      const terminar = (): void => {
        if (resuelto) {
          return;
        }
        resuelto = true;
        clearTimeout(temporizador);
        resolver({
          estado: respuesta.statusCode ?? 0,
          tipoDeContenido: String(respuesta.headers['content-type'] ?? ''),
          sigueAbierta: !termino,
          cuerpo,
        });
        pedido.destroy();
      };
      const temporizador = setTimeout(terminar, ESPERA_MS);
      respuesta.setEncoding('utf8');
      respuesta.on('data', (parte: string) => {
        cuerpo += parte;
      });
      respuesta.on('error', () => undefined);
      respuesta.on('end', () => {
        termino = true;
        terminar();
      });
    });
  });
}
