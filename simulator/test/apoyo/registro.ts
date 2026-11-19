// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas del simulador: leer el registro del turno,
// JSON Lines con una línea por petición (design.md, D3; piezas de contrato, sección 6). No cubre scenarios.
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Los valores de `peticion` (piezas de contrato, sección 6). */
export const PETICION = {
  invitado: 'POST /auth/guest',
  unirse: 'POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber',
  crearPedido: 'POST /orders',
  confirmarPedido: 'PUT /orders/:id/confirm',
  pedirCobro: 'POST /payments/in-person-request',
} as const;

/** ISO 8601 en UTC con milisegundos. */
export const HORA_ISO_UTC_CON_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export interface LineaDelRegistro {
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
  resultado: string;
  mensaje: string | null;
}

/** Las líneas no vacías del archivo, como texto; `[]` si el archivo no existe. */
export function lineasDeTexto(ruta: string): string[] {
  if (!existsSync(ruta)) {
    return [];
  }
  return readFileSync(ruta, 'utf8')
    .split('\n')
    .filter((linea) => linea.trim() !== '');
}

/** Cada línea leída como JSON; falla si alguna no lo es. */
export function leerLineas(lineas: string[]): LineaDelRegistro[] {
  return lineas.map((linea, indice) => {
    try {
      return JSON.parse(linea) as LineaDelRegistro;
    } catch {
      throw new Error(`La línea ${indice + 1} del registro no es JSON: ${linea}`);
    }
  });
}

/** Un directorio temporal propio de la prueba, para su archivo de registro. */
export function directorioTemporal(prefijo: string): string {
  return mkdtempSync(path.join(tmpdir(), `${prefijo}-`));
}
