// Change tk-01-replica-base · spec contrato-replica · requirement "Contrato T01 · POST /auth/login".
// Scenarios: "T01 es público", "T01 con USE_FIREBASE desactivada" y "T01 rechaza un ID token inválido (local, con Firebase)".
// Decisiones: DP-58 (errores 401), DP-59 (503 sin Firebase). El canje real contra Firebase es de TK-02 (DP-15).
// Los dos primeros corren solo con USE_FIREBASE desactivada; el local, solo con PRUEBAS_LOCALES=1 y USE_FIREBASE=true.
import request from 'supertest';
import { abrirConexion, contarFilas } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { firebaseActivado, pruebasLocales, urlReplica } from '../apoyo/entorno';
import { erroresContraOpenApi, marcasSensibles } from '../apoyo/openapi';

const ID_TOKEN_QUE_NO_ES_DE_FIREBASE = 'no es un ID token de Firebase';
const MENSAJE_SIN_FIREBASE = 'Firebase desactivado (USE_FIREBASE)';
/** Forma de un JWT: tres partes base64url, la primera empieza por `eyJ`. */
const FORMA_DE_JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

const siSinFirebase = firebaseActivado() ? test.skip : test;
const siLocalConFirebase = pruebasLocales() && firebaseActivado() ? test : test.skip;

describe('T01 · POST /auth/login', () => {
  siSinFirebase('T01 · es público', async () => {
    const respuesta = await request(urlReplica())
      .post('/auth/login')
      .send({ firebaseIdToken: ID_TOKEN_QUE_NO_ES_DE_FIREBASE });

    // Sin encabezado Authorization no responde 401 por falta de JWT propio: con USE_FIREBASE desactivada, 503.
    expect(respuesta.status).not.toBe(401);
    expect(respuesta.status).toBe(503);
  });

  siSinFirebase('T01 · con USE_FIREBASE desactivada responde 503', async () => {
    const respuesta = await request(urlReplica())
      .post('/auth/login')
      .send({ firebaseIdToken: ID_TOKEN_QUE_NO_ES_DE_FIREBASE });

    expect(respuesta.status).toBe(503);
    expect(String(respuesta.body.message)).toContain(MENSAJE_SIN_FIREBASE);

    // Sin emitir ningún JWT.
    expect(respuesta.body).not.toHaveProperty('access_token');
    expect(respuesta.text).not.toMatch(FORMA_DE_JWT);

    // Valida contra la entrada de T01 en docs/api/openapi.yaml.
    expect(
      erroresContraOpenApi({ ruta: '/auth/login', metodo: 'post', codigo: 503 }, respuesta.body),
    ).toEqual([]);

    // access_token y firebaseIdToken llevan x-sensitive: true (DP-52, design.md D3).
    const marcas = marcasSensibles(['access_token', 'firebaseIdToken']);
    for (const [nombre, lista] of marcas) {
      expect({ nombre, apariciones: lista.length > 0 }).toEqual({ nombre, apariciones: true });
      expect({ nombre, marcas: lista }).toEqual({ nombre, marcas: lista.map(() => true) });
    }
  });

  describe('con Firebase (local)', () => {
    let conexion: Conexion | undefined;

    beforeAll(async () => {
      if (pruebasLocales() && firebaseActivado()) {
        conexion = await abrirConexion();
      }
    });

    afterAll(async () => {
      await conexion?.end();
    });

    siLocalConFirebase('T01 · rechaza un ID token inválido (local, con Firebase)', async () => {
      const base = conexion as Conexion;
      const usuariosAntes = await contarFilas(base, 'user');

      const respuesta = await request(urlReplica())
        .post('/auth/login')
        .send({ firebaseIdToken: ID_TOKEN_QUE_NO_ES_DE_FIREBASE });

      expect(respuesta.status).toBe(401);
      expect(respuesta.body).not.toHaveProperty('access_token');
      expect(respuesta.text).not.toMatch(FORMA_DE_JWT);
      expect(await contarFilas(base, 'user')).toBe(usuariosAntes);
    });
  });
});
