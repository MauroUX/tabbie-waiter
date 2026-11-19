// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement "Contrato POST /auth/guest (la ruta de T02)".
// Scenarios: "/auth/guest devuelve un JWT de invitado sin Firebase", "El mismo guestId vuelve a ser el mismo invitado"
// y "/auth/guest rechaza un guestId ausente o inválido".
// Decisiones: DP-72 (la fila del invitado), DP-73 (cuerpo, respuesta y rechazos), DP-57 (claims del JWT), DP-52 (OpenAPI).
// El JWT se verifica sin mirar el vencimiento: ninguna aserción usa el reloj.
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import request from 'supertest';
import { abrirConexion, consultar, contarFilas } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { emailDeInvitado, exigirEstado, exigirOpenApi, FORMA_DE_JWT, Invitados, mensajeDe } from '../apoyo/comensal';
import { urlReplica, variable } from '../apoyo/entorno';
import { marcasSensibles } from '../apoyo/openapi';
import { abrirStream } from '../apoyo/stream';
import { borrarLoQueCreoLaReplica } from '../apoyo/limpieza';

interface FilaDeUsuario extends Record<string, unknown> {
  id: number | string;
  email: string;
  role: string;
  isGuest: number | string;
  restaurantId: string | null;
}

describe('/auth/guest', () => {
  let conexion: Conexion | undefined;
  const invitados = new Invitados();

  beforeAll(async () => {
    conexion = await abrirConexion();
  });

  afterAll(async () => {
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [], emailsDeInvitados: invitados.emails });
    }
    await conexion?.end();
  });

  const pedirInvitado = (cuerpo: object): request.Test => request(urlReplica()).post('/auth/guest').send(cuerpo);

  test('/auth/guest devuelve un JWT de invitado sin Firebase', async () => {
    const base = conexion as Conexion;
    const guestId = randomUUID();
    invitados.anotar(guestId);

    // Sin Authorization.
    const respuesta = await pedirInvitado({ guestId });

    exigirEstado('POST /auth/guest', respuesta, 201);
    const { access_token: token, user } = respuesta.body as { access_token: string; user: Record<string, unknown> };
    expect(token).toMatch(FORMA_DE_JWT);
    expect(user).toMatchObject({ role: 'user', restaurantId: '-1' });
    expect(typeof user.id).toBe('number');

    // La fila del invitado (DP-72).
    const filas = await consultar<FilaDeUsuario>(
      base,
      'SELECT id, email, role, isGuest, restaurantId FROM `user` WHERE id = ?',
      [user.id],
    );
    expect(
      filas.map((fila) => ({
        id: Number(fila.id),
        email: fila.email,
        role: fila.role,
        isGuest: Number(fila.isGuest),
        restaurantId: fila.restaurantId,
      })),
    ).toEqual([{ id: user.id, email: emailDeInvitado(guestId), role: 'user', isGuest: 1, restaurantId: null }]);
    // La respuesta trae el mismo email que la fila.
    expect(user.email).toBe(emailDeInvitado(guestId));

    // HS256 con JWT_SECRET y claims {userId, role, iat, exp} (DP-57), sin mirar el vencimiento.
    expect(jwt.decode(token, { complete: true })?.header.alg).toBe('HS256');
    const claims = jwt.verify(token, variable('JWT_SECRET'), {
      algorithms: ['HS256'],
      ignoreExpiration: true,
    }) as JwtPayload;
    expect(Object.keys(claims).sort()).toEqual(['exp', 'iat', 'role', 'userId']);
    expect(claims).toMatchObject({ userId: user.id, role: 'user' });
    expect(typeof claims.iat).toBe('number');
    expect(typeof claims.exp).toBe('number');
    expect((claims.exp as number) > (claims.iat as number)).toBe(true);

    // Pasa JwtAuthGuard en una ruta con "J": el stream responde 403 por no tener restaurante (DP-64), no 401.
    const stream = await abrirStream({ Authorization: `Bearer ${token}` });
    expect(stream.estado).toBe(403);

    // Valida contra la entrada de /auth/guest, con access_token marcado x-sensitive: true.
    exigirOpenApi({ ruta: '/auth/guest', metodo: 'post', codigo: 201 }, respuesta.body);
    const [marcas] = [...marcasSensibles(['access_token']).values()];
    expect(marcas.length > 0).toBe(true);
    expect(marcas).toEqual(marcas.map(() => true));
  });

  test('El mismo guestId vuelve a ser el mismo invitado', async () => {
    const base = conexion as Conexion;
    const guestId = randomUUID();
    invitados.anotar(guestId);

    const primera = await pedirInvitado({ guestId });
    const segunda = await pedirInvitado({ guestId });

    exigirEstado('primera vez', primera, 201);
    exigirEstado('segunda vez', segunda, 201);
    expect(segunda.body.user.id).toBe(primera.body.user.id);

    // Una sola fila con ese email.
    const filas = await consultar<{ id: number | string }>(base, 'SELECT id FROM `user` WHERE email = ?', [
      emailDeInvitado(guestId),
    ]);
    expect(filas.map((fila) => Number(fila.id))).toEqual([primera.body.user.id]);
  });

  test('/auth/guest rechaza un guestId ausente o inválido', async () => {
    const base = conexion as Conexion;
    const conArroba = `${randomUUID()}@example.com`;
    invitados.anotar(conArroba);
    const usuariosAntes = await contarFilas(base, 'user');

    const sinGuestId = await pedirInvitado({});
    const invalido = await pedirInvitado({ guestId: conArroba });

    for (const [caso, respuesta] of [
      ['sin guestId', sinGuestId],
      ['guestId con @', invalido],
    ] as const) {
      expect({ caso, estado: respuesta.status }).toEqual({ caso, estado: 400 });
      // Un mensaje que nombra guestId.
      expect({ caso, mensaje: mensajeDe(respuesta.body) }).toEqual({
        caso,
        mensaje: expect.stringContaining('guestId'),
      });
      // Sin JWT.
      expect({ caso, conToken: Object.prototype.hasOwnProperty.call(respuesta.body, 'access_token') }).toEqual({
        caso,
        conToken: false,
      });
      expect({ caso, jwt: FORMA_DE_JWT.test(respuesta.text) }).toEqual({ caso, jwt: false });
    }

    // Sin filas nuevas en user.
    expect(await contarFilas(base, 'user')).toBe(usuariosAntes);
  });
});
