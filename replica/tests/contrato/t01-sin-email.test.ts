// Change tk-02-datos-iniciales · spec contrato-replica · requirement "Contrato T01 · POST /auth/login" · scenario
// "T01 rechaza un ID token válido sin email (local, con Firebase; DP-58)".
// T01 ya lo cumple desde TK-01: este test nace en verde y su rojo se comprueba por mutación.
// Local (DP-43): corre solo con PRUEBAS_LOCALES=1, contra la réplica con local.env (USE_FIREBASE activada).
// El ID token: la prueba firma un custom token RS256 con la cuenta de servicio (FIREBASE_CLIENT_EMAIL y
// FIREBASE_PRIVATE_KEY) para el uid fijo `waiterapp-dp58-sin-email`, y lo canjea con accounts:signInWithCustomToken.
// El canje crea en Firebase, la primera vez, esa cuenta sin email; las siguientes la reusan.
// El reloj solo sirve para que la firma del custom token sea válida; no entra en ninguna aserción.
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { abrirConexion, contarFilas } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { firebaseActivado, pruebasLocales, urlReplica } from '../apoyo/entorno';
import { canjearCustomToken, firmarCustomToken, variablesQueFaltan } from '../apoyo/firebase';

const UID_SIN_EMAIL = 'waiterapp-dp58-sin-email';
/** Forma de un JWT: tres partes base64url, la primera empieza por `eyJ`. */
const FORMA_DE_JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

const siLocal = pruebasLocales() ? test : test.skip;

describe('T01 · ID token válido sin email (DP-58, local)', () => {
  let conexion: Conexion | undefined;

  beforeAll(async () => {
    if (pruebasLocales()) {
      conexion = await abrirConexion();
    }
  });

  afterAll(async () => {
    await conexion?.end();
  });

  siLocal('T01 · ID token válido sin email → 401 (DP-58) (local)', async () => {
    const base = conexion as Conexion;
    expect({
      faltan: variablesQueFaltan(['FIREBASE_WEB_API_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']),
    }).toEqual({ faltan: [] });
    // La réplica tiene que verificar el ID token con Firebase.
    expect({ USE_FIREBASE: firebaseActivado() }).toEqual({ USE_FIREBASE: true });

    // Un ID token válido del proyecto, de una cuenta sin email.
    const canje = await canjearCustomToken(firmarCustomToken(UID_SIN_EMAIL));
    expect({ estado: canje.estado, conIdToken: canje.idToken !== undefined, error: canje.error }).toEqual({
      estado: 200,
      conIdToken: true,
      error: undefined,
    });
    const idToken = canje.idToken as string;

    // Control: el ID token (decodificado sin verificar) no trae el claim email y es de ese uid.
    const claims = jwt.decode(idToken);
    expect(typeof claims === 'object' && claims !== null).toBe(true);
    const payload = claims as jwt.JwtPayload;
    expect({ sub: payload.sub, conEmail: Object.prototype.hasOwnProperty.call(payload, 'email') }).toEqual({
      sub: UID_SIN_EMAIL,
      conEmail: false,
    });

    const usuariosAntes = await contarFilas(base, 'user');

    const respuesta = await request(urlReplica()).post('/auth/login').send({ firebaseIdToken: idToken });

    expect(respuesta.status).toBe(401);
    // El mensaje nombra el email que falta.
    expect(String(respuesta.body.message)).toContain('email');
    // Sin emitir ningún JWT (sin mostrar la respuesta si lo trajera).
    expect({
      conAccessToken: Object.prototype.hasOwnProperty.call(respuesta.body, 'access_token'),
      conFormaDeJwt: FORMA_DE_JWT.test(respuesta.text),
    }).toEqual({ conAccessToken: false, conFormaDeJwt: false });
    // Sin insertar ninguna fila en user.
    expect(await contarFilas(base, 'user')).toBe(usuariosAntes);
  });
});
