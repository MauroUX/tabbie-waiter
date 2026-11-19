// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas de contrato: las llamadas del comensal y del mozo.
// No cubre scenarios. Arma las peticiones de /auth/guest, /join, POST /orders, confirm y T05 con las rutas y los cuerpos
// de DP-73 a DP-76, y las versiones "Ok" exigen el código de éxito y validan la respuesta contra docs/api/openapi.yaml.
// Los datos los siembra cada test a la vista; acá no hay ninguno.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { urlReplica } from './entorno';
import { erroresContraOpenApi } from './openapi';
import type { RespuestaEsperada } from './openapi';

/** Los objetos de las respuestas se leen como registros sueltos: la forma la fijan DP-73 a DP-82 y el OpenAPI. */
export type Registro = Record<string, any>;

export const RUTA_JOIN_OPENAPI = '/table-sessions/join/restaurant/{restaurantId}/table/{tableNumber}';
export const rutaJoin = (restauranteId: string, numero: number | string): string =>
  `/table-sessions/join/restaurant/${restauranteId}/table/${numero}`;
export const rutaMesas = (restauranteId: string): string => `/restaurants/${restauranteId}/tables/active`;

/** El email del invitado de un `guestId` (DP-72, PR-3). */
export const emailDeInvitado = (guestId: string): string => `invitado.${guestId}@example.com`;

/** Forma de un JWT: tres partes base64url, la primera empieza por `eyJ`. */
export const FORMA_DE_JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

/** uuid v4 (DP-79). */
export const FORMA_DE_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** El `message` de un error de NestJS como un solo texto (string o arreglo de strings). */
export function mensajeDe(cuerpo: unknown): string {
  const mensaje = (cuerpo as Registro | undefined)?.message;
  return Array.isArray(mensaje) ? mensaje.join(' | ') : String(mensaje ?? '');
}

/** Exige el código; si no coincide, el error muestra el paso y el cuerpo. */
export function exigirEstado(paso: string, respuesta: request.Response, estado: number): void {
  expect({ paso, estado: respuesta.status, cuerpo: respuesta.status === estado ? undefined : respuesta.body }).toEqual({
    paso,
    estado,
    cuerpo: undefined,
  });
}

/** Valida el cuerpo contra el OpenAPI; si no valida, el error muestra la ruta y los errores. */
export function exigirOpenApi(esperada: RespuestaEsperada, cuerpo: unknown): void {
  const ruta = `${esperada.metodo.toUpperCase()} ${esperada.ruta} ${esperada.codigo}`;
  expect({ ruta, errores: erroresContraOpenApi(esperada, cuerpo) }).toEqual({ ruta, errores: [] });
}

export interface Invitado {
  guestId: string;
  userId: number;
  jwt: string;
}

/** Los invitados que pide una prueba: anota cada email antes de llamar, para borrarlo aunque la prueba falle. */
export class Invitados {
  readonly emails: string[] = [];

  /** Anota el email de un `guestId` que la prueba va a mandar. */
  anotar(guestId: string): void {
    this.emails.push(emailDeInvitado(guestId));
  }

  /** `POST /auth/guest` con un `guestId` nuevo; exige 201 y valida contra el OpenAPI. */
  async entrar(): Promise<Invitado> {
    const guestId = randomUUID();
    this.anotar(guestId);
    const respuesta = await request(urlReplica()).post('/auth/guest').send({ guestId });
    exigirEstado('POST /auth/guest', respuesta, 201);
    exigirOpenApi({ ruta: '/auth/guest', metodo: 'post', codigo: 201 }, respuesta.body);
    return { guestId, userId: Number(respuesta.body.user.id), jwt: String(respuesta.body.access_token) };
  }
}

/** `/join` sin `Authorization`, con `{userId}` en el body (DP-74). */
export function unirse(restauranteId: string, numero: number | string, cuerpo: unknown): request.Test {
  return request(urlReplica())
    .post(rutaJoin(restauranteId, numero))
    .send(cuerpo as object);
}

/** `/join` que tiene que salir bien: exige 201, valida contra el OpenAPI y devuelve la sesión. */
export async function unirseOk(restauranteId: string, numero: number, userId: number): Promise<Registro> {
  const respuesta = await unirse(restauranteId, numero, { userId });
  exigirEstado(`POST ${rutaJoin(restauranteId, numero)}`, respuesta, 201);
  exigirOpenApi({ ruta: RUTA_JOIN_OPENAPI, metodo: 'post', codigo: 201 }, respuesta.body);
  return respuesta.body as Registro;
}

/** T05 con el JWT del mozo: exige 200, valida contra el OpenAPI y devuelve las mesas. */
export async function mesasActivas(jwtMozo: string, restauranteId: string): Promise<Registro[]> {
  const respuesta = await request(urlReplica())
    .get(rutaMesas(restauranteId))
    .set('Authorization', `Bearer ${jwtMozo}`);
  exigirEstado('T05', respuesta, 200);
  exigirOpenApi({ ruta: '/restaurants/{id}/tables/active', metodo: 'get', codigo: 200 }, respuesta.body);
  return respuesta.body as Registro[];
}

/** `POST /orders` con el JWT dado (o sin JWT si es `undefined`). */
export function pedir(jwt: string | undefined, cuerpo: unknown): request.Test {
  const peticion = request(urlReplica()).post('/orders');
  if (jwt !== undefined) {
    peticion.set('Authorization', `Bearer ${jwt}`);
  }
  return peticion.send(cuerpo as object);
}

/** `POST /orders` que tiene que salir bien: exige 201, valida contra el OpenAPI y devuelve el pedido. */
export async function pedirOk(jwt: string, cuerpo: unknown): Promise<Registro> {
  const respuesta = await pedir(jwt, cuerpo);
  exigirEstado('POST /orders', respuesta, 201);
  exigirOpenApi({ ruta: '/orders', metodo: 'post', codigo: 201 }, respuesta.body);
  return respuesta.body as Registro;
}

/** `PUT /orders/:id/confirm`, sin body (DP-76). */
export function confirmar(jwt: string, pedidoId: number): request.Test {
  return request(urlReplica()).put(`/orders/${pedidoId}/confirm`).set('Authorization', `Bearer ${jwt}`);
}

/** `PUT /orders/:id/confirm` que tiene que salir bien: exige 200, valida contra el OpenAPI y devuelve el pedido. */
export async function confirmarOk(jwt: string, pedidoId: number): Promise<Registro> {
  const respuesta = await confirmar(jwt, pedidoId);
  exigirEstado(`PUT /orders/${pedidoId}/confirm`, respuesta, 200);
  exigirOpenApi({ ruta: '/orders/{id}/confirm', metodo: 'put', codigo: 200 }, respuesta.body);
  return respuesta.body as Registro;
}
