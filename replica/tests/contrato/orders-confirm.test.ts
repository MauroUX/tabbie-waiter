// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato PUT /orders/:id/confirm y el evento T16".
// Scenarios: "confirm confirma el pedido, recalcula el total y emite T16", "El mozo no confirma pedidos" y
// "confirm rechaza un pedido que no está pending, que no existe o que es de otra sesión".
// Decisiones: DP-76 (respuesta y rechazos), DP-77 (total), DP-78 (payload de T16), DP-52 y design.md D6 (OpenAPI).
// Los streams se abren con el JWT en Authorization: Bearer (0008); "no llega ningún evento" es una ventana de 1,5 s.
import { randomUUID } from 'node:crypto';
import { abrirConexion, consultar, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import {
  confirmar,
  confirmarOk,
  exigirEstado,
  Invitados,
  mesasActivas,
  pedirOk,
  unirseOk,
} from '../apoyo/comensal';
import type { Registro } from '../apoyo/comensal';
import { erroresContraEsquema } from '../apoyo/esquemas';
import { abrirEventos } from '../apoyo/eventos';
import type { StreamDeEventos } from '../apoyo/eventos';
import { jwtVigente } from '../apoyo/jwt';
import { borrarLoQueCreoLaReplica, idInexistente } from '../apoyo/limpieza';

const T16 = 'order-confirmed-notification';
/** `datetime` sin fracción, en JSON (piezas de contrato, sección 1). */
const FECHA_SIN_FRACCION = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/;

interface EstadoDelPedido {
  status: string;
  confirmedAt: string | null;
}

async function leerPedido(conexion: Conexion, pedidoId: number): Promise<EstadoDelPedido> {
  const [fila] = await consultar<{ status: string; confirmedAt: Date | null }>(
    conexion,
    'SELECT status, confirmedAt FROM `order` WHERE id = ?',
    [pedidoId],
  );
  return { status: fila.status, confirmedAt: fila.confirmedAt === null ? null : new Date(fila.confirmedAt).toISOString() };
}

async function leerTotal(conexion: Conexion, sesionId: number): Promise<string> {
  const [fila] = await consultar<{ total: string }>(conexion, 'SELECT total FROM `table_session` WHERE id = ?', [
    sesionId,
  ]);
  return String(fila.total);
}

describe('confirm · confirma, recalcula y emite T16', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const streams: StreamDeEventos[] = [];
  const restauranteId = randomUUID();
  const otroRestauranteId = randomUUID();
  const NUMERO_DE_MESA = 3;
  const ids = { mozo: 0, mozoAjeno: 0, mesa: 0, producto: 0, opcion: 0, valor: 0 };

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Confirm de Prueba' });
    await s.insertar('restaurant', { id: otroRestauranteId, name: 'Restaurante Otro Confirm de Prueba' });
    ids.mozo = await s.insertar('user', {
      email: `mozo-confirm-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Confirm de Prueba',
      restaurantId: restauranteId,
    });
    ids.mozoAjeno = await s.insertar('user', {
      email: `mozo-confirm-ajeno-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Ajeno Confirm de Prueba',
      restaurantId: otroRestauranteId,
    });
    ids.mesa = await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 4,
      qrCode: `qr-confirm-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    ids.producto = await s.insertar('product', {
      name: 'Provoleta Confirm de Prueba',
      hide: 0,
      price: '4500',
      category: 'Entradas de prueba',
      restaurantId: restauranteId,
    });
    ids.opcion = await s.insertar('product_option', {
      name: 'Punto Confirm de Prueba',
      type: 'single-choice',
      limit: 1,
      productId: ids.producto,
    });
    ids.valor = await s.insertar('product_option_value', {
      description: 'A punto de Prueba',
      limit: 1,
      price: '500',
      productOptionId: ids.opcion,
    });
  });

  afterAll(async () => {
    streams.forEach((stream) => stream.cerrar());
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, {
        restaurantes: [restauranteId, otroRestauranteId],
        emailsDeInvitados: invitados.emails,
      });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('confirm confirma el pedido, recalcula el total y emite T16', async () => {
    const base = conexion as Conexion;
    const invitado = await invitados.entrar();
    const sesionId = Number((await unirseOk(restauranteId, NUMERO_DE_MESA, invitado.userId)).id);
    // Un pedido pending de dos unidades de un producto de 4500 con un valor de opción de 500 (DP-85).
    const pendiente = await pedirOk(invitado.jwt, {
      tableSessionId: sesionId,
      items: [
        {
          productId: ids.producto,
          quantity: 2,
          selectedOptions: [{ productOptionId: ids.opcion, valueIds: [ids.valor] }],
        },
      ],
    });
    const pedidoId = Number(pendiente.id);

    // Los dos mozos, cada uno con su stream abierto.
    const delRestaurante = await abrirEventos(jwtVigente(ids.mozo, 'waiter'));
    streams.push(delRestaurante);
    const delOtro = await abrirEventos(jwtVigente(ids.mozoAjeno, 'waiter'));
    streams.push(delOtro);

    // confirmarOk exige 200 y valida contra la entrada de confirm del OpenAPI.
    const confirmado = await confirmarOk(invitado.jwt, pedidoId);
    expect(confirmado).toMatchObject({ id: pedidoId, status: 'confirmed' });
    expect(confirmado.confirmedAt).toMatch(FECHA_SIN_FRACCION);
    expect(await leerPedido(base, pedidoId)).toEqual({ status: 'confirmed', confirmedAt: confirmado.confirmedAt });

    // total = (4500 + 500) × 2 (DP-77, DP-85), y T05 muestra el pedido en la mesa.
    expect(await leerTotal(base, sesionId)).toBe('10000.00');
    const [mesa] = await mesasActivas(jwtVigente(ids.mozo, 'waiter'), restauranteId);
    expect(mesa.id).toBe(ids.mesa);
    expect(mesa.activeSession.total).toBe('10000.00');
    expect((mesa.activeSession.orders as Registro[]).map((orden) => [orden.id, orden.status])).toEqual([
      [pedidoId, 'confirmed'],
    ]);

    // El stream del restaurante recibe T16 con data.body = el JSON del pedido (DP-78).
    const evento = await delRestaurante.esperar((recibido) => recibido.tipo === T16);
    expect(erroresContraEsquema('EventoPedidoConfirmado', evento.data)).toEqual([]);
    const data = evento.data as { body: string };
    expect(typeof data.body).toBe('string');
    const cuerpo = JSON.parse(data.body) as unknown;
    expect(erroresContraEsquema('CuerpoDePedidoConfirmado', cuerpo)).toEqual([]);
    expect(cuerpo).toEqual({
      orderId: pedidoId,
      tableNumber: NUMERO_DE_MESA,
      tableSessionId: sesionId,
      restaurantId: restauranteId,
      confirmedAt: confirmado.confirmedAt,
    });

    // El stream del otro restaurante no recibe ningún evento.
    expect(await delOtro.eventosTrasLaVentana()).toEqual([]);
  });
});

describe('confirm · el mozo no confirma', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const streams: StreamDeEventos[] = [];
  const restauranteId = randomUUID();
  const NUMERO_DE_MESA = 1;
  const ids = { mozo: 0, producto: 0 };

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Mozo No Confirma de Prueba' });
    ids.mozo = await s.insertar('user', {
      email: `mozo-no-confirma-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo No Confirma de Prueba',
      restaurantId: restauranteId,
    });
    await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 2,
      qrCode: `qr-no-confirma-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    ids.producto = await s.insertar('product', {
      name: 'Agua No Confirma de Prueba',
      hide: 0,
      price: '1500',
      category: 'Bebidas de prueba',
      restaurantId: restauranteId,
    });
  });

  afterAll(async () => {
    streams.forEach((stream) => stream.cerrar());
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('El mozo no confirma pedidos', async () => {
    const base = conexion as Conexion;
    const invitado = await invitados.entrar();
    const sesionId = Number((await unirseOk(restauranteId, NUMERO_DE_MESA, invitado.userId)).id);
    const pedidoId = Number(
      (await pedirOk(invitado.jwt, { tableSessionId: sesionId, items: [{ productId: ids.producto, quantity: 1 }] })).id,
    );
    const jwtMozo = jwtVigente(ids.mozo, 'waiter');
    const stream = await abrirEventos(jwtMozo);
    streams.push(stream);

    const respuesta = await confirmar(jwtMozo, pedidoId);

    exigirEstado('confirm del mozo', respuesta, 403);
    // El pedido sigue pending y no se emite T16.
    expect(await leerPedido(base, pedidoId)).toEqual({ status: 'pending', confirmedAt: null });
    expect(await stream.eventosTrasLaVentana()).toEqual([]);
  });
});

describe('confirm · rechazos', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const streams: StreamDeEventos[] = [];
  const restauranteId = randomUUID();
  const ids = { mozo: 0, producto: 0 };

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Rechazos Confirm de Prueba' });
    ids.mozo = await s.insertar('user', {
      email: `mozo-rechazos-confirm-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Rechazos Confirm de Prueba',
      restaurantId: restauranteId,
    });
    for (const numero of [1, 2]) {
      await s.insertar('table', {
        number: numero,
        seats: 2,
        qrCode: `qr-rechazos-confirm-${numero}-${randomUUID()}`,
        restaurantId: restauranteId,
        isBusy: 0,
        activeSessionId: null,
      });
    }
    ids.producto = await s.insertar('product', {
      name: 'Agua Rechazos de Prueba',
      hide: 0,
      price: '1500',
      category: 'Bebidas de prueba',
      restaurantId: restauranteId,
    });
  });

  afterAll(async () => {
    streams.forEach((stream) => stream.cerrar());
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('confirm rechaza un pedido que no está pending, que no existe o que es de otra sesión', async () => {
    const base = conexion as Conexion;
    // El invitado, en la mesa 1, con un pedido ya confirmed.
    const invitado = await invitados.entrar();
    const sesionPropia = Number((await unirseOk(restauranteId, 1, invitado.userId)).id);
    const yaConfirmado = Number(
      (await pedirOk(invitado.jwt, { tableSessionId: sesionPropia, items: [{ productId: ids.producto, quantity: 1 }] }))
        .id,
    );
    await confirmarOk(invitado.jwt, yaConfirmado);
    // Otro comensal, en la mesa 2, con un pedido pending de una sesión a la que el invitado no se unió.
    const otro = await invitados.entrar();
    const sesionAjena = Number((await unirseOk(restauranteId, 2, otro.userId)).id);
    const deOtraSesion = Number(
      (await pedirOk(otro.jwt, { tableSessionId: sesionAjena, items: [{ productId: ids.producto, quantity: 1 }] })).id,
    );
    const inexistente = await idInexistente(base, 'order');

    const antes = {
      yaConfirmado: await leerPedido(base, yaConfirmado),
      deOtraSesion: await leerPedido(base, deOtraSesion),
      totalPropio: await leerTotal(base, sesionPropia),
      totalAjeno: await leerTotal(base, sesionAjena),
    };
    expect(antes.yaConfirmado.status).toBe('confirmed');
    expect(antes.deOtraSesion.status).toBe('pending');

    const stream = await abrirEventos(jwtVigente(ids.mozo, 'waiter'));
    streams.push(stream);

    const noPending = await confirmar(invitado.jwt, yaConfirmado);
    const noExiste = await confirmar(invitado.jwt, inexistente);
    const ajeno = await confirmar(invitado.jwt, deOtraSesion);

    expect([noPending.status, noExiste.status, ajeno.status]).toEqual([409, 404, 403]);

    // No cambia ningún pedido ni total, y no emite T16.
    expect({
      yaConfirmado: await leerPedido(base, yaConfirmado),
      deOtraSesion: await leerPedido(base, deOtraSesion),
      totalPropio: await leerTotal(base, sesionPropia),
      totalAjeno: await leerTotal(base, sesionAjena),
    }).toEqual(antes);
    expect(await stream.eventosTrasLaVentana()).toEqual([]);
  });
});
