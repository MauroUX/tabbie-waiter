// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato T06 · GET /payments/in-person-requests".
// Scenario: "T06 omite un valor que no es JSON".
// Decisiones: DP-81 (un valor que no es JSON se omite y se anota en el registro de la réplica), DP-52 (OpenAPI).
// Las dos claves las escribe la prueba directo en Redis, con un vencimiento propio, y las borra al final.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { abrirConexion, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { exigirEstado, exigirOpenApi } from '../apoyo/comensal';
import type { Registro } from '../apoyo/comensal';
import { urlReplica } from '../apoyo/entorno';
import { jwtVigente } from '../apoyo/jwt';
import { borrarSolicitudesDe, claveDeSolicitud, conectarRedis } from '../apoyo/redis';
import type { ClienteRedis } from '../apoyo/redis';

/** Vencimiento de las claves que escribe la prueba: se van solas si la limpieza no corre. */
const VENCIMIENTO_DE_LA_PRUEBA_S = 600;
const VALOR_QUE_NO_ES_JSON = 'esto no es JSON {';

describe('T06 · un valor que no es JSON', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  let redis: ClienteRedis | undefined;
  const restauranteId = randomUUID();
  let mozoId = 0;
  let valida: Registro = {};

  beforeAll(async () => {
    conexion = await abrirConexion();
    redis = await conectarRedis();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante T06 No JSON de Prueba' });
    mozoId = await s.insertar('user', {
      email: `mozo-t06-no-json-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo T06 No JSON de Prueba',
      restaurantId: restauranteId,
    });

    // Una solicitud válida y, en el mismo restaurante, una clave con un valor que no es JSON.
    // userId y tableSessionId son datos guardados, no ids que la réplica busque.
    valida = {
      id: randomUUID(),
      userId: 0,
      userName: 'Comensal T06 No JSON de Prueba',
      restaurantId: restauranteId,
      tableNumber: 1,
      tableSessionId: 0,
      amount: 2200,
      noTipAmount: 2000,
      method: 'Cash',
    };
    await redis.set(
      claveDeSolicitud(restauranteId, String(valida.id)),
      JSON.stringify(valida),
      'EX',
      VENCIMIENTO_DE_LA_PRUEBA_S,
    );
    await redis.set(claveDeSolicitud(restauranteId, randomUUID()), VALOR_QUE_NO_ES_JSON, 'EX', VENCIMIENTO_DE_LA_PRUEBA_S);
  });

  afterAll(async () => {
    if (redis) {
      await borrarSolicitudesDe(redis, [restauranteId]);
      redis.disconnect();
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('T06 omite un valor que no es JSON', async () => {
    const respuesta = await request(urlReplica())
      .get('/payments/in-person-requests')
      .set('Authorization', `Bearer ${jwtVigente(mozoId, 'waiter')}`);

    // 200 solo con la solicitud válida.
    exigirEstado('T06', respuesta, 200);
    expect(respuesta.body).toEqual([valida]);
    exigirOpenApi({ ruta: '/payments/in-person-requests', metodo: 'get', codigo: 200 }, respuesta.body);
  });
});
