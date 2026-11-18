// Change tk-01-replica-base · spec contrato-replica · requirement "Contrato de los guards (JwtAuthGuard y RolesGuard)".
// Scenarios: "JWT por encabezado o por query param" y "Sin JWT, vencido o con otra firma" (con el userId inexistente).
// Ruta con "J": T05 del propio restaurante; sin JWT y vencido, también el stream. Decisiones: DP-15, DP-57.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { abrirConexion, idDeUsuarioInexistente, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { urlReplica } from '../apoyo/entorno';
import { jwtConOtraFirma, jwtVencido, jwtVigente } from '../apoyo/jwt';
import { abrirStream } from '../apoyo/stream';

describe('Guards · JwtAuthGuard', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const restauranteId = randomUUID();
  let mozoId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    sembrado = new Sembrado(conexion);
    await sembrado.insertar('restaurant', { id: restauranteId, name: 'Restaurante Guardas de Prueba' });
    mozoId = await sembrado.insertar('user', {
      email: `mozo-guards-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Guardas de Prueba',
      restaurantId: restauranteId,
    });
  });

  afterAll(async () => {
    await sembrado?.deshacer();
    await conexion?.end();
  });

  const rutaMesas = (): string => `/restaurants/${restauranteId}/tables/active`;

  test('Guards · JWT por encabezado o por query param', async () => {
    const jwt = jwtVigente(mozoId, 'waiter');

    const porEncabezado = await request(urlReplica()).get(rutaMesas()).set('Authorization', `Bearer ${jwt}`);
    expect(porEncabezado.status).toBe(200);

    const porQuery = await request(urlReplica()).get(rutaMesas()).query({ token: jwt });
    expect(porQuery.status).toBe(200);
  });

  test('Guards · sin JWT, vencido, con otra firma o con un userId inexistente responde 401', async () => {
    const base = conexion as Conexion;
    const usuarioInexistente = await idDeUsuarioInexistente(base);

    // Control positivo: el mismo pedido con el JWT vigente pasa el guard.
    const vigente = await request(urlReplica())
      .get(rutaMesas())
      .set('Authorization', `Bearer ${jwtVigente(mozoId, 'waiter')}`);
    expect(vigente.status).toBe(200);

    // T05
    const sinJwt = await request(urlReplica()).get(rutaMesas());
    expect({ caso: 'T05 sin JWT', estado: sinJwt.status }).toEqual({ caso: 'T05 sin JWT', estado: 401 });

    const vencido = await request(urlReplica())
      .get(rutaMesas())
      .set('Authorization', `Bearer ${jwtVencido(mozoId, 'waiter')}`);
    expect({ caso: 'T05 vencido', estado: vencido.status }).toEqual({ caso: 'T05 vencido', estado: 401 });

    const otraFirma = await request(urlReplica())
      .get(rutaMesas())
      .set('Authorization', `Bearer ${jwtConOtraFirma(mozoId, 'waiter')}`);
    expect({ caso: 'T05 otra firma', estado: otraFirma.status }).toEqual({ caso: 'T05 otra firma', estado: 401 });

    const inexistente = await request(urlReplica())
      .get(rutaMesas())
      .set('Authorization', `Bearer ${jwtVigente(usuarioInexistente, 'waiter')}`);
    expect({ caso: 'T05 userId inexistente', estado: inexistente.status }).toEqual({
      caso: 'T05 userId inexistente',
      estado: 401,
    });

    // Stream
    const streamSinJwt = await abrirStream();
    expect({ caso: 'stream sin JWT', estado: streamSinJwt.estado }).toEqual({ caso: 'stream sin JWT', estado: 401 });

    const streamVencido = await abrirStream({ Authorization: `Bearer ${jwtVencido(mozoId, 'waiter')}` });
    expect({ caso: 'stream vencido', estado: streamVencido.estado }).toEqual({ caso: 'stream vencido', estado: 401 });
  });
});
