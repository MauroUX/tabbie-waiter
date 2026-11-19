// Change tk-02-datos-iniciales · spec datos-iniciales · requirement "Cada fila user tiene su cuenta de Firebase,
// y cada cuenta del script su fila (DoD de TK-02)" · scenario "Cada fila user tiene su cuenta (local, con Firebase)".
// La otra mitad ("la lista del script tiene exactamente los emails de user") la comprueba en la CI el bloque
// "SEG-c11 · la lista del script es la de user" de datos/carga-desde-cero.sh.
// Local (DP-43): corre solo con PRUEBAS_LOCALES=1, con las cuentas ya creadas por el script en modo `crear`.
// Variables: FIREBASE_WEB_API_KEY y una CONTRASENA_<PAPEL> por cuenta (DP-71). Ninguna contraseña ni token
// entra en una aserción: solo el email, el estado y el código de error de Firebase.
import { abrirConexion, consultar } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { pruebasLocales } from '../apoyo/entorno';
import { iniciarSesion, variableDeContrasena, variablesQueFaltan } from '../apoyo/firebase';

const siLocal = pruebasLocales() ? test : test.skip;

describe('TK-02 · cada fila user tiene su cuenta de Firebase (local)', () => {
  let conexion: Conexion | undefined;

  beforeAll(async () => {
    if (pruebasLocales()) {
      conexion = await abrirConexion();
    }
  });

  afterAll(async () => {
    await conexion?.end();
  });

  siLocal('TK-02 · cada user inicia sesión en Firebase (local)', async () => {
    const base = conexion as Conexion;

    // Las filas user que no son invitados, leídas de la base.
    const filas = await consultar<{ email: string }>(base, 'SELECT email FROM `user` WHERE isGuest = 0 ORDER BY email');
    // Control positivo: con la tabla vacía no habría ninguna cuenta que probar.
    expect(filas.length).toBeGreaterThan(0);
    const emails = filas.map(({ email }) => email);

    expect({
      faltan: variablesQueFaltan(['FIREBASE_WEB_API_KEY', ...emails.map(variableDeContrasena)]),
    }).toEqual({ faltan: [] });

    const resultados: Array<{ email: string; estado: number; emailDeFirebase?: string; error?: string }> = [];
    for (const email of emails) {
      const sesion = await iniciarSesion(email, process.env[variableDeContrasena(email)] as string);
      resultados.push({ email, estado: sesion.estado, emailDeFirebase: sesion.email, error: sesion.error });
    }

    // Cada inicio de sesión responde con éxito y con ese mismo email.
    expect(resultados).toEqual(
      emails.map((email) => ({ email, estado: 200, emailDeFirebase: email, error: undefined })),
    );
  });
});
