// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas del simulador: lo que se mira de la réplica
// por HTTP con el JWT del primer mozo del restaurante 1. No cubre scenarios.
// T05 (DP-60) y T06 (DP-81). Los IDs fijos de los datos iniciales (DP-70, DP-71) son los únicos supuestos.
import request from 'supertest';
import { urlReplica } from './entorno';

/** DP-71: uuid del restaurante 1. */
export const RESTAURANTE_1 = '11111111-1111-4111-8111-111111111111';
/** DP-71: `user.id` del primer mozo del restaurante 1. */
export const MOZO_1_DEL_RESTAURANTE_1 = 1;

/** Los objetos de la respuesta se leen como registros sueltos: la forma la fijan DP-60 y DP-81. */
export type Registro = Record<string, any>;

export interface Respuesta {
  estado: number;
  cuerpo: unknown;
}

/** T05 · `GET /restaurants/<restaurante 1>/tables/active` con el JWT dado. */
export async function mesasActivasDelRestaurante1(jwt: string): Promise<Respuesta> {
  const respuesta = await request(urlReplica())
    .get(`/restaurants/${RESTAURANTE_1}/tables/active`)
    .set('Authorization', `Bearer ${jwt}`);
  return { estado: respuesta.status, cuerpo: respuesta.body };
}

/** T06 · `GET /payments/in-person-requests` con el JWT dado. */
export async function solicitudesDeCobro(jwt: string): Promise<Respuesta> {
  const respuesta = await request(urlReplica())
    .get('/payments/in-person-requests')
    .set('Authorization', `Bearer ${jwt}`);
  return { estado: respuesta.status, cuerpo: respuesta.body };
}

/** T05 que tiene que responder 200 con un arreglo; si no, la prueba falla con el estado y el cuerpo. */
export async function mesasOcupadas(jwt: string): Promise<Registro[]> {
  const { estado, cuerpo } = await mesasActivasDelRestaurante1(jwt);
  if (estado !== 200 || !Array.isArray(cuerpo)) {
    throw new Error(`T05 respondió ${estado} con ${JSON.stringify(cuerpo)}; se esperaba 200 con un arreglo.`);
  }
  return cuerpo as Registro[];
}
