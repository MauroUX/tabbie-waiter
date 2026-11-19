// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas de contrato: eventos de GET /sse/waiters.
// No cubre scenarios. Abre el stream con el JWT en `Authorization: Bearer` (0008), junta los eventos leyendo las
// líneas `event:` y `data:` del cable, espera uno que cumpla un predicado (hasta 5 s) o devuelve lo que llegó en una
// ventana fija (1,5 s), y corta la conexión. Las esperas no son mediciones: ninguna aserción usa el reloj.
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { urlReplica } from './entorno';

export interface EventoRecibido {
  /** El valor de la línea `event:` (`message` si no vino ninguna). */
  tipo: string;
  /** El `data:` parseado como JSON, o el texto tal cual si no es JSON. */
  data: unknown;
  /** El `data:` tal como llegó. */
  crudo: string;
}

export interface StreamDeEventos {
  estado: number;
  tipoDeContenido: string;
  /** Todos los eventos recibidos desde que se abrió, en orden de llegada. */
  readonly eventos: EventoRecibido[];
  /** El primer evento (ya recibido o por recibir) que cumple el predicado; falla si no llega en `ms`. */
  esperar(predicado: (evento: EventoRecibido) => boolean, ms?: number): Promise<EventoRecibido>;
  /** Espera la ventana fija y devuelve los eventos que llegaron desde que se abrió el stream. */
  eventosTrasLaVentana(ms?: number): Promise<EventoRecibido[]>;
  cerrar(): void;
}

/** Espera máxima de un evento esperado (piezas de contrato, sección 3). */
export const ESPERA_DE_EVENTO_MS = 5000;
/** Ventana fija para comprobar que no llegó ningún evento (piezas de contrato, sección 3). */
export const VENTANA_SIN_EVENTOS_MS = 1500;
/** Margen tras los encabezados para que la suscripción quede registrada; no es una medición. */
const MARGEN_DE_SUSCRIPCION_MS = 200;

const pausa = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms));

/** Separa un bloque de evento SSE en su tipo y su data. */
function leerBloque(bloque: string): EventoRecibido | undefined {
  let tipo = 'message';
  const datos: string[] = [];
  for (const linea of bloque.split('\n')) {
    if (linea === '' || linea.startsWith(':')) {
      continue;
    }
    const dosPuntos = linea.indexOf(':');
    const campo = dosPuntos === -1 ? linea : linea.slice(0, dosPuntos);
    let valor = dosPuntos === -1 ? '' : linea.slice(dosPuntos + 1);
    if (valor.startsWith(' ')) {
      valor = valor.slice(1);
    }
    if (campo === 'event') {
      tipo = valor;
    } else if (campo === 'data') {
      datos.push(valor);
    }
  }
  if (datos.length === 0) {
    return undefined;
  }
  const crudo = datos.join('\n');
  let data: unknown = crudo;
  try {
    data = JSON.parse(crudo);
  } catch {
    data = crudo;
  }
  return { tipo, data, crudo };
}

/**
 * Abre GET /sse/waiters con el JWT en el encabezado y empieza a juntar eventos.
 * Si la réplica no responde 200, falla con el estado y el cuerpo: las pruebas que lo usan necesitan el stream abierto.
 */
export function abrirEventos(jwt: string): Promise<StreamDeEventos> {
  const url = `${urlReplica()}/sse/waiters`;
  return new Promise((resolver, rechazar) => {
    const eventos: EventoRecibido[] = [];
    const avisos = new EventEmitter();
    let pendiente = '';
    let resuelto = false;

    const pedido = http.get(url, {
      headers: { Accept: 'text/event-stream', Authorization: `Bearer ${jwt}` },
    });

    const cerrar = (): void => {
      pedido.destroy();
    };

    pedido.on('error', (error) => {
      if (!resuelto) {
        resuelto = true;
        rechazar(error);
      }
    });

    pedido.on('response', (respuesta) => {
      const estado = respuesta.statusCode ?? 0;
      const tipoDeContenido = String(respuesta.headers['content-type'] ?? '');
      respuesta.setEncoding('utf8');
      respuesta.on('error', () => undefined);

      if (estado !== 200) {
        let cuerpo = '';
        respuesta.on('data', (parte: string) => {
          cuerpo += parte;
        });
        respuesta.on('end', () => {
          if (!resuelto) {
            resuelto = true;
            rechazar(new Error(`GET /sse/waiters respondió ${estado} en lugar de abrir el stream: ${cuerpo}`));
          }
        });
        return;
      }

      respuesta.on('data', (parte: string) => {
        pendiente += parte.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        let corte = pendiente.indexOf('\n\n');
        while (corte !== -1) {
          const bloque = pendiente.slice(0, corte);
          pendiente = pendiente.slice(corte + 2);
          const evento = leerBloque(bloque);
          if (evento) {
            eventos.push(evento);
            avisos.emit('evento', evento);
          }
          corte = pendiente.indexOf('\n\n');
        }
      });

      const stream: StreamDeEventos = {
        estado,
        tipoDeContenido,
        eventos,
        esperar(predicado, ms = ESPERA_DE_EVENTO_MS) {
          const yaLlego = eventos.find(predicado);
          if (yaLlego) {
            return Promise.resolve(yaLlego);
          }
          return new Promise((resolverEvento, rechazarEvento) => {
            const alLlegar = (evento: EventoRecibido): void => {
              if (predicado(evento)) {
                clearTimeout(temporizador);
                avisos.off('evento', alLlegar);
                resolverEvento(evento);
              }
            };
            const temporizador = setTimeout(() => {
              avisos.off('evento', alLlegar);
              rechazarEvento(
                new Error(
                  `No llegó el evento esperado en ${ms} ms. Llegaron: ${JSON.stringify(eventos.map((e) => e.tipo))}`,
                ),
              );
            }, ms);
            avisos.on('evento', alLlegar);
          });
        },
        async eventosTrasLaVentana(ms = VENTANA_SIN_EVENTOS_MS) {
          await pausa(ms);
          return [...eventos];
        },
        cerrar,
      };

      setTimeout(() => {
        if (!resuelto) {
          resuelto = true;
          resolver(stream);
        }
      }, MARGEN_DE_SUSCRIPCION_MS);
    });
  });
}
