// Change tk-02-datos-iniciales · spec datos-iniciales · scenario
// "WS-c1 · El primer mozo del restaurante 1 inicia sesión por T01 contra la réplica con sus datos iniciales
// (en parte; local, con Firebase)".
// Local (DP-43): corre solo con PRUEBAS_LOCALES=1, contra la réplica con local.env (USE_FIREBASE activada),
// con las cuentas ya creadas por el script de replica/firebase/. Su evidencia, sin tokens, va en el PR.
// Variables: FIREBASE_WEB_API_KEY y CONTRASENA_MOZO1_R1 (DP-71). Ningún token ni contraseña entra en una aserción.
import request from 'supertest';
import { abrirConexion, contarFilas } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { firebaseActivado, pruebasLocales, urlReplica } from '../apoyo/entorno';
import { iniciarSesion, variableDeContrasena, variablesQueFaltan } from '../apoyo/firebase';
import { erroresContraOpenApi } from '../apoyo/openapi';

const RESTAURANTE_1 = '11111111-1111-4111-8111-111111111111';
/** El primer mozo del restaurante 1 (DP-71). */
const PRIMER_MOZO = 'waiterapp.mozo1.r1@example.com';
const FORMA_DE_JWT = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const siLocal = pruebasLocales() ? test : test.skip;

describe('WS-c1 · el primer mozo del restaurante 1 inicia sesión (en parte; local)', () => {
  let conexion: Conexion | undefined;

  beforeAll(async () => {
    if (pruebasLocales()) {
      conexion = await abrirConexion();
    }
  });

  afterAll(async () => {
    await conexion?.end();
  });

  siLocal('WS-c1 · el primer mozo del restaurante 1 por T01 y T05 vacío (local)', async () => {
    const base = conexion as Conexion;
    const variable = variableDeContrasena(PRIMER_MOZO);
    expect({ faltan: variablesQueFaltan(['FIREBASE_WEB_API_KEY', variable]) }).toEqual({ faltan: [] });
    // La réplica tiene que verificar el ID token con Firebase.
    expect({ USE_FIREBASE: firebaseActivado() }).toEqual({ USE_FIREBASE: true });

    // El ID token de la cuenta del primer mozo, con su email y su contraseña.
    const sesion = await iniciarSesion(PRIMER_MOZO, process.env[variable] as string);
    expect({ estado: sesion.estado, email: sesion.email, error: sesion.error }).toEqual({
      estado: 200,
      email: PRIMER_MOZO,
      error: undefined,
    });
    const idToken = sesion.idToken as string;

    const usuariosAntes = await contarFilas(base, 'user');

    const login = await request(urlReplica()).post('/auth/login').send({ firebaseIdToken: idToken });

    expect(login.status).toBe(201);
    const accessToken: unknown = login.body.access_token;
    // Presente y con forma de JWT, sin mostrarlo.
    expect({ conAccessToken: typeof accessToken === 'string' && FORMA_DE_JWT.test(accessToken) }).toEqual({
      conAccessToken: true,
    });
    expect({ role: login.body.user?.role, restaurantId: login.body.user?.restaurantId }).toEqual({
      role: 'waiter',
      restaurantId: RESTAURANTE_1,
    });

    // El mozo ya existía: T01 no insertó ninguna fila.
    expect(await contarFilas(base, 'user')).toBe(usuariosAntes);

    // T05 con ese JWT: los datos iniciales no traen mesas ocupadas.
    const mesas = await request(urlReplica())
      .get(`/restaurants/${RESTAURANTE_1}/tables/active`)
      .set('Authorization', `Bearer ${accessToken as string}`);
    expect(mesas.status).toBe(200);
    expect(mesas.body).toEqual([]);
    expect(
      erroresContraOpenApi({ ruta: '/restaurants/{id}/tables/active', metodo: 'get', codigo: 200 }, mesas.body),
    ).toEqual([]);
  });
});
