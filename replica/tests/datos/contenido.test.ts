// Change tk-02-datos-iniciales · spec datos-iniciales · requirement "La carga deja los dos restaurantes que pide el ticket"
// · scenario "Lo que deja la carga en una base recién creada".
// Origen: ticket TK-02, "Alcance", y backlog, "Requisitos de prueba". Valores: DP-66 (paymentStyle), DP-67 (umbrales),
// DP-68 (limit de las opciones), DP-69 (mercadoPagoUserId), DP-70 (tamaño) y DP-71 (claves, marcas y emails).
// Corre en la CI, contra MySQL directo, sobre la base recién cargada por el servicio `carga`.
import { abrirConexion, consultar, contarFilas } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';

const RESTAURANTE_1 = '11111111-1111-4111-8111-111111111111';
const RESTAURANTE_2 = '22222222-2222-4222-8222-222222222222';
const MARCA_DE_MENTIRA = 'FALSO-NO-ES-MERCADOPAGO-';

/** DP-67: el restaurante 1 con umbrales cortos; el 2 con los valores por defecto. */
const UMBRALES: Record<string, [number, number, number]> = {
  [RESTAURANTE_1]: [60, 120, 180],
  [RESTAURANTE_2]: [300, 420, 600],
};

/** DP-70: mesas y productos de cada restaurante. */
const MESAS: Record<string, number[]> = {
  [RESTAURANTE_1]: [1, 2, 3, 4, 5, 6, 7, 8],
  [RESTAURANTE_2]: [1, 2, 3, 4],
};
const PRODUCTOS: Record<string, number> = { [RESTAURANTE_1]: 8, [RESTAURANTE_2]: 3 };
const CATEGORIAS_DEL_RESTAURANTE_1 = ['Bebidas', 'Entradas', 'Postres', 'Principales'];

/** DP-71 y DP-36: los cinco usuarios, ordenados por email. */
const USUARIOS = [
  { email: 'waiterapp.comensal@example.com', role: 'user', isGuest: 0, restaurantId: null },
  { email: 'waiterapp.mozo1.r1@example.com', role: 'waiter', isGuest: 0, restaurantId: RESTAURANTE_1 },
  { email: 'waiterapp.mozo1.r2@example.com', role: 'waiter', isGuest: 0, restaurantId: RESTAURANTE_2 },
  { email: 'waiterapp.mozo2.r1@example.com', role: 'waiter', isGuest: 0, restaurantId: RESTAURANTE_1 },
  { email: 'waiterapp.usuario.r1@example.com', role: 'user', isGuest: 0, restaurantId: RESTAURANTE_1 },
];

const lleno = (valor: string | null): boolean => valor !== null && valor.trim() !== '';

describe('TK-02 · lo que deja la carga en una base recién creada', () => {
  let conexion: Conexion | undefined;

  beforeAll(async () => {
    conexion = await abrirConexion();
  });

  afterAll(async () => {
    await conexion?.end();
  });

  test('TK-02 · dos restaurantes, mesas, menú y cinco usuarios', async () => {
    const base = conexion as Conexion;

    // --- Restaurantes -------------------------------------------------------------------------
    const restaurantes = await consultar<{
      id: string;
      name: string | null;
      address: string | null;
      phone: string | null;
      mercadoPagoToken: string | null;
      mercadoPagoRefreshToken: string | null;
      mercadoPagoUserId: string | null;
      paymentStyle: string;
      isActive: number;
      yellowTicketSeconds: number;
      redTicketSeconds: number;
      redPulseTicketSeconds: number;
    }>(
      base,
      'SELECT id, name, address, phone, mercadoPagoToken, mercadoPagoRefreshToken, mercadoPagoUserId, paymentStyle, ' +
        'isActive, yellowTicketSeconds, redTicketSeconds, redPulseTicketSeconds FROM `restaurant` ORDER BY id',
    );
    expect(restaurantes.map(({ id }) => id)).toEqual([RESTAURANTE_1, RESTAURANTE_2]);

    for (const restaurante of restaurantes) {
      expect({
        restaurante: restaurante.id,
        nombre: lleno(restaurante.name),
        direccion: lleno(restaurante.address),
        telefono: lleno(restaurante.phone),
        tokenDeMentira: (restaurante.mercadoPagoToken ?? '').startsWith(MARCA_DE_MENTIRA),
        refreshDeMentira: (restaurante.mercadoPagoRefreshToken ?? '').startsWith(MARCA_DE_MENTIRA),
        conFormaReal: [restaurante.mercadoPagoToken, restaurante.mercadoPagoRefreshToken].some(
          (valor) => (valor ?? '').startsWith('APP_USR-') || (valor ?? '').startsWith('TEST-'),
        ),
        mercadoPagoUserId: restaurante.mercadoPagoUserId,
        paymentStyle: restaurante.paymentStyle,
        isActive: Number(restaurante.isActive),
        umbrales: [
          restaurante.yellowTicketSeconds,
          restaurante.redTicketSeconds,
          restaurante.redPulseTicketSeconds,
        ].map(Number),
      }).toEqual({
        restaurante: restaurante.id,
        nombre: true,
        direccion: true,
        telefono: true,
        tokenDeMentira: true,
        refreshDeMentira: true,
        conFormaReal: false,
        mercadoPagoUserId: null,
        paymentStyle: 'after-order',
        isActive: 1,
        umbrales: UMBRALES[restaurante.id],
      });
    }

    // Los cuatro valores de MercadoPago son distintos: entre los dos restaurantes y entre sí.
    const valoresDeCobro = restaurantes.flatMap((r) => [r.mercadoPagoToken, r.mercadoPagoRefreshToken]);
    expect(new Set(valoresDeCobro).size).toBe(4);

    // --- Mesas --------------------------------------------------------------------------------
    const mesas = await consultar<{
      id: number;
      number: number;
      seats: number;
      qrCode: string;
      restaurantId: string | null;
      activeSessionId: number | null;
      isBusy: number;
    }>(
      base,
      'SELECT id, number, seats, qrCode, restaurantId, activeSessionId, isBusy FROM `table` ORDER BY restaurantId, number',
    );
    // Toda mesa tiene restaurante: no hay mesas fuera de los dos.
    expect(mesas.filter((mesa) => mesa.restaurantId === null).map((mesa) => mesa.id)).toEqual([]);
    for (const restauranteId of [RESTAURANTE_1, RESTAURANTE_2]) {
      const numeros = mesas.filter((mesa) => mesa.restaurantId === restauranteId).map((mesa) => Number(mesa.number));
      expect({ restaurante: restauranteId, mesas: numeros }).toEqual({
        restaurante: restauranteId,
        mesas: MESAS[restauranteId],
      });
    }
    expect(mesas).toHaveLength(MESAS[RESTAURANTE_1].length + MESAS[RESTAURANTE_2].length);
    // Lugares entre 2 y 6, ninguna ocupada.
    expect(
      mesas
        .filter(
          (mesa) =>
            Number(mesa.seats) < 2 || Number(mesa.seats) > 6 || Number(mesa.isBusy) !== 0 || mesa.activeSessionId !== null,
        )
        .map((mesa) => mesa.id),
    ).toEqual([]);
    // Todos los qrCode distintos.
    expect(new Set(mesas.map((mesa) => mesa.qrCode)).size).toBe(mesas.length);

    // --- Menú ---------------------------------------------------------------------------------
    const productos = await consultar<{
      id: number;
      category: string | null;
      price: string;
      hide: number;
      deletedSince: Date | null;
      imageUrl: string | null;
      restaurantId: string | null;
    }>(
      base,
      'SELECT id, category, price, hide, deletedSince, imageUrl, restaurantId FROM `product` ORDER BY id',
    );
    expect(productos.filter((producto) => producto.restaurantId === null).map((producto) => producto.id)).toEqual([]);
    for (const restauranteId of [RESTAURANTE_1, RESTAURANTE_2]) {
      const delRestaurante = productos.filter((producto) => producto.restaurantId === restauranteId);
      expect({ restaurante: restauranteId, productos: delRestaurante.length }).toEqual({
        restaurante: restauranteId,
        productos: PRODUCTOS[restauranteId],
      });
    }
    expect(productos).toHaveLength(PRODUCTOS[RESTAURANTE_1] + PRODUCTOS[RESTAURANTE_2]);
    const categorias = [
      ...new Set(
        productos.filter((producto) => producto.restaurantId === RESTAURANTE_1).map((producto) => producto.category),
      ),
    ].sort();
    expect(categorias).toEqual(CATEGORIAS_DEL_RESTAURANTE_1);
    // Visibles, sin borrar, sin imagen y con precio mayor que cero.
    expect(
      productos
        .filter(
          (producto) =>
            Number(producto.hide) !== 0 ||
            producto.deletedSince !== null ||
            producto.imageUrl !== null ||
            !(Number(producto.price) > 0),
        )
        .map((producto) => producto.id),
    ).toEqual([]);

    // Al menos una opción "Punto de cocción" de un producto del restaurante 1 (DP-68, DP-70), con tres valores.
    const opciones = await consultar<{ id: number; type: string; limit: number; productId: number | null }>(
      base,
      'SELECT o.id AS id, o.type AS type, o.`limit` AS `limit`, o.productId AS productId ' +
        'FROM `product_option` o JOIN `product` p ON p.id = o.productId ' +
        "WHERE p.restaurantId = ? AND o.name = 'Punto de cocción' ORDER BY o.id",
      [RESTAURANTE_1],
    );
    expect(opciones.length).toBeGreaterThanOrEqual(1);
    const [opcion] = opciones;
    expect({ type: opcion.type, limit: Number(opcion.limit), conProducto: opcion.productId !== null }).toEqual({
      type: 'single-choice',
      limit: 1,
      conProducto: true,
    });
    const valores = await consultar<{ id: number; limit: number; price: string; productOptionId: number | null }>(
      base,
      'SELECT id, `limit`, price, productOptionId FROM `product_option_value` WHERE productOptionId = ? ORDER BY id',
      [opcion.id],
    );
    expect(valores).toHaveLength(3);
    for (const valor of valores) {
      expect({
        valor: valor.id,
        limit: Number(valor.limit),
        precioNoNegativo: Number(valor.price) >= 0,
        conOpcion: valor.productOptionId !== null,
      }).toEqual({ valor: valor.id, limit: 1, precioNoNegativo: true, conOpcion: true });
    }

    // --- Usuarios -----------------------------------------------------------------------------
    const usuarios = await consultar<{ email: string; role: string; isGuest: number; restaurantId: string | null }>(
      base,
      'SELECT email, role, isGuest, restaurantId FROM `user` ORDER BY email',
    );
    expect(
      usuarios.map(({ email, role, isGuest, restaurantId }) => ({
        email,
        role,
        isGuest: Number(isGuest),
        restaurantId,
      })),
    ).toEqual(USUARIOS);

    // --- Nada de lo que genera el simulador ---------------------------------------------------
    for (const tabla of ['table_session', 'order', 'payment']) {
      expect({ tabla, filas: await contarFilas(base, tabla) }).toEqual({ tabla, filas: 0 });
    }
  });
});
