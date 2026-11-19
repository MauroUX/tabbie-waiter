// Registro del turno (design D3): JSON Lines, una línea por petición, que se agrega al archivo de `--registro`.
// Nunca anota un JWT, un encabezado Authorization ni emails: la línea se arma solo con ids, el código y el mensaje
// de la réplica (y el mensaje pasa antes por `limpiar`).
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export type Resultado = 'ok' | 'rechazada' | 'sin respuesta';

export interface LineaDeRegistro {
  hora: string;
  escenario: string;
  peticion: string;
  restaurantId: string;
  mesa: number;
  comensal: { userId: number | null; guestId: string };
  tableSessionId: number | null;
  orderId: number | null;
  requestId: string | null;
  monto: number | null;
  estado: number | null;
  resultado: Resultado;
  mensaje: string | null;
}

const JWT = /eyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Saca de un texto cualquier JWT o email que haya llegado dentro (el mensaje de la réplica, el motivo de un fallo). */
export function limpiar(texto: string): string {
  return texto.replace(JWT, '[jwt]').replace(EMAIL, '[email]');
}

/** Ruta por defecto: `/registros/turno-<AAAA-MM-DD>.jsonl`, con la fecha en UTC. */
export function rutaPorDefecto(ahora: Date = new Date()): string {
  return `/registros/turno-${ahora.toISOString().slice(0, 10)}.jsonl`;
}

export class Registro {
  constructor(private readonly ruta: string) {}

  /** Crea la carpeta si no existe; si no se puede escribir, falla antes de mandar ninguna petición. */
  preparar(): void {
    mkdirSync(path.dirname(this.ruta), { recursive: true });
    appendFileSync(this.ruta, '');
  }

  anotar(linea: LineaDeRegistro): void {
    appendFileSync(this.ruta, `${JSON.stringify(linea)}\n`, { encoding: 'utf8' });
  }
}
