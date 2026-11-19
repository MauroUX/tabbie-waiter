// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas del simulador: `GET /sse/waiters` abierto con
// el JWT en el encabezado (0008), que junta los eventos y deja esperarlos. No cubre scenarios.
// Formato en el cable: por evento, `event: <tipo>`, `data: <JSON>` y quizás `id:`, separados por una línea en blanco.
// Un evento esperado se espera hasta 5 s (piezas de contrato, sección 3).
import http from 'node:http';
import { urlReplica } from './entorno';

export interface EventoSse {
  tipo: string;
  /** El texto de las líneas `data:`, unidas con salto de línea. */
  datos: string;
}

/** Tiempo máximo para que llegue un evento esperado. */
export const ESPERA_DE_EVENTO_MS = 5000;
/** Margen después de recibir los encabezados, para que la suscripción quede hecha antes de la acción. */
const MARGEN_TRAS_ABRIR_MS = 300;

interface Espera {
  predicado: (evento: EventoSse) => boolean;
  resolver: (evento: EventoSse) => void;
}

export class StreamDeEventos {
  readonly eventos: EventoSse[] = [];
  private pendiente = '';
  private esperas: Espera[] = [];

  private constructor(private readonly pedido: http.ClientRequest) {}

  /** Abre el stream; falla si la réplica no responde 200 con `text/event-stream`. */
  static abrir(jwt: string): Promise<StreamDeEventos> {
    const url = `${urlReplica()}/sse/waiters`;
    return new Promise((resolver, rechazar) => {
      const pedido = http.get(url, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${jwt}` },
      });
      const stream = new StreamDeEventos(pedido);
      pedido.on('error', (error) => rechazar(error));
      pedido.on('response', (respuesta) => {
        const tipo = String(respuesta.headers['content-type'] ?? '');
        if (respuesta.statusCode !== 200 || !tipo.startsWith('text/event-stream')) {
          pedido.destroy();
          rechazar(new Error(`/sse/waiters respondió ${String(respuesta.statusCode)} con "${tipo}".`));
          return;
        }
        respuesta.setEncoding('utf8');
        respuesta.on('data', (parte: string) => stream.recibir(parte));
        respuesta.on('error', () => undefined);
        setTimeout(() => resolver(stream), MARGEN_TRAS_ABRIR_MS);
      });
    });
  }

  /** Espera el primer evento, ya llegado o por llegar, que cumple el predicado. */
  esperar(predicado: (evento: EventoSse) => boolean, ms: number = ESPERA_DE_EVENTO_MS): Promise<EventoSse> {
    const yaLlegado = this.eventos.find(predicado);
    if (yaLlegado) {
      return Promise.resolve(yaLlegado);
    }
    return new Promise((resolver, rechazar) => {
      const espera: Espera = {
        predicado,
        resolver: (evento) => {
          clearTimeout(temporizador);
          resolver(evento);
        },
      };
      const temporizador = setTimeout(() => {
        this.esperas = this.esperas.filter((otra) => otra !== espera);
        const tipos = this.eventos.map(({ tipo }) => tipo);
        rechazar(new Error(`No llegó el evento esperado en ${ms} ms; llegaron: ${JSON.stringify(tipos)}.`));
      }, ms);
      this.esperas.push(espera);
    });
  }

  cerrar(): void {
    this.pedido.destroy();
  }

  private recibir(parte: string): void {
    this.pendiente += parte.replace(/\r\n/g, '\n');
    let corte = this.pendiente.indexOf('\n\n');
    while (corte !== -1) {
      const bloque = this.pendiente.slice(0, corte);
      this.pendiente = this.pendiente.slice(corte + 2);
      this.procesar(bloque);
      corte = this.pendiente.indexOf('\n\n');
    }
  }

  private procesar(bloque: string): void {
    let tipo = 'message';
    const datos: string[] = [];
    for (const linea of bloque.split('\n')) {
      if (linea.startsWith(':')) {
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
      return;
    }
    const evento: EventoSse = { tipo, datos: datos.join('\n') };
    this.eventos.push(evento);
    for (const espera of [...this.esperas]) {
      if (espera.predicado(evento)) {
        this.esperas = this.esperas.filter((otra) => otra !== espera);
        espera.resolver(evento);
      }
    }
  }
}

/** El `data` de un evento leído como JSON, o `undefined` si no es JSON. */
export function datosJson(evento: EventoSse): unknown {
  try {
    return JSON.parse(evento.datos);
  } catch {
    return undefined;
  }
}
