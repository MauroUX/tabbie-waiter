// Change tk-01-replica-base · spec contrato-replica · requirement "Contrato del stream GET /sse/waiters".
// Scenarios: "El stream abre con el JWT en el encabezado", "El stream responde 401 con un JWT vencido antes de abrirse"
// y "El stream responde 403 a un usuario sin restaurante (DP-64)".
// Solo se leen el estado y los encabezados, y se corta la conexión: en este ticket nadie emite eventos (DP-53).
import { randomUUID } from 'node:crypto';
import { abrirConexion, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { jwtVencido, jwtVigente } from '../apoyo/jwt';
import { abrirStream } from '../apoyo/stream';

describe('Stream · GET /sse/waiters', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  const restauranteId = randomUUID();
  let mozoId = 0;
  let usuarioSinRestauranteId = 0;

  beforeAll(async () => {
    conexion = await abrirConexion();
    sembrado = new Sembrado(conexion);
    await sembrado.insertar('restaurant', { id: restauranteId, name: 'Restaurante Stream de Prueba' });
    mozoId = await sembrado.insertar('user', {
      email: `mozo-stream-${randomUUID()}@example.com`,
      role: 'waiter',
      isGuest: 0,
      name: 'Mozo Stream de Prueba',
      restaurantId: restauranteId,
    });
    // Un usuario sin restaurante (DP-64).
    usuarioSinRestauranteId = await sembrado.insertar('user', {
      email: `sin-restaurante-stream-${randomUUID()}@example.com`,
      role: 'user',
      isGuest: 0,
      name: 'Usuario Sin Restaurante de Prueba',
      restaurantId: null,
    });
  });

  afterAll(async () => {
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('Stream · abre con el JWT en el encabezado', async () => {
    const apertura = await abrirStream({ Authorization: `Bearer ${jwtVigente(mozoId, 'waiter')}` });

    expect(apertura.estado).toBe(200);
    expect(apertura.tipoDeContenido.startsWith('text/event-stream')).toBe(true);
    // La conexión sigue abierta hasta que la prueba la corta.
    expect(apertura.sigueAbierta).toBe(true);
  });

  test('Stream · responde 401 con un JWT vencido antes de abrirse', async () => {
    const apertura = await abrirStream({ Authorization: `Bearer ${jwtVencido(mozoId, 'waiter')}` });

    expect(apertura.estado).toBe(401);
    expect(apertura.tipoDeContenido.startsWith('text/event-stream')).toBe(false);
  });

  test('Stream · responde 403 a un usuario sin restaurante (DP-64)', async () => {
    const apertura = await abrirStream({
      Authorization: `Bearer ${jwtVigente(usuarioSinRestauranteId, 'user')}`,
    });

    // 403, no 200 (stream abierto) ni 401 (el JWT es vigente y el usuario existe).
    expect(apertura.estado).toBe(403);
    // No abre el stream.
    expect(apertura.tipoDeContenido.startsWith('text/event-stream')).toBe(false);
    // El mensaje de DP-64: "El usuario no tiene restaurante: no hay stream que abrir".
    expect(apertura.cuerpo).toContain('no tiene restaurante');
  });
});
