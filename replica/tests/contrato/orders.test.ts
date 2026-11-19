// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement "Contrato POST /orders".
// Scenarios: "POST /orders crea un pedido pending con su árbol de ítems", "POST /orders rechaza a quien no está en la sesión"
// y "POST /orders rechaza un cuerpo inválido o una sesión que no sirve".
// Decisiones: DP-75 (guards, cuerpo, respuesta y rechazos), DP-74 (/join), DP-52 (OpenAPI). Contexto, sección 4:
// un pedido pending no aparece en T05 ni cuenta en table_session.total.
import { randomUUID } from 'node:crypto';
import { abrirConexion, consultar, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { exigirEstado, Invitados, mensajeDe, mesasActivas, pedir, pedirOk, unirseOk } from '../apoyo/comensal';
import type { Registro } from '../apoyo/comensal';
import { jwtVigente } from '../apoyo/jwt';
import { borrarLoQueCreoLaReplica, idInexistente } from '../apoyo/limpieza';

async function pedidosDeSesiones(conexion: Conexion, sesiones: number[]): Promise<number[]> {
  const filas = await consultar<{ id: number | string }>(
    conexion,
    'SELECT id FROM `order` WHERE tableSessionId IN (?) ORDER BY id',
    [sesiones],
  );
  return filas.map((fila) => Number(fila.id));
}

async function pedidosDelUsuario(conexion: Conexion, userId: number): Promise<number[]> {
  const filas = await consultar<{ id: number | string }>(conexion, 'SELECT id FROM `order` WHERE userId = ? ORDER BY id', [
    userId,
  ]);
  return filas.map((fila) => Number(fila.id));
}

describe('POST /orders · el pedido nace pending', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  const NUMERO_DE_MESA = 1;
  const ids = { mozo: 0, mesa: 0, provoleta: 0, opcion: 0, valor: 0, agua: 0 };

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Pedidos de Prueba' });
    ids.mozo = await s.insertar('user', {
      email: `mozo-orders-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Pedidos de Prueba',
      restaurantId: restauranteId,
    });
    ids.mesa = await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 4,
      qrCode: `qr-orders-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    ids.provoleta = await s.insertar('product', {
      name: 'Provoleta de Prueba',
      hide: 0,
      price: '4500',
      category: 'Entradas de prueba',
      restaurantId: restauranteId,
    });
    ids.opcion = await s.insertar('product_option', {
      name: 'Punto de Prueba',
      type: 'single-choice',
      limit: 1,
      productId: ids.provoleta,
    });
    ids.valor = await s.insertar('product_option_value', {
      description: 'Bien hecha de Prueba',
      limit: 1,
      price: '0',
      productOptionId: ids.opcion,
    });
    ids.agua = await s.insertar('product', {
      name: 'Agua de Prueba',
      hide: 0,
      price: '1500',
      category: 'Bebidas de prueba',
      restaurantId: restauranteId,
    });
  });

  afterAll(async () => {
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('POST /orders crea un pedido pending con su árbol de ítems', async () => {
    const base = conexion as Conexion;
    const invitado = await invitados.entrar();
    const sesion = await unirseOk(restauranteId, NUMERO_DE_MESA, invitado.userId);
    const sesionId = Number(sesion.id);

    // Dos ítems, uno con la opción y un valor elegidos; pedirOk exige 201 y valida contra el OpenAPI.
    const pedido = await pedirOk(invitado.jwt, {
      tableSessionId: sesionId,
      items: [
        {
          productId: ids.provoleta,
          quantity: 2,
          selectedOptions: [{ productOptionId: ids.opcion, valueIds: [ids.valor] }],
        },
        { productId: ids.agua, quantity: 1 },
      ],
    });

    // En pending, con su userId y el restaurantId de la mesa, sin user (DP-75).
    expect(pedido).toMatchObject({ status: 'pending', userId: invitado.userId, restaurantId: restauranteId });
    expect(Object.prototype.hasOwnProperty.call(pedido, 'user')).toBe(false);
    const pedidoId = Number(pedido.id);

    // El árbol de ítems: el producto, la opción y el valor.
    const items = pedido.items as Registro[];
    expect(items.map((item) => [item.product.id, item.quantity]).sort((a, b) => a[0] - b[0])).toEqual(
      [
        [ids.provoleta, 2],
        [ids.agua, 1],
      ].sort((a, b) => a[0] - b[0]),
    );
    const conOpcion = items.find((item) => item.product.id === ids.provoleta) as Registro;
    expect(conOpcion.product).toMatchObject({ id: ids.provoleta, price: '4500' });
    const opciones = conOpcion.selectedOptions as Registro[];
    expect(opciones.map((opcion) => opcion.productOption.id)).toEqual([ids.opcion]);
    expect((opciones[0].values as Registro[]).map((valor) => valor.id)).toEqual([ids.valor]);

    // En la base: order, order_product_details, order_product_option y la intermedia de valores.
    const [fila] = await consultar<Record<string, unknown>>(
      base,
      'SELECT status, userId, restaurantId, tableSessionId FROM `order` WHERE id = ?',
      [pedidoId],
    );
    expect({
      status: fila.status,
      userId: Number(fila.userId),
      restaurantId: fila.restaurantId,
      tableSessionId: Number(fila.tableSessionId),
    }).toEqual({ status: 'pending', userId: invitado.userId, restaurantId: restauranteId, tableSessionId: sesionId });

    const lineas = await consultar<{ id: number | string; productId: number | string; quantity: number | string }>(
      base,
      'SELECT id, productId, quantity FROM `order_product_details` WHERE orderId = ? ORDER BY productId',
      [pedidoId],
    );
    expect(lineas.map((linea) => [Number(linea.productId), Number(linea.quantity)])).toEqual(
      [
        [ids.provoleta, 2],
        [ids.agua, 1],
      ].sort((a, b) => a[0] - b[0]),
    );
    const lineaConOpcion = lineas.find((linea) => Number(linea.productId) === ids.provoleta) as { id: number | string };
    const opcionesElegidas = await consultar<{ id: number | string; productOptionId: number | string }>(
      base,
      'SELECT id, productOptionId FROM `order_product_option` WHERE orderProductId = ?',
      [lineaConOpcion.id],
    );
    expect(opcionesElegidas.map((opcion) => Number(opcion.productOptionId))).toEqual([ids.opcion]);
    const valores = await consultar<{ productOptionValueId: number | string }>(
      base,
      'SELECT productOptionValueId FROM `order_product_option_values_product_option_value` WHERE orderProductOptionId = ?',
      [opcionesElegidas[0].id],
    );
    expect(valores.map((valor) => Number(valor.productOptionValueId))).toEqual([ids.valor]);

    // El mozo llama T05: la mesa no muestra el pedido y total sigue en "0.00".
    const [mesa] = await mesasActivas(jwtVigente(ids.mozo, 'waiter'), restauranteId);
    expect(mesa.id).toBe(ids.mesa);
    expect((mesa.activeSession.orders as Registro[]).map((orden) => orden.id)).not.toContain(pedidoId);
    expect(mesa.activeSession.total).toBe('0.00');
  });
});

describe('POST /orders · quien no está en la sesión', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  const NUMERO_DE_MESA = 1;
  let productoId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Ajeno a la Sesión de Prueba' });
    await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 2,
      qrCode: `qr-orders-ajeno-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    productoId = await s.insertar('product', {
      name: 'Agua Ajena de Prueba',
      hide: 0,
      price: '1500',
      category: 'Bebidas de prueba',
      restaurantId: restauranteId,
    });
  });

  afterAll(async () => {
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('POST /orders rechaza a quien no está en la sesión', async () => {
    const base = conexion as Conexion;
    const unido = await invitados.entrar();
    const ajeno = await invitados.entrar();
    const sesionId = Number((await unirseOk(restauranteId, NUMERO_DE_MESA, unido.userId)).id);
    const cuerpo = { tableSessionId: sesionId, items: [{ productId: productoId, quantity: 1 }] };

    const conJwtAjeno = await pedir(ajeno.jwt, cuerpo);
    const sinJwt = await pedir(undefined, cuerpo);

    expect([conJwtAjeno.status, sinJwt.status]).toEqual([403, 401]);
    // Ningún pedido.
    expect(await pedidosDeSesiones(base, [sesionId])).toEqual([]);

    // Control positivo: el comensal unido pide en la misma sesión con el mismo cuerpo (201).
    const valido = await pedir(unido.jwt, cuerpo);
    exigirEstado('POST /orders del comensal unido', valido, 201);
  });
});

describe('POST /orders · cuerpo inválido o sesión que no sirve', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  const otroRestauranteId = randomUUID();
  const NUMERO_DE_MESA = 1;
  const ids = { mesaCerrada: 0, sesionCerrada: 0, producto: 0, opcion: 0, otraOpcion: 0, valorDeOtra: 0, ajeno: 0 };

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Cuerpos Inválidos de Prueba' });
    await s.insertar('restaurant', { id: otroRestauranteId, name: 'Restaurante Ajeno de Prueba' });
    await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 2,
      qrCode: `qr-orders-invalidos-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    // Una mesa con una sesión cerrada por la prueba.
    ids.mesaCerrada = await s.insertar('table', {
      number: 2,
      seats: 2,
      qrCode: `qr-orders-cerrada-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    ids.sesionCerrada = await s.insertar('table_session', {
      tableId: ids.mesaCerrada,
      createdAt: '2026-01-01 12:00:00.000000',
      closedAt: '2026-01-01 13:00:00',
    });
    ids.producto = await s.insertar('product', {
      name: 'Bife de Prueba',
      hide: 0,
      price: '12500',
      category: 'Principales de prueba',
      restaurantId: restauranteId,
    });
    ids.opcion = await s.insertar('product_option', {
      name: 'Punto de Prueba',
      type: 'single-choice',
      limit: 1,
      productId: ids.producto,
    });
    await s.insertar('product_option_value', {
      description: 'Jugoso de Prueba',
      limit: 1,
      price: '0',
      productOptionId: ids.opcion,
    });
    // Otra opción del mismo producto: su valor no es de la primera opción.
    ids.otraOpcion = await s.insertar('product_option', {
      name: 'Guarnición de Prueba',
      type: 'single-choice',
      limit: 1,
      productId: ids.producto,
    });
    ids.valorDeOtra = await s.insertar('product_option_value', {
      description: 'Papas de Prueba',
      limit: 1,
      price: '0',
      productOptionId: ids.otraOpcion,
    });
    ids.ajeno = await s.insertar('product', {
      name: 'Producto Ajeno de Prueba',
      hide: 0,
      price: '1000',
      category: 'Ajenos de prueba',
      restaurantId: otroRestauranteId,
    });
  });

  afterAll(async () => {
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, {
        restaurantes: [restauranteId, otroRestauranteId],
        emailsDeInvitados: invitados.emails,
      });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('POST /orders rechaza un cuerpo inválido o una sesión que no sirve', async () => {
    const base = conexion as Conexion;
    const invitado = await invitados.entrar();
    const sesionId = Number((await unirseOk(restauranteId, NUMERO_DE_MESA, invitado.userId)).id);
    // En la sesión cerrada también está el invitado, para que el rechazo venga solo de que está cerrada.
    await (sembrado as Sembrado).insertarIntermedia('table_session_users_user', {
      tableSessionId: ids.sesionCerrada,
      userId: invitado.userId,
    });
    const sesionInexistente = await idInexistente(base, 'table_session');

    const casos: Array<{ caso: string; cuerpo: object; estado: number; motivo: RegExp }> = [
      { caso: 'sin ítems', cuerpo: { tableSessionId: sesionId, items: [] }, estado: 400, motivo: /items|ítems/i },
      {
        caso: 'cantidad 0',
        cuerpo: { tableSessionId: sesionId, items: [{ productId: ids.producto, quantity: 0 }] },
        estado: 400,
        motivo: /quantity|cantidad/i,
      },
      {
        caso: 'producto de otro restaurante',
        cuerpo: { tableSessionId: sesionId, items: [{ productId: ids.ajeno, quantity: 1 }] },
        estado: 400,
        motivo: /product/i,
      },
      {
        caso: 'valor que no es de la opción',
        cuerpo: {
          tableSessionId: sesionId,
          items: [
            {
              productId: ids.producto,
              quantity: 1,
              selectedOptions: [{ productOptionId: ids.opcion, valueIds: [ids.valorDeOtra] }],
            },
          ],
        },
        estado: 400,
        motivo: /valor|value/i,
      },
      {
        caso: 'sesión que no existe',
        cuerpo: { tableSessionId: sesionInexistente, items: [{ productId: ids.producto, quantity: 1 }] },
        estado: 404,
        motivo: /sesi[oó]n|session/i,
      },
      {
        caso: 'sesión cerrada',
        cuerpo: { tableSessionId: ids.sesionCerrada, items: [{ productId: ids.producto, quantity: 1 }] },
        estado: 409,
        motivo: /cerrad|closed/i,
      },
    ];

    for (const { caso, cuerpo, estado, motivo } of casos) {
      const respuesta = await pedir(invitado.jwt, cuerpo);
      expect({ caso, estado: respuesta.status }).toEqual({ caso, estado });
      // Un mensaje que nombra el motivo.
      expect({ caso, mensaje: mensajeDe(respuesta.body) }).toEqual({ caso, mensaje: expect.stringMatching(motivo) });
    }

    // Ningún pedido.
    expect(await pedidosDeSesiones(base, [sesionId, ids.sesionCerrada])).toEqual([]);
    expect(await pedidosDelUsuario(base, invitado.userId)).toEqual([]);
  });
});
