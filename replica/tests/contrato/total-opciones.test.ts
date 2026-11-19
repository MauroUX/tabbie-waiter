// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato PUT /orders/:id/confirm y el evento T16".
// Scenario: "El total suma cada valor elegido de cada opción".
// Decisiones: DP-77 (cómo se recalcula table_session.total) y DP-85 (las opciones con precio distinto de 0 cuentan).
// El producto, sus dos opciones y sus valores los siembra la prueba; lo que crea la réplica se borra al final.
import { randomUUID } from 'node:crypto';
import { abrirConexion, consultar, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { confirmarOk, Invitados, pedirOk, unirseOk } from '../apoyo/comensal';
import { borrarLoQueCreoLaReplica } from '../apoyo/limpieza';

describe('confirm · el total suma las opciones', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  const NUMERO_DE_MESA = 1;
  const ids = { producto: 0, primeraOpcion: 0, primera200: 0, primera300: 0, segundaOpcion: 0, segunda200: 0, segunda300: 0 };

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Total con Opciones de Prueba' });
    await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 4,
      qrCode: `qr-total-opciones-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    // Un producto de 3000 con dos opciones; cada una, con un valor de 200 y otro de 300.
    ids.producto = await s.insertar('product', {
      name: 'Hamburguesa Total de Prueba',
      hide: 0,
      price: '3000',
      category: 'Principales de prueba',
      restaurantId: restauranteId,
    });
    ids.primeraOpcion = await s.insertar('product_option', {
      name: 'Queso de Prueba',
      type: 'single-choice',
      limit: 1,
      productId: ids.producto,
    });
    ids.primera200 = await s.insertar('product_option_value', {
      description: 'Cheddar de Prueba',
      limit: 1,
      price: '200',
      productOptionId: ids.primeraOpcion,
    });
    ids.primera300 = await s.insertar('product_option_value', {
      description: 'Azul de Prueba',
      limit: 1,
      price: '300',
      productOptionId: ids.primeraOpcion,
    });
    ids.segundaOpcion = await s.insertar('product_option', {
      name: 'Guarnición Total de Prueba',
      type: 'single-choice',
      limit: 1,
      productId: ids.producto,
    });
    ids.segunda200 = await s.insertar('product_option_value', {
      description: 'Ensalada de Prueba',
      limit: 1,
      price: '200',
      productOptionId: ids.segundaOpcion,
    });
    ids.segunda300 = await s.insertar('product_option_value', {
      description: 'Papas Total de Prueba',
      limit: 1,
      price: '300',
      productOptionId: ids.segundaOpcion,
    });
  });

  afterAll(async () => {
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('El total suma cada valor elegido de cada opción', async () => {
    const base = conexion as Conexion;
    const invitado = await invitados.entrar();
    const sesionId = Number((await unirseOk(restauranteId, NUMERO_DE_MESA, invitado.userId)).id);

    // Tres unidades, con el valor de 200 de la primera opción y el de 300 de la segunda.
    const pedido = await pedirOk(invitado.jwt, {
      tableSessionId: sesionId,
      items: [
        {
          productId: ids.producto,
          quantity: 3,
          selectedOptions: [
            { productOptionId: ids.primeraOpcion, valueIds: [ids.primera200] },
            { productOptionId: ids.segundaOpcion, valueIds: [ids.segunda300] },
          ],
        },
      ],
    });
    await confirmarOk(invitado.jwt, Number(pedido.id));

    // total = (3000 + 200 + 300) × 3 (DP-77, DP-85).
    const [sesion] = await consultar<{ total: string }>(base, 'SELECT total FROM `table_session` WHERE id = ?', [
      sesionId,
    ]);
    expect(String(sesion.total)).toBe('10500.00');
  });
});
