// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber".
// Scenario: "/join rechaza a quien no es un comensal".
// Decisiones: DP-83 (/join acepta solo un userId con rol user y sin restaurante; con otro, 403 sin tocar la mesa) y
// DP-74. El restaurante lleva credenciales de cobro de mentira, reconocibles como tales (PR-2, PR-3), para comprobar
// que la respuesta no las trae.
import { randomUUID } from 'node:crypto';
import { abrirConexion, consultar, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { exigirEstado, Invitados, mensajeDe, unirse } from '../apoyo/comensal';
import { borrarLoQueCreoLaReplica } from '../apoyo/limpieza';

const MP_TOKEN_DE_MENTIRA = 'TEST-TOKEN-DE-MENTIRA-JOIN';
const MP_REFRESH_DE_MENTIRA = 'TEST-REFRESH-DE-MENTIRA-JOIN';
const NOMBRE_DEL_RESTAURANTE = 'Restaurante Solo Comensales de Prueba';

async function leerMesa(conexion: Conexion, mesaId: number): Promise<{ isBusy: number; activeSessionId: number | null }> {
  const [mesa] = await consultar<{ isBusy: number | string; activeSessionId: number | string | null }>(
    conexion,
    'SELECT isBusy, activeSessionId FROM `table` WHERE id = ?',
    [mesaId],
  );
  return {
    isBusy: Number(mesa.isBusy),
    activeSessionId: mesa.activeSessionId === null ? null : Number(mesa.activeSessionId),
  };
}

async function sesionesDeLaMesa(conexion: Conexion, mesaId: number): Promise<number[]> {
  const filas = await consultar<{ id: number | string }>(conexion, 'SELECT id FROM `table_session` WHERE tableId = ?', [
    mesaId,
  ]);
  return filas.map((fila) => Number(fila.id));
}

describe('/join · solo comensales', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  const NUMERO_DE_MESA = 1;
  const emailMozo = `mozo-solo-comensales-${randomUUID()}@example.com`;
  const emailConRestaurante = `usuario-con-restaurante-${randomUUID()}@example.com`;
  const ids = { mesa: 0, mozo: 0, conRestaurante: 0 };

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', {
      id: restauranteId,
      name: NOMBRE_DEL_RESTAURANTE,
      mercadoPagoToken: MP_TOKEN_DE_MENTIRA,
      mercadoPagoRefreshToken: MP_REFRESH_DE_MENTIRA,
    });
    ids.mozo = await s.insertar('user', {
      email: emailMozo,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Solo Comensales de Prueba',
      restaurantId: restauranteId,
    });
    ids.conRestaurante = await s.insertar('user', {
      email: emailConRestaurante,
      role: 'user',
      isGuest: 0,
      name: 'Usuario Con Restaurante de Prueba',
      restaurantId: restauranteId,
    });
    ids.mesa = await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 2,
      qrCode: `qr-solo-comensales-${randomUUID()}`,
      restaurantId: restauranteId,
      isBusy: 0,
      activeSessionId: null,
    });
  });

  afterAll(async () => {
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('/join rechaza a quien no es un comensal', async () => {
    const base = conexion as Conexion;

    // Sin Authorization, con el userId del mozo y con el del usuario con restaurante.
    const delMozo = await unirse(restauranteId, NUMERO_DE_MESA, { userId: ids.mozo });
    const delConRestaurante = await unirse(restauranteId, NUMERO_DE_MESA, { userId: ids.conRestaurante });

    expect([delMozo.status, delConRestaurante.status]).toEqual([403, 403]);

    const casos = [
      { caso: 'mozo', respuesta: delMozo, email: emailMozo },
      { caso: 'usuario con restaurante', respuesta: delConRestaurante, email: emailConRestaurante },
    ];
    for (const { caso, respuesta, email } of casos) {
      // Un mensaje que dice que solo se unen comensales.
      expect({ caso, mensaje: mensajeDe(respuesta.body) }).toEqual({
        caso,
        mensaje: expect.stringMatching(/comensal/i),
      });
      // Sin email ni restaurante en la respuesta.
      const cuerpo = (respuesta.body ?? {}) as Record<string, unknown>;
      expect({ caso, claves: ['email', 'restaurant', 'users'].filter((clave) => clave in cuerpo) }).toEqual({
        caso,
        claves: [],
      });
      const texto = respuesta.text ?? '';
      expect({
        caso,
        filtrado: [email, NOMBRE_DEL_RESTAURANTE, MP_TOKEN_DE_MENTIRA, MP_REFRESH_DE_MENTIRA].filter((dato) =>
          texto.includes(dato),
        ),
      }).toEqual({ caso, filtrado: [] });
    }

    // Ninguna table_session, y la mesa sin cambios.
    expect(await sesionesDeLaMesa(base, ids.mesa)).toEqual([]);
    expect(await leerMesa(base, ids.mesa)).toEqual({ isBusy: 0, activeSessionId: null });

    // Control positivo: un invitado de /auth/guest se une a la misma mesa (201).
    const invitado = await invitados.entrar();
    const valido = await unirse(restauranteId, NUMERO_DE_MESA, { userId: invitado.userId });
    exigirEstado('/join de un invitado', valido, 201);
  });
});
