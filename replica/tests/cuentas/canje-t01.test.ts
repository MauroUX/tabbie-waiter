// Change tk-02-datos-iniciales · spec datos-iniciales · requirement "Cada cuenta recibe por T01 su rol y su restaurante
// (DoD de TK-02)" · scenario "Canje por T01 de cada cuenta de prueba (local, con Firebase)".
// Decisiones: DP-15, DP-36, DP-56 (restaurantId "-1" sin restaurante), DP-71 (emails y variables).
// Local (DP-43): corre solo con PRUEBAS_LOCALES=1, contra la réplica con local.env (USE_FIREBASE activada),
// con las cuentas ya creadas por el script de replica/firebase/. Su evidencia, sin tokens, va en el PR.
// Ningún token ni contraseña entra en una aserción.
import request from 'supertest';
import { abrirConexion, contarFilas } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { firebaseActivado, pruebasLocales, urlReplica } from '../apoyo/entorno';
import { iniciarSesion, variableDeContrasena, variablesQueFaltan } from '../apoyo/firebase';

const RESTAURANTE_1 = '11111111-1111-4111-8111-111111111111';
const RESTAURANTE_2 = '22222222-2222-4222-8222-222222222222';
const SIN_RESTAURANTE = '-1';

/** Lo que cada cuenta tiene que recibir por T01 (DP-36, DP-71). */
const CUENTAS = [
  { email: 'waiterapp.mozo1.r1@example.com', role: 'waiter', restaurantId: RESTAURANTE_1 },
  { email: 'waiterapp.mozo2.r1@example.com', role: 'waiter', restaurantId: RESTAURANTE_1 },
  { email: 'waiterapp.mozo1.r2@example.com', role: 'waiter', restaurantId: RESTAURANTE_2 },
  { email: 'waiterapp.usuario.r1@example.com', role: 'user', restaurantId: RESTAURANTE_1 },
  { email: 'waiterapp.comensal@example.com', role: 'user', restaurantId: SIN_RESTAURANTE },
];

const siLocal = pruebasLocales() ? test : test.skip;

describe('TK-02 · canje por T01 de cada cuenta de prueba (local)', () => {
  let conexion: Conexion | undefined;

  beforeAll(async () => {
    if (pruebasLocales()) {
      conexion = await abrirConexion();
    }
  });

  afterAll(async () => {
    await conexion?.end();
  });

  siLocal('TK-02 · rol y restaurante de cada cuenta por T01 (local)', async () => {
    const base = conexion as Conexion;
    const variables = CUENTAS.map(({ email }) => variableDeContrasena(email));
    expect({ faltan: variablesQueFaltan(['FIREBASE_WEB_API_KEY', ...variables]) }).toEqual({ faltan: [] });
    // La réplica tiene que verificar el ID token con Firebase.
    expect({ USE_FIREBASE: firebaseActivado() }).toEqual({ USE_FIREBASE: true });

    const usuariosAntes = await contarFilas(base, 'user');

    const recibido: Array<{ email: string; estado: number; role: unknown; restaurantId: unknown; error?: string }> = [];
    for (const { email } of CUENTAS) {
      const sesion = await iniciarSesion(email, process.env[variableDeContrasena(email)] as string);
      if (sesion.estado !== 200 || sesion.idToken === undefined) {
        recibido.push({ email, estado: sesion.estado, role: undefined, restaurantId: undefined, error: sesion.error });
        continue;
      }
      const login = await request(urlReplica()).post('/auth/login').send({ firebaseIdToken: sesion.idToken });
      recibido.push({
        email,
        estado: login.status,
        role: login.body.user?.role,
        restaurantId: login.body.user?.restaurantId,
      });
    }

    expect(recibido).toEqual(CUENTAS.map(({ email, role, restaurantId }) => ({ email, estado: 201, role, restaurantId })));

    // La tabla user termina con las mismas filas que dejó la carga.
    expect(await contarFilas(base, 'user')).toBe(usuariosAntes);
  });
});
