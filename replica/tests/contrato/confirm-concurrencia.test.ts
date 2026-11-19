// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato PUT /orders/:id/confirm y el evento T16".
// Scenario: "Dos confirmaciones a la vez dejan el total completo".
// Decisiones: DP-77 (total) y design.md D9 (la confirmación bloquea la sesión: dos a la vez se ordenan).
// Cada repetición: un invitado nuevo se une a la mesa libre (sesión nueva), pide dos pedidos y los confirma a la vez
// con Promise.all. Al final de cada repetición se borra lo que creó la réplica y la mesa vuelve a libre.
import { randomUUID } from 'node:crypto';
import { abrirConexion, consultar, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { confirmar, exigirEstado, exigirOpenApi, Invitados, mesasActivas, pedirOk, unirseOk } from '../apoyo/comensal';
import type { Registro } from '../apoyo/comensal';
import { jwtVigente } from '../apoyo/jwt';
import { borrarLoQueCreoLaReplica } from '../apoyo/limpieza';

const REPETICIONES = 10;

describe('confirm · dos confirmaciones a la vez', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  const NUMERO_DE_MESA = 1;
  const ids = { mozo: 0, mesa: 0, provoleta: 0, agua: 0 };

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Confirmaciones a la Vez de Prueba' });
    ids.mozo = await s.insertar('user', {
      email: `mozo-confirm-a-la-vez-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Confirmaciones a la Vez de Prueba',
      restaurantId: restauranteId,
    });
    ids.mesa = await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 4,
      qrCode: `qr-confirm-a-la-vez-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
    ids.provoleta = await s.insertar('product', {
      name: 'Provoleta a la Vez de Prueba',
      hide: 0,
      price: '4500',
      category: 'Entradas de prueba',
      restaurantId: restauranteId,
    });
    ids.agua = await s.insertar('product', {
      name: 'Agua a la Vez de Prueba',
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

  test('Dos confirmaciones a la vez dejan el total completo', async () => {
    const base = conexion as Conexion;
    const jwtMozo = jwtVigente(ids.mozo, 'waiter');

    for (let repeticion = 1; repeticion <= REPETICIONES; repeticion += 1) {
      // Una sesión nueva: la mesa está libre al empezar cada repetición.
      const invitado = await invitados.entrar();
      const sesionId = Number((await unirseOk(restauranteId, NUMERO_DE_MESA, invitado.userId)).id);
      // Dos pedidos pending de la misma sesión, de 4500 y de 1500.
      const deProvoleta = Number(
        (await pedirOk(invitado.jwt, { tableSessionId: sesionId, items: [{ productId: ids.provoleta, quantity: 1 }] }))
          .id,
      );
      const deAgua = Number(
        (await pedirOk(invitado.jwt, { tableSessionId: sesionId, items: [{ productId: ids.agua, quantity: 1 }] })).id,
      );

      // Las dos confirmaciones al mismo tiempo.
      const [primera, segunda] = await Promise.all([
        confirmar(invitado.jwt, deProvoleta),
        confirmar(invitado.jwt, deAgua),
      ]);

      // Las dos responden 200 (validan contra la entrada de confirm del OpenAPI).
      exigirEstado(`repetición ${repeticion} · confirm de ${deProvoleta}`, primera, 200);
      exigirEstado(`repetición ${repeticion} · confirm de ${deAgua}`, segunda, 200);
      exigirOpenApi({ ruta: '/orders/{id}/confirm', metodo: 'put', codigo: 200 }, primera.body);
      exigirOpenApi({ ruta: '/orders/{id}/confirm', metodo: 'put', codigo: 200 }, segunda.body);

      // La sesión queda con total "6000.00" = 4500 + 1500 (DP-77), en la base y en T05.
      const [sesion] = await consultar<{ total: string }>(base, 'SELECT total FROM `table_session` WHERE id = ?', [
        sesionId,
      ]);
      expect({ repeticion, total: String(sesion.total) }).toEqual({ repeticion, total: '6000.00' });
      const mesa = (await mesasActivas(jwtMozo, restauranteId)).find((fila: Registro) => fila.id === ids.mesa);
      expect({ repeticion, total: mesa?.activeSession?.total }).toEqual({ repeticion, total: '6000.00' });

      // Limpieza de la repetición: pedidos, sesión, intermedia e invitados; la mesa vuelve a libre.
      await borrarLoQueCreoLaReplica(base, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
  });
});
