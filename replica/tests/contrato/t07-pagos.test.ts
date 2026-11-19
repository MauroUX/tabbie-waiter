// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato T07 · GET /table-sessions/:id/payments".
// Scenarios: "T07 devuelve los pagos de la sesión", "T07 reproduce O2 a propósito" y "T07 sin JWT o de una sesión sin pagos".
// Decisiones: DP-82 (forma, orden y sesión inexistente), DP-50 (O2 se reproduce a propósito), DP-52 (OpenAPI).
// O2: `@Roles(admin, waiter, backoffice)` sin `RolesGuard` y sin chequeo de restaurante. No es un fallo de la réplica:
// la app lo rodea (C10) y SEG-c2 lo comprueba en TK-13. La prueba de O2 exige que se siga reproduciendo.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { abrirConexion, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { exigirOpenApi, Invitados } from '../apoyo/comensal';
import type { Registro } from '../apoyo/comensal';
import { urlReplica } from '../apoyo/entorno';
import { jwtVigente } from '../apoyo/jwt';
import { borrarLoQueCreoLaReplica, idInexistente } from '../apoyo/limpieza';

const rutaPagos = (sesionId: number): string => `/table-sessions/${sesionId}/payments`;
const RUTA_PAGOS_OPENAPI = '/table-sessions/{id}/payments';

function pedirPagos(sesionId: number, jwt?: string): request.Test {
  const peticion = request(urlReplica()).get(rutaPagos(sesionId));
  return jwt === undefined ? peticion : peticion.set('Authorization', `Bearer ${jwt}`);
}

interface SesionConPagos {
  mozo: number;
  comensal: number;
  sesion: number;
  pagoManual: number;
  pagoDelComensal: number;
}

/**
 * Siembra, a la vista de cada describe: un restaurante con su mozo, una mesa ocupada con su sesión, un comensal del
 * restaurante, un pago manual (`cash`, sin userId) y un pago del comensal (`POS`). El manual se inserta primero con un
 * createdAt posterior, para ver el orden por createdAt de la respuesta.
 */
async function sembrarSesionConPagos(s: Sembrado, restauranteId: string, etiqueta: string): Promise<SesionConPagos> {
  await s.insertar('restaurant', { id: restauranteId, name: `Restaurante ${etiqueta} de Prueba` });
  const mozo = await s.insertar('user', {
    email: `mozo-t07-${randomUUID()}@example.com`,
    role: 'waiter',
    isGuest: 0,
    name: `Mozo ${etiqueta} de Prueba`,
    restaurantId: restauranteId,
  });
  const comensal = await s.insertar('user', {
    email: `comensal-t07-${randomUUID()}@example.com`,
    role: 'user',
    isGuest: 0,
    name: `Comensal ${etiqueta} de Prueba`,
    restaurantId: restauranteId,
  });
  const mesa = await s.insertar('table', {
    number: 1,
    seats: 4,
    qrCode: `qr-t07-${randomUUID()}`,
    restaurantId: restauranteId,
    isBusy: 0,
    activeSessionId: null,
  });
  const sesion = await s.insertar('table_session', {
    tableId: mesa,
    amountPaid: '3000.00',
    tips: '200.00',
    total: '3000.00',
    createdAt: '2026-01-01 12:00:00.000000',
    closedAt: null,
  });
  await s.actualizar('table', mesa, { isBusy: 1, activeSessionId: sesion });
  await s.insertarIntermedia('table_session_users_user', { tableSessionId: sesion, userId: comensal });
  const pagoManual = await s.insertar('payment', {
    sessionId: sesion,
    amount: '1000.00',
    currency: 'UYU',
    method: 'cash',
    createdAt: '2026-01-01 12:30:00.000000',
    prepaid: 0,
    userId: null,
  });
  const pagoDelComensal = await s.insertar('payment', {
    sessionId: sesion,
    amount: '2200.00',
    currency: 'UYU',
    method: 'POS',
    createdAt: '2026-01-01 12:20:00.000000',
    prepaid: 0,
    userId: comensal,
  });
  return { mozo, comensal, sesion, pagoManual, pagoDelComensal };
}

describe('T07 · pagos de la sesión', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const restauranteId = randomUUID();
  let datos: SesionConPagos | undefined;

  beforeAll(async () => {
    conexion = await abrirConexion();
    sembrado = new Sembrado(conexion);
    datos = await sembrarSesionConPagos(sembrado, restauranteId, 'T07');
  });

  afterAll(async () => {
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('T07 devuelve los pagos de la sesión', async () => {
    const d = datos as SesionConPagos;

    const respuesta = await pedirPagos(d.sesion, jwtVigente(d.mozo, 'waiter'));

    expect(respuesta.status).toBe(200);
    const pagos = respuesta.body as Registro[];
    // Por createdAt ascendente: primero el del comensal (12:20), después el manual (12:30).
    expect(pagos.map((pago) => pago.id)).toEqual([d.pagoDelComensal, d.pagoManual]);
    const [delComensal, manual] = pagos;
    // amount como string.
    expect(delComensal).toMatchObject({ amount: '2200.00', method: 'POS' });
    expect(manual).toMatchObject({ amount: '1000.00', method: 'cash', user: null });
    // El comensal, con su restaurante.
    expect(delComensal.user).toMatchObject({ id: d.comensal, restaurant: { id: restauranteId } });

    exigirOpenApi({ ruta: RUTA_PAGOS_OPENAPI, metodo: 'get', codigo: 200 }, respuesta.body);
  });
});

describe('T07 · O2, reproducido a propósito (DP-50)', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  const otroRestauranteId = randomUUID();
  let datos: SesionConPagos | undefined;
  let mozoAjeno = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    sembrado = new Sembrado(conexion);
    datos = await sembrarSesionConPagos(sembrado, restauranteId, 'T07 O2');
    await sembrado.insertar('restaurant', { id: otroRestauranteId, name: 'Restaurante Otro T07 O2 de Prueba' });
    mozoAjeno = await sembrado.insertar('user', {
      email: `mozo-t07-ajeno-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Ajeno T07 de Prueba',
      restaurantId: otroRestauranteId,
    });
  });

  afterAll(async () => {
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  // O2 se reproduce a propósito (DP-50): sin RolesGuard ni chequeo de restaurante, cualquier JWT válido lee los pagos.
  test('T07 reproduce O2 a propósito (DP-50): un invitado y un mozo de otro restaurante leen los pagos', async () => {
    const d = datos as SesionConPagos;
    const invitado = await invitados.entrar();

    const delInvitado = await pedirPagos(d.sesion, invitado.jwt);
    const delMozoAjeno = await pedirPagos(d.sesion, jwtVigente(mozoAjeno, 'waiter'));

    // 200 con los mismos dos pagos a los dos.
    expect([delInvitado.status, delMozoAjeno.status]).toEqual([200, 200]);
    expect((delInvitado.body as Registro[]).map((pago) => pago.id)).toEqual([d.pagoDelComensal, d.pagoManual]);
    expect(delMozoAjeno.body).toEqual(delInvitado.body);
  });
});

describe('T07 · sin JWT o de una sesión sin pagos', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const restauranteId = randomUUID();
  let datos: SesionConPagos | undefined;

  beforeAll(async () => {
    conexion = await abrirConexion();
    sembrado = new Sembrado(conexion);
    datos = await sembrarSesionConPagos(sembrado, restauranteId, 'T07 Sin JWT');
  });

  afterAll(async () => {
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('T07 sin JWT o de una sesión sin pagos', async () => {
    const d = datos as SesionConPagos;
    const sesionInexistente = await idInexistente(conexion as Conexion, 'table_session');

    const sinJwt = await pedirPagos(d.sesion);
    const inexistente = await pedirPagos(sesionInexistente, jwtVigente(d.mozo, 'waiter'));

    expect([sinJwt.status, inexistente.status]).toEqual([401, 200]);
    expect(inexistente.body).toEqual([]);
    exigirOpenApi({ ruta: RUTA_PAGOS_OPENAPI, metodo: 'get', codigo: 200 }, inexistente.body);
  });
});
