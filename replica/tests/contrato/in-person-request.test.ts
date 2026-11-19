// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato POST /payments/in-person-request y el evento T17".
// Scenarios: "La solicitud se guarda en Redis con su vencimiento y emite T17", "La solicitud se guarda sin validar,
// también envuelta en body" y "La solicitud sin restaurantId o sin JWT se rechaza".
// Decisiones: DP-79 (id, respuesta y rechazos), DP-80 (REDIS_EXPIRATION_TIME, 3600 s si está vacía), DP-52 y design.md D6
// (OpenAPI). Contexto, 3.3: el body se guarda sin validar. Las claves de Redis de la prueba se borran al final.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { abrirConexion, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { exigirEstado, exigirOpenApi, FORMA_DE_UUID_V4, Invitados, unirseOk } from '../apoyo/comensal';
import type { Registro } from '../apoyo/comensal';
import { urlReplica } from '../apoyo/entorno';
import { erroresContraEsquema } from '../apoyo/esquemas';
import { abrirEventos } from '../apoyo/eventos';
import type { StreamDeEventos } from '../apoyo/eventos';
import { jwtVigente } from '../apoyo/jwt';
import { borrarLoQueCreoLaReplica } from '../apoyo/limpieza';
import {
  borrarSolicitudesDe,
  claveDeSolicitud,
  clavesConPrefijo,
  clavesDeSolicitudesDe,
  conectarRedis,
  vencimientoEsperado,
} from '../apoyo/redis';
import type { ClienteRedis } from '../apoyo/redis';

const T17 = 'in-person-payment-request';
const PREFIJO_DE_SOLICITUDES = 'in-person-request:';

function pedirCobro(jwt: string | undefined, cuerpo: object): request.Test {
  const peticion = request(urlReplica()).post('/payments/in-person-request');
  if (jwt !== undefined) {
    peticion.set('Authorization', `Bearer ${jwt}`);
  }
  return peticion.send(cuerpo);
}

async function leerSolicitud(redis: ClienteRedis, restauranteId: string, id: string): Promise<unknown> {
  const valor = await redis.get(claveDeSolicitud(restauranteId, id));
  return valor === null ? null : (JSON.parse(valor) as unknown);
}

describe('in-person-request · Redis, vencimiento y T17', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  let redis: ClienteRedis | undefined;
  const invitados = new Invitados();
  const streams: StreamDeEventos[] = [];
  const restauranteId = randomUUID();
  const NUMERO_DE_MESA = 4;
  let mozoId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    redis = await conectarRedis();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Cobro de Prueba' });
    mozoId = await s.insertar('user', {
      email: `mozo-cobro-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Cobro de Prueba',
      restaurantId: restauranteId,
    });
    await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 4,
      qrCode: `qr-cobro-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
  });

  afterAll(async () => {
    streams.forEach((stream) => stream.cerrar());
    if (redis) {
      await borrarSolicitudesDe(redis, [restauranteId]);
      redis.disconnect();
    }
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('La solicitud se guarda en Redis con su vencimiento y emite T17', async () => {
    const cliente = redis as ClienteRedis;
    const invitado = await invitados.entrar();
    const sesionId = Number((await unirseOk(restauranteId, NUMERO_DE_MESA, invitado.userId)).id);
    const jwtMozo = jwtVigente(mozoId, 'waiter');
    const stream = await abrirEventos(jwtMozo);
    streams.push(stream);

    const enviada = {
      userId: invitado.userId,
      userName: 'Invitado de Prueba',
      restaurantId: restauranteId,
      tableNumber: NUMERO_DE_MESA,
      tableSessionId: sesionId,
      amount: 2200,
      noTipAmount: 2000,
      method: 'Cash',
    };
    const respuesta = await pedirCobro(invitado.jwt, enviada);

    // 201 con la solicitud y un id uuid que genera la réplica (DP-79).
    exigirEstado('POST /payments/in-person-request', respuesta, 201);
    const guardada = respuesta.body as Registro;
    expect(guardada.id).toMatch(FORMA_DE_UUID_V4);
    expect(guardada).toEqual({ ...enviada, id: guardada.id });
    exigirOpenApi({ ruta: '/payments/in-person-request', metodo: 'post', codigo: 201 }, respuesta.body);

    // En Redis, la clave con ese JSON y el vencimiento de REDIS_EXPIRATION_TIME (3600 s si está vacía).
    const clave = claveDeSolicitud(restauranteId, String(guardada.id));
    expect(await leerSolicitud(cliente, restauranteId, String(guardada.id))).toEqual(guardada);
    const vencimiento = vencimientoEsperado();
    const ttl = await cliente.ttl(clave);
    expect({ ttl, enRango: ttl >= vencimiento - 5 && ttl <= vencimiento }).toEqual({ ttl, enRango: true });

    // El stream del mozo recibe T17 con la misma solicitud en data, que valida contra su esquema.
    const evento = await stream.esperar((recibido) => recibido.tipo === T17);
    expect(evento.data).toEqual(guardada);
    expect(erroresContraEsquema('EventoSolicitudDeCobro', evento.data)).toEqual([]);

    // El mozo llama T06 y la solicitud está en la respuesta.
    const t06 = await request(urlReplica())
      .get('/payments/in-person-requests')
      .set('Authorization', `Bearer ${jwtMozo}`);
    exigirEstado('T06', t06, 200);
    exigirOpenApi({ ruta: '/payments/in-person-requests', metodo: 'get', codigo: 200 }, t06.body);
    expect(t06.body as Registro[]).toContainEqual(guardada);
  });
});

describe('in-person-request · sin validar', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  let redis: ClienteRedis | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();

  beforeAll(async () => {
    conexion = await abrirConexion();
    redis = await conectarRedis();
    sembrado = new Sembrado(conexion);
    await sembrado.insertar('restaurant', { id: restauranteId, name: 'Restaurante Sin Validar de Prueba' });
  });

  afterAll(async () => {
    if (redis) {
      await borrarSolicitudesDe(redis, [restauranteId]);
      redis.disconnect();
    }
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('La solicitud se guarda sin validar, también envuelta en body', async () => {
    const cliente = redis as ClienteRedis;
    const invitado = await invitados.entrar();

    // userId "guest" y un campo que la interfaz no declara. tableSessionId es un dato sin validar, no un id que se busque.
    const sinValidar = {
      userId: 'guest',
      userName: 'Comensal Sin Cuenta de Prueba',
      restaurantId: restauranteId,
      tableNumber: 7,
      tableSessionId: 0,
      amount: 1500,
      noTipAmount: 1500,
      method: 'POS',
      campoNoDeclarado: 'valor de prueba',
    };
    const primera = await pedirCobro(invitado.jwt, sinValidar);
    exigirEstado('sin validar', primera, 201);
    exigirOpenApi({ ruta: '/payments/in-person-request', metodo: 'post', codigo: 201 }, primera.body);
    const idPrimera = String(primera.body.id);
    expect(await leerSolicitud(cliente, restauranteId, idPrimera)).toEqual({ ...sinValidar, id: idPrimera });

    // Envuelta en {body: "<JSON>"}: se guarda la de adentro, sin el envoltorio.
    const deAdentro = {
      userId: invitado.userId,
      userName: 'Invitado Envuelto de Prueba',
      restaurantId: restauranteId,
      tableNumber: 8,
      tableSessionId: 0,
      amount: 3300,
      noTipAmount: 3000,
      method: 'Cash',
    };
    const segunda = await pedirCobro(invitado.jwt, { body: JSON.stringify(deAdentro) });
    exigirEstado('envuelta en body', segunda, 201);
    exigirOpenApi({ ruta: '/payments/in-person-request', metodo: 'post', codigo: 201 }, segunda.body);
    const idSegunda = String(segunda.body.id);
    expect(await leerSolicitud(cliente, restauranteId, idSegunda)).toEqual({ ...deAdentro, id: idSegunda });
  });
});

describe('in-person-request · rechazos', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  let redis: ClienteRedis | undefined;
  const invitados = new Invitados();
  const streams: StreamDeEventos[] = [];
  const restauranteId = randomUUID();
  let mozoId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    redis = await conectarRedis();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Rechazos Cobro de Prueba' });
    mozoId = await s.insertar('user', {
      email: `mozo-rechazos-cobro-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Rechazos Cobro de Prueba',
      restaurantId: restauranteId,
    });
  });

  afterAll(async () => {
    streams.forEach((stream) => stream.cerrar());
    if (redis) {
      await borrarSolicitudesDe(redis, [restauranteId]);
      redis.disconnect();
    }
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('La solicitud sin restaurantId o sin JWT se rechaza', async () => {
    const cliente = redis as ClienteRedis;
    const invitado = await invitados.entrar();
    const stream = await abrirEventos(jwtVigente(mozoId, 'waiter'));
    streams.push(stream);
    const clavesAntes = await clavesConPrefijo(cliente, PREFIJO_DE_SOLICITUDES);

    const solicitud = {
      userId: invitado.userId,
      userName: 'Invitado Rechazado de Prueba',
      tableNumber: 1,
      tableSessionId: 0,
      amount: 1000,
      noTipAmount: 1000,
      method: 'POS',
    };
    const sinRestaurante = await pedirCobro(invitado.jwt, solicitud);
    const sinJwt = await pedirCobro(undefined, { ...solicitud, restaurantId: restauranteId });

    expect([sinRestaurante.status, sinJwt.status]).toEqual([400, 401]);

    // Ninguna clave nueva en Redis, ni del restaurante ni de ningún otro.
    expect(await clavesDeSolicitudesDe(cliente, restauranteId)).toEqual([]);
    const clavesDespues = await clavesConPrefijo(cliente, PREFIJO_DE_SOLICITUDES);
    expect(clavesDespues.filter((clave) => !clavesAntes.includes(clave))).toEqual([]);
    // Sin T17.
    expect(await stream.eventosTrasLaVentana()).toEqual([]);
  });
});
