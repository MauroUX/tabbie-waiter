// Change tk-01-replica-base · spec contrato-replica · requirement "Contrato T05 · GET /restaurants/:id/tables/active".
// Scenarios: "T05 devuelve las mesas ocupadas del restaurante del mozo", "T05 trae los campos de O4 a propósito",
// "T05 rechaza otro restaurante", "T05 rechaza un rol que no está en @Roles" y "T05 sin mesas ocupadas".
// Decisiones: DP-60 (forma del JSON), DP-61 (403), DP-50 (O4 a propósito), DP-52 (OpenAPI y x-sensitive).
// Mesa ocupada: isBusy = 1 y activeSessionId apuntando a una table_session con closedAt nulo.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { abrirConexion, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { urlReplica } from '../apoyo/entorno';
import { jwtVigente } from '../apoyo/jwt';
import { erroresContraOpenApi, marcasSensibles } from '../apoyo/openapi';

// Credenciales de cobro de mentira, reconocibles como tales (PR-2, PR-3).
const MP_TOKEN_DE_MENTIRA = 'TEST-TOKEN-DE-MENTIRA';
const MP_REFRESH_DE_MENTIRA = 'TEST-REFRESH-DE-MENTIRA';
const MP_USER_ID_DE_MENTIRA = '123456789012';

const rutaMesas = (restauranteId: string): string => `/restaurants/${restauranteId}/tables/active`;

/** Los objetos de la respuesta se leen como registros sueltos: la forma la fija DP-60. */
type Registro = Record<string, any>;

describe('T05 · mesas ocupadas del restaurante del mozo', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;

  const restauranteId = randomUUID();
  const emailMozo = `mozo-t05-${randomUUID()}@example.com`;
  const emailComensal = `comensal-t05-${randomUUID()}@example.com`;
  const qrMesaOcupada = `qr-t05-ocupada-${randomUUID()}`;
  const ids = {
    mozo: 0,
    comensal: 0,
    mesaLibre: 0,
    mesaOcupada: 0,
    sesion: 0,
    producto: 0,
    opcion: 0,
    valor: 0,
    pedidoPendiente: 0,
    pedidoConfirmado: 0,
    pedidoEnCocina: 0,
    pedidoCancelado: 0,
  };

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;

    await s.insertar('restaurant', {
      id: restauranteId,
      name: 'Restaurante Mesas de Prueba',
      mercadoPagoToken: MP_TOKEN_DE_MENTIRA,
      mercadoPagoRefreshToken: MP_REFRESH_DE_MENTIRA,
      mercadoPagoUserId: MP_USER_ID_DE_MENTIRA,
      yellowTicketSeconds: 120,
      redTicketSeconds: 240,
      redPulseTicketSeconds: 480,
    });
    ids.mozo = await s.insertar('user', {
      email: emailMozo,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo de Prueba',
      restaurantId: restauranteId,
    });
    // Un usuario de la sesión que tiene restaurante (O4).
    ids.comensal = await s.insertar('user', {
      email: emailComensal,
      role: 'user',
      isGuest: 0,
      name: 'Comensal de Prueba',
      restaurantId: restauranteId,
    });

    ids.mesaLibre = await s.insertar('table', {
      number: 1,
      seats: 2,
      qrCode: `qr-t05-libre-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    ids.mesaOcupada = await s.insertar('table', {
      number: 2,
      seats: 4,
      qrCode: qrMesaOcupada,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    ids.sesion = await s.insertar('table_session', {
      tableId: ids.mesaOcupada,
      amountPaid: '100.00',
      tips: '10.00',
      total: '1250.00',
      requestingHelp: 0,
      createdAt: '2026-01-01 12:00:00.000000',
      closedAt: null,
    });
    await s.actualizar('table', ids.mesaOcupada, { isBusy: 1, activeSessionId: ids.sesion });
    await s.insertarIntermedia('table_session_users_user', { tableSessionId: ids.sesion, userId: ids.comensal });

    ids.producto = await s.insertar('product', {
      name: 'Milanesa de Prueba',
      hide: 0,
      price: '1200',
      category: 'Platos de prueba',
      restaurantId: restauranteId,
    });
    ids.opcion = await s.insertar('product_option', {
      name: 'Guarnición de Prueba',
      type: 'single-choice',
      limit: 1,
      productId: ids.producto,
    });
    ids.valor = await s.insertar('product_option_value', {
      description: 'Papas de Prueba',
      limit: 1,
      price: '50',
      productOptionId: ids.opcion,
    });

    // Los pedidos se insertan fuera del orden de createdAt, para ver el orden ascendente de la respuesta.
    const pedido = async (estado: string, creado: string, fechas: Record<string, string | null>): Promise<number> => {
      const pedidoId = await s.insertar('order', {
        tableSessionId: ids.sesion,
        userId: ids.comensal,
        restaurantId: restauranteId,
        type: 'main_course',
        status: estado,
        createdAt: creado,
        ...fechas,
      });
      const lineaId = await s.insertar('order_product_details', {
        orderId: pedidoId,
        productId: ids.producto,
        quantity: 1,
        quantityPaid: 0,
      });
      const opcionElegidaId = await s.insertar('order_product_option', {
        orderProductId: lineaId,
        productOptionId: ids.opcion,
      });
      await s.insertarIntermedia('order_product_option_values_product_option_value', {
        orderProductOptionId: opcionElegidaId,
        productOptionValueId: ids.valor,
      });
      return pedidoId;
    };
    ids.pedidoCancelado = await pedido('canceled', '2026-01-01 12:15:00.000000', {
      confirmedAt: '2026-01-01 12:16:00',
      canceledAt: '2026-01-01 12:17:00',
      cancellationReason: 'Cancelada por el restaurante',
    });
    ids.pedidoPendiente = await pedido('pending', '2026-01-01 12:20:00.000000', {});
    ids.pedidoConfirmado = await pedido('confirmed', '2026-01-01 12:05:00.000000', {
      confirmedAt: '2026-01-01 12:06:00',
    });
    ids.pedidoEnCocina = await pedido('in_kitchen', '2026-01-01 12:10:00.000000', {
      confirmedAt: '2026-01-01 12:11:00',
      sentToKitchenAt: '2026-01-01 12:12:00',
    });
  });

  afterAll(async () => {
    await sembrado?.deshacer();
    await conexion?.end();
  });

  const pedirMesas = (): request.Test =>
    request(urlReplica())
      .get(rutaMesas(restauranteId))
      .set('Authorization', `Bearer ${jwtVigente(ids.mozo, 'waiter')}`);

  test('T05 · devuelve las mesas ocupadas del restaurante del mozo', async () => {
    const respuesta = await pedirMesas();

    expect(respuesta.status).toBe(200);
    const mesas = respuesta.body as Registro[];
    expect(Array.isArray(mesas)).toBe(true);

    // Solo la mesa ocupada, con sus columnas.
    expect(mesas.map((mesa) => mesa.id)).toEqual([ids.mesaOcupada]);
    const [mesa] = mesas;
    expect(mesa).toMatchObject({
      id: ids.mesaOcupada,
      number: 2,
      seats: 4,
      qrCode: qrMesaOcupada,
      isBusy: true,
      activeSessionId: ids.sesion,
    });

    // El restaurante de la mesa, con sus umbrales.
    expect(mesa.restaurant).toMatchObject({
      id: restauranteId,
      name: 'Restaurante Mesas de Prueba',
      yellowTicketSeconds: 120,
      redTicketSeconds: 240,
      redPulseTicketSeconds: 480,
      mercadoPagoUserId: MP_USER_ID_DE_MENTIRA,
    });

    // La sesión activa con sus columnas; los decimal llegan como string y las fechas en UTC.
    expect(mesa.activeSession).toMatchObject({
      id: ids.sesion,
      createdAt: '2026-01-01T12:00:00.000Z',
      closedAt: null,
      total: '1250.00',
      amountPaid: '100.00',
      tips: '10.00',
      requestingHelp: false,
    });

    // Sus usuarios, cada uno con su restaurante.
    const usuarios = mesa.activeSession.users as Registro[];
    expect(usuarios.map((usuario) => usuario.id)).toEqual([ids.comensal]);
    expect(usuarios[0].restaurant).toMatchObject({ id: restauranteId });

    // Sus pedidos: confirmed, in_kitchen y canceled por createdAt ascendente, sin el pending.
    const pedidos = mesa.activeSession.orders as Registro[];
    expect(pedidos.map((pedido) => [pedido.id, pedido.status])).toEqual([
      [ids.pedidoConfirmado, 'confirmed'],
      [ids.pedidoEnCocina, 'in_kitchen'],
      [ids.pedidoCancelado, 'canceled'],
    ]);

    // Cada pedido con su usuario (con restaurante) y su árbol de ítems.
    for (const pedido of pedidos) {
      expect(pedido.user).toMatchObject({ id: ids.comensal, restaurant: { id: restauranteId } });
      const items = pedido.items as Registro[];
      expect(items).toHaveLength(1);
      expect(items[0].product).toMatchObject({ id: ids.producto, price: '1200' });
      const opciones = items[0].selectedOptions as Registro[];
      expect(opciones).toHaveLength(1);
      expect(opciones[0].productOption).toMatchObject({ id: ids.opcion });
      const valores = opciones[0].values as Registro[];
      expect(valores).toHaveLength(1);
      expect(valores[0]).toMatchObject({ id: ids.valor, price: '50' });
    }

    // Valida contra la entrada de T05 en docs/api/openapi.yaml.
    expect(
      erroresContraOpenApi({ ruta: '/restaurants/{id}/tables/active', metodo: 'get', codigo: 200 }, respuesta.body),
    ).toEqual([]);
  });

  test('T05 · trae los campos de O4 a propósito (DP-50)', async () => {
    const respuesta = await pedirMesas();

    expect(respuesta.status).toBe(200);
    const [mesa] = respuesta.body as Registro[];
    const camposDeCobro = {
      mercadoPagoToken: MP_TOKEN_DE_MENTIRA,
      mercadoPagoRefreshToken: MP_REFRESH_DE_MENTIRA,
    };

    // El restaurante de la mesa.
    expect(mesa.restaurant).toMatchObject(camposDeCobro);

    // El restaurante del usuario de la sesión que tiene restaurante, y su email.
    const [usuario] = mesa.activeSession.users as Registro[];
    expect(usuario).toMatchObject({ email: emailComensal, restaurant: camposDeCobro });

    // Los usuarios de los pedidos, con su email y su restaurante completo.
    for (const pedido of mesa.activeSession.orders as Registro[]) {
      expect(pedido.user).toMatchObject({ email: emailComensal, restaurant: camposDeCobro });
    }

    // En docs/api/openapi.yaml esos campos llevan x-sensitive: true.
    const marcas = marcasSensibles(['mercadoPagoToken', 'mercadoPagoRefreshToken', 'email']);
    for (const [nombre, lista] of marcas) {
      expect({ nombre, apariciones: lista.length > 0 }).toEqual({ nombre, apariciones: true });
      expect({ nombre, marcas: lista }).toEqual({ nombre, marcas: lista.map(() => true) });
    }
  });
});

describe('T05 · otro restaurante', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;

  const restauranteA = randomUUID();
  const restauranteB = randomUUID();
  const qrMesaDeB = `qr-t05-de-b-${randomUUID()}`;
  let mozoDeA = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;

    await s.insertar('restaurant', { id: restauranteA, name: 'Restaurante A de Prueba' });
    await s.insertar('restaurant', { id: restauranteB, name: 'Restaurante B de Prueba' });
    mozoDeA = await s.insertar('user', {
      email: `mozo-a-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo A de Prueba',
      restaurantId: restauranteA,
    });
    // B tiene una mesa ocupada, para ver que no llega ningún dato suyo.
    const mesaDeB = await s.insertar('table', {
      number: 1,
      seats: 2,
      qrCode: qrMesaDeB,
      restaurantId: restauranteB,
      isBusy: 0,
      activeSessionId: null,
    });
    const sesionDeB = await s.insertar('table_session', {
      tableId: mesaDeB,
      createdAt: '2026-01-01 12:00:00.000000',
    });
    await s.actualizar('table', mesaDeB, { isBusy: 1, activeSessionId: sesionDeB });
  });

  afterAll(async () => {
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('T05 · rechaza otro restaurante con 403', async () => {
    const jwt = jwtVigente(mozoDeA, 'waiter');

    // Control positivo: el mismo mozo, en su restaurante, pasa.
    const propio = await request(urlReplica()).get(rutaMesas(restauranteA)).set('Authorization', `Bearer ${jwt}`);
    expect(propio.status).toBe(200);

    const ajeno = await request(urlReplica()).get(rutaMesas(restauranteB)).set('Authorization', `Bearer ${jwt}`);
    expect(ajeno.status).toBe(403);

    // Sin datos de B.
    expect(Array.isArray(ajeno.body)).toBe(false);
    expect(ajeno.text).not.toContain(qrMesaDeB);
  });
});

describe('T05 · rol fuera de @Roles', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;

  const restauranteId = randomUUID();
  let usuarioId = 0;
  let mozoId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;

    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Roles de Prueba' });
    // Con el mismo restaurante, para que el rechazo venga solo del rol.
    usuarioId = await s.insertar('user', {
      email: `usuario-rol-${randomUUID()}@example.com`,
      role: 'user',
      isGuest: 0,
      name: 'Usuario Rol de Prueba',
      restaurantId: restauranteId,
    });
    mozoId = await s.insertar('user', {
      email: `mozo-rol-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Rol de Prueba',
      restaurantId: restauranteId,
    });
  });

  afterAll(async () => {
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('T05 · rechaza un rol que no está en @Roles con 403', async () => {
    // Control positivo: un mozo del mismo restaurante pasa.
    const mozo = await request(urlReplica())
      .get(rutaMesas(restauranteId))
      .set('Authorization', `Bearer ${jwtVigente(mozoId, 'waiter')}`);
    expect(mozo.status).toBe(200);

    const usuario = await request(urlReplica())
      .get(rutaMesas(restauranteId))
      .set('Authorization', `Bearer ${jwtVigente(usuarioId, 'user')}`);
    expect(usuario.status).toBe(403);
  });
});

describe('T05 · sin mesas ocupadas', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;

  const restauranteId = randomUUID();
  let mozoId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;

    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Vacío de Prueba' });
    mozoId = await s.insertar('user', {
      email: `mozo-vacio-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Vacío de Prueba',
      restaurantId: restauranteId,
    });
    // Una mesa libre: el restaurante tiene mesas, pero ninguna ocupada.
    await s.insertar('table', {
      number: 1,
      seats: 2,
      qrCode: `qr-t05-vacio-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
  });

  afterAll(async () => {
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('T05 · sin mesas ocupadas devuelve []', async () => {
    const respuesta = await request(urlReplica())
      .get(rutaMesas(restauranteId))
      .set('Authorization', `Bearer ${jwtVigente(mozoId, 'waiter')}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([]);
  });
});
