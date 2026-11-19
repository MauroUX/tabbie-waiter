// Cliente HTTP del comensal (design D2): sin reintentos, ni propios ni de la librería, y con 10 s de espera por
// petición. Nunca repite una petición (RNF-6). Cada petición deja su línea en el registro, salga como salga.
import { randomUUID } from 'node:crypto';
import { limpiar } from './registro';
import type { Registro, Resultado } from './registro';

export const ESPERA_MAXIMA_MS = 10_000;

export const PETICION = {
  invitado: 'POST /auth/guest',
  unirse: 'POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber',
  crearPedido: 'POST /orders',
  confirmarPedido: 'PUT /orders/:id/confirm',
  pedirCobro: 'POST /payments/in-person-request',
} as const;
export type Peticion = (typeof PETICION)[keyof typeof PETICION];

/** Una petición que la réplica rechazó (4xx o 5xx) o que no respondió: termina el escenario. */
export class ErrorDeEscenario extends Error {
  constructor(
    readonly escenario: string,
    readonly peticion: string,
    readonly estado: number | null,
    readonly detalle: string,
  ) {
    super(
      `${escenario}: ${peticion} ${estado === null ? 'no tuvo respuesta' : `terminó con ${estado}`}: ${detalle}`,
    );
    this.name = 'ErrorDeEscenario';
  }
}

export class Comensal {
  readonly guestId = randomUUID();
  userId: number | null = null;
  jwt: string | null = null;
  tableSessionId: number | null = null;
}

export interface Turno {
  escenario: string;
  restauranteId: string;
  mesa: number;
  replicaUrl: string;
  registro: Registro;
}

export interface Envio {
  peticion: Peticion;
  metodo: 'POST' | 'PUT';
  ruta: string;
  cuerpo?: unknown;
  /** El comensal manda su JWT (todas menos `/auth/guest` y `/join`). */
  conJwt: boolean;
  /** Ids que se conocen antes de mandar la petición. */
  orderId?: number;
  monto?: number;
}

export interface IdsDeLaRespuesta {
  tableSessionId?: number;
  orderId?: number;
  requestId?: string;
}

/** El mensaje de un error de la réplica (`message` de NestJS: texto o arreglo de textos), o un resumen del cuerpo. */
function mensajeDe(cuerpo: unknown, texto: string): string {
  const mensaje = (cuerpo as { message?: unknown } | null)?.message;
  if (Array.isArray(mensaje)) {
    return mensaje.map(String).join(' | ');
  }
  if (typeof mensaje === 'string' && mensaje !== '') {
    return mensaje;
  }
  return texto.trim() === '' ? 'sin mensaje' : texto.trim().slice(0, 300);
}

function motivoDeFallo(error: unknown): string {
  const e = error as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (e.name === 'TimeoutError' || e.name === 'AbortError') {
    return `sin respuesta en ${ESPERA_MAXIMA_MS / 1000} s`;
  }
  const causa = e.cause?.code ?? e.cause?.message;
  return causa === undefined ? (e.message ?? 'fallo de red') : `${e.message ?? 'fallo de red'} (${causa})`;
}

/**
 * Manda una petición, la anota en el registro y devuelve el cuerpo si salió bien. Si la réplica la rechaza o no
 * responde, anota la línea y lanza `ErrorDeEscenario`: el escenario termina ahí, sin reintentar.
 */
export async function enviar(
  turno: Turno,
  comensal: Comensal,
  envio: Envio,
  extraer: (cuerpo: unknown) => IdsDeLaRespuesta = () => ({}),
): Promise<unknown> {
  const encabezados: Record<string, string> = { Accept: 'application/json' };
  if (envio.cuerpo !== undefined) {
    encabezados['Content-Type'] = 'application/json';
  }
  if (envio.conJwt && comensal.jwt !== null) {
    encabezados.Authorization = `Bearer ${comensal.jwt}`;
  }

  // La hora se toma justo antes de mandar la petición (D3): es el "desde cuándo" de las mediciones.
  const hora = new Date().toISOString();
  let estado: number | null = null;
  let resultado: Resultado;
  let mensaje: string | null = null;
  let cuerpo: unknown = null;
  try {
    const respuesta = await fetch(`${turno.replicaUrl}${envio.ruta}`, {
      method: envio.metodo,
      headers: encabezados,
      body: envio.cuerpo === undefined ? undefined : JSON.stringify(envio.cuerpo),
      redirect: 'error',
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    estado = respuesta.status;
    const texto = await respuesta.text();
    try {
      cuerpo = texto === '' ? null : JSON.parse(texto);
    } catch {
      cuerpo = null;
    }
    if (respuesta.ok) {
      resultado = 'ok';
    } else {
      resultado = 'rechazada';
      mensaje = limpiar(mensajeDe(cuerpo, texto));
    }
  } catch (error) {
    resultado = 'sin respuesta';
    mensaje = limpiar(motivoDeFallo(error));
  }

  const ids = resultado === 'ok' ? extraer(cuerpo) : {};
  if (ids.tableSessionId !== undefined) {
    comensal.tableSessionId = ids.tableSessionId;
  }
  turno.registro.anotar({
    hora,
    escenario: turno.escenario,
    peticion: envio.peticion,
    restaurantId: turno.restauranteId,
    mesa: turno.mesa,
    comensal: { userId: comensal.userId, guestId: comensal.guestId },
    tableSessionId: comensal.tableSessionId,
    orderId: ids.orderId ?? envio.orderId ?? null,
    requestId: ids.requestId ?? null,
    monto: envio.monto ?? null,
    estado,
    resultado,
    mensaje,
  });
  if (resultado !== 'ok') {
    throw new ErrorDeEscenario(turno.escenario, envio.peticion, estado, mensaje ?? 'sin detalle');
  }
  return cuerpo;
}
