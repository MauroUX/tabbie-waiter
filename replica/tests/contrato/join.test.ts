// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber".
// Scenarios: "Riesgo técnico · un invitado se une a una mesa libre y la mesa aparece en T05" (primero, design.md D5),
// "Un segundo comensal se suma a la misma sesión" y "/join rechaza una mesa, un restaurante o un comensal que no existen".
// Decisiones: DP-72 y DP-73 (el invitado de /auth/guest), DP-74 (/join), DP-52 (OpenAPI).
// Cada describe siembra su restaurante, su mesa y su mozo, y borra al final lo que crearon la réplica y la prueba.
import { randomUUID } from 'node:crypto';
import { abrirConexion, consultar, idDeUsuarioInexistente, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { exigirEstado, Invitados, mensajeDe, mesasActivas, unirse, unirseOk } from '../apoyo/comensal';
import type { Registro } from '../apoyo/comensal';
import { jwtVigente } from '../apoyo/jwt';
import { borrarLoQueCreoLaReplica } from '../apoyo/limpieza';

interface FilaDeMesa extends Record<string, unknown> {
  isBusy: number | string;
  activeSessionId: number | string | null;
}

async function leerMesa(conexion: Conexion, mesaId: number): Promise<{ isBusy: number; activeSessionId: number | null }> {
  const [mesa] = await consultar<FilaDeMesa>(conexion, 'SELECT isBusy, activeSessionId FROM `table` WHERE id = ?', [
    mesaId,
  ]);
  return {
    isBusy: Number(mesa.isBusy),
    activeSessionId: mesa.activeSessionId === null ? null : Number(mesa.activeSessionId),
  };
}

async function sesionesDeLaMesa(conexion: Conexion, mesaId: number): Promise<Array<{ id: number; closedAt: unknown }>> {
  const filas = await consultar<{ id: number | string; closedAt: unknown }>(
    conexion,
    'SELECT id, closedAt FROM `table_session` WHERE tableId = ? ORDER BY id',
    [mesaId],
  );
  return filas.map((fila) => ({ id: Number(fila.id), closedAt: fila.closedAt }));
}

describe('/join · riesgo técnico del skeleton', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  const NUMERO_DE_MESA = 1;
  let mozoId = 0;
  let mesaId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Join de Prueba' });
    mozoId = await s.insertar('user', {
      email: `mozo-join-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Join de Prueba',
      restaurantId: restauranteId,
    });
    mesaId = await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 4,
      qrCode: `qr-join-${randomUUID()}`,
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

  test('Riesgo técnico · un invitado se une a una mesa libre y la mesa aparece en T05', async () => {
    const base = conexion as Conexion;
    const invitado = await invitados.entrar();

    // Sin Authorization, con {userId} en el body; unirseOk exige 201 y valida contra la entrada de /join del OpenAPI.
    const sesion = await unirseOk(restauranteId, NUMERO_DE_MESA, invitado.userId);

    // La sesión, con sus columnas y users[] con el invitado (DP-74).
    for (const columna of ['id', 'tableId', 'amountPaid', 'tips', 'total', 'requestingHelp', 'createdAt', 'closedAt']) {
      expect({ columna, presente: Object.prototype.hasOwnProperty.call(sesion, columna) }).toEqual({
        columna,
        presente: true,
      });
    }
    expect(sesion).toMatchObject({ tableId: mesaId, closedAt: null });
    const sesionId = Number(sesion.id);
    expect((sesion.users as Registro[]).map((usuario) => usuario.id)).toEqual([invitado.userId]);

    // La mesa queda activa: isBusy y activeSessionId apuntando a esa sesión, con closedAt nulo.
    expect(await leerMesa(base, mesaId)).toEqual({ isBusy: 1, activeSessionId: sesionId });
    expect(await sesionesDeLaMesa(base, mesaId)).toEqual([{ id: sesionId, closedAt: null }]);

    // El mozo llama T05 y la mesa aparece con esa sesión activa y el invitado en users[].
    const mesas = await mesasActivas(jwtVigente(mozoId, 'waiter'), restauranteId);
    expect(mesas.map((mesa) => mesa.id)).toEqual([mesaId]);
    const [mesa] = mesas;
    expect(mesa).toMatchObject({ isBusy: true, activeSessionId: sesionId });
    expect(mesa.activeSession).toMatchObject({ id: sesionId, closedAt: null });
    expect((mesa.activeSession.users as Registro[]).map((usuario) => usuario.id)).toEqual([invitado.userId]);
  });
});

describe('/join · un segundo comensal', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  const NUMERO_DE_MESA = 1;
  let mesaId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Dos Comensales de Prueba' });
    mesaId = await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 4,
      qrCode: `qr-join-dos-${randomUUID()}`,
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

  test('Un segundo comensal se suma a la misma sesión', async () => {
    const base = conexion as Conexion;
    const primero = await invitados.entrar();
    const segundo = await invitados.entrar();

    // La mesa ocupada: el primero ya está unido.
    const inicial = await unirseOk(restauranteId, NUMERO_DE_MESA, primero.userId);
    const sesionId = Number(inicial.id);

    // El segundo se une, y el primero vuelve a unirse: 201 las dos veces con la misma sesión.
    const delSegundo = await unirseOk(restauranteId, NUMERO_DE_MESA, segundo.userId);
    const delPrimeroOtraVez = await unirseOk(restauranteId, NUMERO_DE_MESA, primero.userId);
    expect([Number(delSegundo.id), Number(delPrimeroOtraVez.id)]).toEqual([sesionId, sesionId]);

    // users[] trae a los dos, una sola vez cada uno.
    const ordenados = (sesion: Registro): number[] =>
      (sesion.users as Registro[]).map((usuario) => Number(usuario.id)).sort((a, b) => a - b);
    const esperados = [primero.userId, segundo.userId].sort((a, b) => a - b);
    expect(ordenados(delSegundo)).toEqual(esperados);
    expect(ordenados(delPrimeroOtraVez)).toEqual(esperados);

    // Sin abrir otra sesión: una sola en la mesa, la activa, y dos filas en la intermedia.
    expect(await sesionesDeLaMesa(base, mesaId)).toEqual([{ id: sesionId, closedAt: null }]);
    expect(await leerMesa(base, mesaId)).toEqual({ isBusy: 1, activeSessionId: sesionId });
    const intermedia = await consultar<{ userId: number | string }>(
      base,
      'SELECT userId FROM `table_session_users_user` WHERE tableSessionId = ? ORDER BY userId',
      [sesionId],
    );
    expect(intermedia.map((fila) => Number(fila.userId))).toEqual(esperados);
  });
});

describe('/join · rechazos', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();
  const NUMERO_DE_MESA = 1;
  let mesaId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    const s = new Sembrado(conexion);
    sembrado = s;
    await s.insertar('restaurant', { id: restauranteId, name: 'Restaurante Rechazos Join de Prueba' });
    mesaId = await s.insertar('table', {
      number: NUMERO_DE_MESA,
      seats: 2,
      qrCode: `qr-join-rechazos-${randomUUID()}`,
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

  test('/join rechaza una mesa, un restaurante o un comensal que no existen', async () => {
    const base = conexion as Conexion;
    const invitado = await invitados.entrar();

    // Lo que no existe, comprobado antes en la base.
    const numeroInexistente = 999;
    const [mesas] = await consultar<{ cantidad: number | string }>(
      base,
      'SELECT COUNT(*) AS cantidad FROM `table` WHERE restaurantId = ? AND number = ?',
      [restauranteId, numeroInexistente],
    );
    expect(Number(mesas.cantidad)).toBe(0);
    const restauranteInexistente = randomUUID();
    const [restaurantes] = await consultar<{ cantidad: number | string }>(
      base,
      'SELECT COUNT(*) AS cantidad FROM `restaurant` WHERE id = ?',
      [restauranteInexistente],
    );
    expect(Number(restaurantes.cantidad)).toBe(0);
    const usuarioInexistente = await idDeUsuarioInexistente(base);

    const sinMesa = await unirse(restauranteId, numeroInexistente, { userId: invitado.userId });
    const sinRestaurante = await unirse(restauranteInexistente, NUMERO_DE_MESA, { userId: invitado.userId });
    const sinUsuario = await unirse(restauranteId, NUMERO_DE_MESA, { userId: usuarioInexistente });
    const sinUserId = await unirse(restauranteId, NUMERO_DE_MESA, {});

    expect([sinMesa.status, sinRestaurante.status, sinUsuario.status, sinUserId.status]).toEqual([404, 404, 404, 400]);

    // Cada mensaje nombra lo que falta (en español o en inglés), y no es el 404 de una ruta que no existe.
    const mensajes = {
      mesa: mensajeDe(sinMesa.body),
      restaurante: mensajeDe(sinRestaurante.body),
      usuario: mensajeDe(sinUsuario.body),
      cuerpo: mensajeDe(sinUserId.body),
    };
    for (const [caso, mensaje] of Object.entries(mensajes)) {
      expect({ caso, rutaInexistente: /^Cannot /.test(mensaje) }).toEqual({ caso, rutaInexistente: false });
    }
    expect({ caso: 'mesa', mensaje: mensajes.mesa }).toEqual({ caso: 'mesa', mensaje: expect.stringMatching(/mesa|table/i) });
    expect({ caso: 'restaurante', mensaje: mensajes.restaurante }).toEqual({
      caso: 'restaurante',
      mensaje: expect.stringMatching(/restaurante|restaurant/i),
    });
    expect({ caso: 'usuario', mensaje: mensajes.usuario }).toEqual({
      caso: 'usuario',
      mensaje: expect.stringMatching(/usuario|comensal|user/i),
    });
    expect({ caso: 'cuerpo', mensaje: mensajes.cuerpo }).toEqual({
      caso: 'cuerpo',
      mensaje: expect.stringContaining('userId'),
    });

    // Ninguno abre una sesión ni cambia la mesa.
    expect(await sesionesDeLaMesa(base, mesaId)).toEqual([]);
    expect(await leerMesa(base, mesaId)).toEqual({ isBusy: 0, activeSessionId: null });

    // Control positivo: el mismo invitado, en la mesa que existe, se une (201).
    const valido = await unirse(restauranteId, NUMERO_DE_MESA, { userId: invitado.userId });
    exigirEstado('/join válido', valido, 201);
  });
});
