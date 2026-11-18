// Change tk-01-replica-base · spec contrato-replica · requirement "Contrato del stream GET /sse/waiters".
// Scenarios: "El stream abre con el JWT en el encabezado" y "El stream responde 401 con un JWT vencido antes de abrirse".
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
});
