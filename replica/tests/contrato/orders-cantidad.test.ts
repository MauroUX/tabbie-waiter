// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement "Contrato POST /orders".
// Scenario: "POST /orders rechaza una cantidad fuera del rango de la columna".
// Decisiones: DP-87 (la cantidad es un entero entre 1 y 2147483647, el rango de la columna int; fuera, 400) y DP-75.
import { randomUUID } from 'node:crypto';
import { abrirConexion, consultar, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { Invitados, mensajeDe, pedir, pedirOk, unirseOk } from '../apoyo/comensal';
import type { Registro } from '../apoyo/comensal';
import { borrarLoQueCreoLaReplica } from '../apoyo/limpieza';

/** El máximo de un `int` con signo de MySQL. */
const MAXIMO_DE_LA_COLUMNA = 2147483647;

async function pedidosDeLaSesion(conexion: Conexion, sesionId: number): Promise<number[]> {
  const filas = await consultar<{ id: number | string }>(
    conexion,
    'SELECT id FROM `order` WHERE tableSessionId = ? ORDER BY id',
    [sesionId],
  );
  return filas.map((fila) => Number(fila.id));
}

describe('POST /orders · cantidad fuera del rango de la columna', () => {
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
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Cantidades de Prueba' });
    await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 2,
      qrCode: `qr-orders-cantidad-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    productoId = await s.insertar('product', {
      name: 'Agua Cantidades de Prueba',
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

  test('POST /orders rechaza una cantidad fuera del rango de la columna', async () => {
    const base = conexion as Conexion;
    const invitado = await invitados.entrar();
    const sesionId = Number((await unirseOk(restauranteId, NUMERO_DE_MESA, invitado.userId)).id);

    // 2147483648: 400 con un mensaje que nombra la cantidad, y ningún pedido.
    const fueraDeRango = await pedir(invitado.jwt, {
      tableSessionId: sesionId,
      items: [{ productId: productoId, quantity: MAXIMO_DE_LA_COLUMNA + 1 }],
    });
    expect(fueraDeRango.status).toBe(400);
    expect(mensajeDe(fueraDeRango.body)).toMatch(/quantity|cantidad/i);
    expect(await pedidosDeLaSesion(base, sesionId)).toEqual([]);

    // 2147483647: 201 (pedirOk valida contra la entrada de POST /orders del OpenAPI).
    const enElBorde = await pedirOk(invitado.jwt, {
      tableSessionId: sesionId,
      items: [{ productId: productoId, quantity: MAXIMO_DE_LA_COLUMNA }],
    });
    expect((enElBorde.items as Registro[]).map((item) => Number(item.quantity))).toEqual([MAXIMO_DE_LA_COLUMNA]);
  });
});
