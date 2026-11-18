// Change tk-01-replica-base · spec replica-base · scenario
// "WS-c1 · La réplica arranca desde cero, corre sus migraciones y atiende T01, T05 y el stream (en parte)".
// Corre contra la réplica levantada desde cero con compose.yaml (perfil de pruebas, USE_FIREBASE desactivada).
// Comprueba: la réplica escuchando y conectada a Redis, la tabla `migrations` con filas, exactamente las 13 tablas
// del inventario más `migrations`, las columnas de modelo-de-datos.md (2.1 a 2.13) y que T01, T05 y el stream
// existen (ninguno responde 404; sin JWT, T05 y el stream responden 401).
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import request from 'supertest';
import { abrirConexion, consultar } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { urlReplica, variable, variableNumerica } from '../apoyo/entorno';
import { abrirStream } from '../apoyo/stream';

/** Columnas de cada tabla según docs/architecture/modelo-de-datos.md, secciones 2.1 a 2.13. */
const COLUMNAS_DEL_MODELO: Record<string, string[]> = {
  restaurant: [
    'id',
    'name',
    'address',
    'phone',
    'mercadoPagoToken',
    'mercadoPagoRefreshToken',
    'mercadoPagoUserId',
    'isActive',
    'specialtySubtitle',
    'imageUrl',
    'logoUrl',
    'paymentStyle',
    'yellowTicketSeconds',
    'redTicketSeconds',
    'redPulseTicketSeconds',
  ],
  user: ['id', 'email', 'role', 'isGuest', 'name', 'restaurantId'],
  table: ['id', 'number', 'seats', 'qrCode', 'restaurantId', 'activeSessionId', 'isBusy'],
  table_session: ['id', 'tableId', 'amountPaid', 'tips', 'total', 'requestingHelp', 'createdAt', 'closedAt'],
  table_session_users_user: ['tableSessionId', 'userId'],
  order: [
    'id',
    'tableSessionId',
    'userId',
    'restaurantId',
    'type',
    'status',
    'createdAt',
    'confirmedAt',
    'sentToKitchenAt',
    'canceledAt',
    'cancellationReason',
    'isPaid',
    'paidAt',
  ],
  order_product_details: ['id', 'orderId', 'productId', 'quantity', 'quantityPaid', 'note'],
  order_product_option: ['id', 'orderProductId', 'productOptionId'],
  order_product_option_values_product_option_value: ['orderProductOptionId', 'productOptionValueId'],
  product: [
    'id',
    'name',
    'description',
    'deletedSince',
    'imageUrl',
    'hide',
    'price',
    'acceptsNotes',
    'isVegan',
    'glutenFree',
    'category',
    'restaurantId',
  ],
  product_option: ['id', 'name', 'description', 'type', 'limit', 'productId'],
  product_option_value: ['id', 'description', 'limit', 'price', 'productOptionId'],
  payment: ['id', 'sessionId', 'amount', 'currency', 'method', 'createdAt', 'prepaid', 'userId'],
};

const TABLA_DE_MIGRACIONES = 'migrations';

const ordenar = (lista: string[]): string[] => [...lista].sort();

describe('WS-c1 · arranque de la réplica (en parte)', () => {
  let conexion: Conexion | undefined;
  let redis: Redis | undefined;

  beforeAll(async () => {
    conexion = await abrirConexion();
    redis = new Redis({
      host: variable('REDIS_HOST'),
      port: variableNumerica('REDIS_PORT'),
      password: variable('REDIS_PASSWORD'),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    await redis.connect();
  });

  afterAll(async () => {
    await conexion?.end();
    redis?.disconnect();
  });

  test('WS-c1 · La réplica arranca desde cero, corre sus migraciones y atiende T01, T05 y el stream (en parte)', async () => {
    const base = conexion as Conexion;
    const nombreDeLaBase = variable('DB_NAME');

    // La réplica está conectada a Redis: hay al menos un cliente además de esta prueba.
    const clientes = await (redis as Redis).call('CLIENT', 'LIST');
    const propio = await (redis as Redis).call('CLIENT', 'ID');
    const otrosClientes = String(clientes)
      .split('\n')
      .filter((linea) => linea.trim() !== '')
      .filter((linea) => !linea.startsWith(`id=${String(propio)} `));
    expect(otrosClientes.length).toBeGreaterThanOrEqual(1);

    // La tabla de migraciones de TypeORM registra al menos una migración.
    const [migraciones] = await consultar<{ cantidad: number | string }>(
      base,
      `SELECT COUNT(*) AS cantidad FROM \`${TABLA_DE_MIGRACIONES}\``,
    );
    expect(Number(migraciones.cantidad)).toBeGreaterThanOrEqual(1);

    // Exactamente las 13 tablas del inventario más la de migraciones.
    const tablas = await consultar<{ tabla: string }>(
      base,
      'SELECT TABLE_NAME AS tabla FROM information_schema.tables WHERE TABLE_SCHEMA = ?',
      [nombreDeLaBase],
    );
    expect(ordenar(tablas.map(({ tabla }) => tabla))).toEqual(
      ordenar([...Object.keys(COLUMNAS_DEL_MODELO), TABLA_DE_MIGRACIONES]),
    );

    // Cada tabla con las columnas del modelo.
    for (const [tabla, columnasEsperadas] of Object.entries(COLUMNAS_DEL_MODELO)) {
      const columnas = await consultar<{ columna: string }>(
        base,
        'SELECT COLUMN_NAME AS columna FROM information_schema.columns WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
        [nombreDeLaBase, tabla],
      );
      expect({ tabla, columnas: ordenar(columnas.map(({ columna }) => columna)) }).toEqual({
        tabla,
        columnas: ordenar(columnasEsperadas),
      });
    }

    // T01, T05 y el stream existen: ninguno responde 404.
    const login = await request(urlReplica())
      .post('/auth/login')
      .send({ firebaseIdToken: 'no es un ID token de Firebase' });
    expect(login.status).not.toBe(404);

    // Control positivo: sin JWT, T05 y el stream responden 401 (no 404).
    const mesas = await request(urlReplica()).get(`/restaurants/${randomUUID()}/tables/active`);
    expect(mesas.status).toBe(401);

    const stream = await abrirStream();
    expect(stream.estado).toBe(401);
  });
});
