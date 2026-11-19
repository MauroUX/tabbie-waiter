// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato T06 · GET /payments/in-person-requests".
// Scenarios: "T06 devuelve las solicitudes del restaurante del mozo" y "T06 sin solicitudes y sin restaurante".
// Decisiones: DP-81 (forma, sin orden garantizado, 403 sin restaurante), DP-52 (OpenAPI). Contexto, 3.3: SCAN + GET.
// Las solicitudes las escribe la prueba directo en Redis, con un vencimiento propio, y las borra al final.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { abrirConexion, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { exigirOpenApi } from '../apoyo/comensal';
import type { Registro } from '../apoyo/comensal';
import { urlReplica } from '../apoyo/entorno';
import { jwtVigente } from '../apoyo/jwt';
import type { Rol } from '../apoyo/jwt';
import { borrarSolicitudesDe, claveDeSolicitud, conectarRedis } from '../apoyo/redis';
import type { ClienteRedis } from '../apoyo/redis';

/** Vencimiento de las solicitudes que escribe la prueba: se van solas si la limpieza no corre. */
const VENCIMIENTO_DE_LA_PRUEBA_S = 600;
/** 2026-01-01T00:00:00Z en milisegundos: el `<timestamp>` literal del id de MercadoPago. */
const TIMESTAMP_LITERAL = 1767225600000;

const pedirSolicitudes = (userId: number, rol: Rol): request.Test =>
  request(urlReplica())
    .get('/payments/in-person-requests')
    .set('Authorization', `Bearer ${jwtVigente(userId, rol)}`);

const porId = (a: Registro, b: Registro): number => String(a.id).localeCompare(String(b.id));

describe('T06 · solicitudes del restaurante del mozo', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  let redis: ClienteRedis | undefined;
  const restauranteId = randomUUID();
  const otroRestauranteId = randomUUID();
  let mozoId = 0;
  const solicitudes: { propia: Registro; deMercadoPago: Registro; ajena: Registro } = {
    propia: {},
    deMercadoPago: {},
    ajena: {},
  };

  beforeAll(async () => {
    conexion = await abrirConexion();
    redis = await conectarRedis();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante T06 de Prueba' });
    await s.insertar('restaurant', { id: otroRestauranteId, name: 'Restaurante Otro T06 de Prueba' });
    mozoId = await s.insertar('user', {
      email: `mozo-t06-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo T06 de Prueba',
      restaurantId: restauranteId,
    });
    await s.insertar('user', {
      email: `mozo-t06-otro-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Otro T06 de Prueba',
      restaurantId: otroRestauranteId,
    });

    // Los userId y tableSessionId de las solicitudes son datos guardados, no ids que la réplica busque.
    solicitudes.propia = {
      id: randomUUID(),
      userId: 0,
      userName: 'Comensal T06 de Prueba',
      restaurantId: restauranteId,
      tableNumber: 1,
      tableSessionId: 0,
      amount: 2200,
      noTipAmount: 2000,
      method: 'Cash',
    };
    solicitudes.deMercadoPago = {
      id: `mp-0-0-${TIMESTAMP_LITERAL}`,
      userId: 0,
      userName: 'Comensal MercadoPago de Prueba',
      restaurantId: restauranteId,
      tableNumber: 2,
      tableSessionId: 0,
      amount: 3000,
      noTipAmount: 3000,
      method: 'Mercadopago',
    };
    solicitudes.ajena = {
      id: randomUUID(),
      userId: 0,
      userName: 'Comensal Ajeno T06 de Prueba',
      restaurantId: otroRestauranteId,
      tableNumber: 1,
      tableSessionId: 0,
      amount: 1000,
      noTipAmount: 1000,
      method: 'POS',
    };
    for (const solicitud of Object.values(solicitudes)) {
      await redis.set(
        claveDeSolicitud(String(solicitud.restaurantId), String(solicitud.id)),
        JSON.stringify(solicitud),
        'EX',
        VENCIMIENTO_DE_LA_PRUEBA_S,
      );
    }
  });

  afterAll(async () => {
    if (redis) {
      await borrarSolicitudesDe(redis, [restauranteId, otroRestauranteId]);
      redis.disconnect();
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('T06 devuelve las solicitudes del restaurante del mozo', async () => {
    const respuesta = await pedirSolicitudes(mozoId, 'waiter');

    expect(respuesta.status).toBe(200);
    // Las dos del restaurante, en cualquier orden, y ninguna del otro.
    const recibidas = [...(respuesta.body as Registro[])].sort(porId);
    expect(recibidas).toEqual([solicitudes.propia, solicitudes.deMercadoPago].sort(porId));

    exigirOpenApi({ ruta: '/payments/in-person-requests', metodo: 'get', codigo: 200 }, respuesta.body);
  });
});

describe('T06 · sin solicitudes y sin restaurante', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const restauranteId = randomUUID();
  let mozoId = 0;
  let sinRestauranteId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante T06 Vacío de Prueba' });
    mozoId = await s.insertar('user', {
      email: `mozo-t06-vacio-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo T06 Vacío de Prueba',
      restaurantId: restauranteId,
    });
    sinRestauranteId = await s.insertar('user', {
      email: `sin-restaurante-t06-${randomUUID()}@example.com`,
      role: 'user',
      isGuest: 0,
      name: 'Usuario Sin Restaurante T06 de Prueba',
      restaurantId: null,
    });
  });

  afterAll(async () => {
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('T06 sin solicitudes y sin restaurante', async () => {
    const delMozo = await pedirSolicitudes(mozoId, 'waiter');
    const sinRestaurante = await pedirSolicitudes(sinRestauranteId, 'user');

    expect(delMozo.status).toBe(200);
    expect(delMozo.body).toEqual([]);
    exigirOpenApi({ ruta: '/payments/in-person-requests', metodo: 'get', codigo: 200 }, delMozo.body);
    expect(sinRestaurante.status).toBe(403);
  });
});
