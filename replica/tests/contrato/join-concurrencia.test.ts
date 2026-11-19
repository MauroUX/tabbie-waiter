// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber".
// Scenario: "Dos comensales que se unen a la vez quedan en una sola sesión".
// Decisiones: DP-74 (mesa libre u ocupada, sin duplicar al comensal) y design.md D9 (/join bloquea la fila de la mesa).
// Dos casos, 10 repeticiones cada uno, cada repetición sobre una mesa libre nueva sembrada por la prueba:
// dos invitados a la vez, y el mismo invitado dos veces a la vez, con Promise.all. Al final de cada repetición se borra
// lo que creó la réplica (sesiones, intermedia e invitados) y las mesas vuelven a libres.
import { randomUUID } from 'node:crypto';
import type request from 'supertest';
import { abrirConexion, consultar, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { exigirEstado, exigirOpenApi, Invitados, RUTA_JOIN_OPENAPI, unirse } from '../apoyo/comensal';
import { borrarLoQueCreoLaReplica } from '../apoyo/limpieza';

const REPETICIONES = 10;
/** Mesas 1 a 10: dos invitados a la vez; mesas 11 a 20: el mismo invitado dos veces a la vez. */
const PRIMERA_MESA_DEL_MISMO_INVITADO = REPETICIONES + 1;

interface EstadoDeLaMesa {
  isBusy: number;
  activeSessionId: number | null;
  sesionesAbiertas: number[];
}

async function leerEstado(conexion: Conexion, mesaId: number): Promise<EstadoDeLaMesa> {
  const [mesa] = await consultar<{ isBusy: number | string; activeSessionId: number | string | null }>(
    conexion,
    'SELECT isBusy, activeSessionId FROM `table` WHERE id = ?',
    [mesaId],
  );
  const abiertas = await consultar<{ id: number | string }>(
    conexion,
    'SELECT id FROM `table_session` WHERE tableId = ? AND closedAt IS NULL ORDER BY id',
    [mesaId],
  );
  return {
    isBusy: Number(mesa.isBusy),
    activeSessionId: mesa.activeSessionId === null ? null : Number(mesa.activeSessionId),
    sesionesAbiertas: abiertas.map((fila) => Number(fila.id)),
  };
}

async function usuariosDeLaSesion(conexion: Conexion, sesionId: number): Promise<number[]> {
  const filas = await consultar<{ userId: number | string }>(
    conexion,
    'SELECT userId FROM `table_session_users_user` WHERE tableSessionId = ? ORDER BY userId',
    [sesionId],
  );
  return filas.map((fila) => Number(fila.userId));
}

describe('/join · dos a la vez', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  /** id de cada mesa por su número. */
  const mesas = new Map<number, number>();

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Join a la Vez de Prueba' });
    for (let numero = 1; numero <= 2 * REPETICIONES; numero += 1) {
      mesas.set(
        numero,
        await s.insertar('table', {
          number: numero,
          seats: 4,
          qrCode: `qr-join-a-la-vez-${numero}-${randomUUID()}`,
          restaurantId: restauranteId,
          isBusy: 0,
          activeSessionId: null,
        }),
      );
    }
  });

  afterAll(async () => {
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  /** Comprueba una repetición: todas 201, una sola sesión abierta, la activa, y cada invitado una vez. */
  async function comprobar(
    caso: string,
    numero: number,
    respuestas: request.Response[],
    esperados: number[],
  ): Promise<void> {
    const base = conexion as Conexion;
    respuestas.forEach((respuesta, indice) => {
      exigirEstado(`${caso} · mesa ${numero} · llamada ${indice + 1}`, respuesta, 201);
      exigirOpenApi({ ruta: RUTA_JOIN_OPENAPI, metodo: 'post', codigo: 201 }, respuesta.body);
    });

    // Una sola table_session abierta, y la mesa activa apuntando a ella.
    const estado = await leerEstado(base, mesas.get(numero) as number);
    expect({ caso, numero, abiertas: estado.sesionesAbiertas.length }).toEqual({ caso, numero, abiertas: 1 });
    const [sesionId] = estado.sesionesAbiertas;
    expect({ caso, numero, isBusy: estado.isBusy, activeSessionId: estado.activeSessionId }).toEqual({
      caso,
      numero,
      isBusy: 1,
      activeSessionId: sesionId,
    });
    // Las llamadas responden con esa misma sesión.
    expect({ caso, numero, sesiones: respuestas.map((respuesta) => Number(respuesta.body.id)) }).toEqual({
      caso,
      numero,
      sesiones: respuestas.map(() => sesionId),
    });
    // Cada invitado una sola vez en la intermedia.
    expect({ caso, numero, usuarios: await usuariosDeLaSesion(base, sesionId) }).toEqual({
      caso,
      numero,
      usuarios: [...esperados].sort((a, b) => a - b),
    });
  }

  test('Dos comensales que se unen a la vez quedan en una sola sesión', async () => {
    const base = conexion as Conexion;

    // Caso 1: dos invitados llaman /join a la misma mesa libre al mismo tiempo.
    for (let repeticion = 1; repeticion <= REPETICIONES; repeticion += 1) {
      const numero = repeticion;
      const primero = await invitados.entrar();
      const segundo = await invitados.entrar();
      const respuestas = await Promise.all([
        unirse(restauranteId, numero, { userId: primero.userId }),
        unirse(restauranteId, numero, { userId: segundo.userId }),
      ]);
      await comprobar('dos invitados', numero, respuestas, [primero.userId, segundo.userId]);
      await borrarLoQueCreoLaReplica(base, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }

    // Caso 2: el mismo invitado llama /join dos veces a otra mesa libre al mismo tiempo.
    for (let repeticion = 1; repeticion <= REPETICIONES; repeticion += 1) {
      const numero = PRIMERA_MESA_DEL_MISMO_INVITADO + repeticion - 1;
      const invitado = await invitados.entrar();
      const respuestas = await Promise.all([
        unirse(restauranteId, numero, { userId: invitado.userId }),
        unirse(restauranteId, numero, { userId: invitado.userId }),
      ]);
      await comprobar('el mismo invitado', numero, respuestas, [invitado.userId]);
      await borrarLoQueCreoLaReplica(base, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
  });
});
