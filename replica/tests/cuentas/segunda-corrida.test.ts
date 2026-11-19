// Change tk-02-datos-iniciales · spec datos-iniciales · requirement "Correr el script dos veces no duplica ninguna cuenta
// (DoD de TK-02)" · scenario "Segunda corrida del script (local, con Firebase)".
// La parte "la salida del script informa cero cuentas creadas" es evidencia del PR; esta prueba comprueba la otra:
// ninguna cuenta se creó de nuevo ni cambió su contraseña después de SEGUNDA_CORRIDA_DESDE.
// Local (DP-43): corre solo con PRUEBAS_LOCALES=1, después de la segunda corrida de `cuentas crear`.
// La hora de referencia es SEGUNDA_CORRIDA_DESDE (ISO 8601), anotada antes de la segunda corrida y pasada como dato:
// ninguna aserción usa el reloj. Variables: FIREBASE_WEB_API_KEY y una CONTRASENA_<PAPEL> por cuenta (DP-71).
import { abrirConexion, consultar } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { pruebasLocales } from '../apoyo/entorno';
import { consultarCuenta, iniciarSesion, variableDeContrasena, variablesQueFaltan } from '../apoyo/firebase';

const siLocal = pruebasLocales() ? test : test.skip;

describe('TK-02 · segunda corrida del script (local)', () => {
  let conexion: Conexion | undefined;

  beforeAll(async () => {
    if (pruebasLocales()) {
      conexion = await abrirConexion();
    }
  });

  afterAll(async () => {
    await conexion?.end();
  });

  siLocal('TK-02 · segunda corrida del script (local)', async () => {
    const base = conexion as Conexion;

    expect({ faltan: variablesQueFaltan(['SEGUNDA_CORRIDA_DESDE']) }).toEqual({ faltan: [] });
    const desde = Date.parse(process.env.SEGUNDA_CORRIDA_DESDE as string);
    expect({ SEGUNDA_CORRIDA_DESDE_es_ISO_8601: Number.isFinite(desde) }).toEqual({
      SEGUNDA_CORRIDA_DESDE_es_ISO_8601: true,
    });

    const filas = await consultar<{ email: string }>(base, 'SELECT email FROM `user` WHERE isGuest = 0 ORDER BY email');
    // Control positivo: con la tabla vacía no habría ninguna cuenta que mirar.
    expect(filas.length).toBeGreaterThan(0);
    const emails = filas.map(({ email }) => email);

    expect({
      faltan: variablesQueFaltan(['FIREBASE_WEB_API_KEY', ...emails.map(variableDeContrasena)]),
    }).toEqual({ faltan: [] });

    const resultados: Array<{
      email: string;
      inicio: number;
      consulta?: number;
      creadaAntes?: boolean;
      contrasenaAntes?: boolean;
      error?: string;
    }> = [];
    for (const email of emails) {
      const sesion = await iniciarSesion(email, process.env[variableDeContrasena(email)] as string);
      if (sesion.estado !== 200 || sesion.idToken === undefined) {
        resultados.push({ email, inicio: sesion.estado, error: sesion.error });
        continue;
      }
      const cuenta = await consultarCuenta(sesion.idToken);
      resultados.push({
        email,
        inicio: sesion.estado,
        consulta: cuenta.estado,
        creadaAntes: cuenta.creadaEn !== undefined && cuenta.creadaEn < desde,
        contrasenaAntes: cuenta.contrasenaCambiadaEn !== undefined && cuenta.contrasenaCambiadaEn < desde,
        error: cuenta.error,
      });
    }

    // Cada cuenta se creó y cambió su contraseña por última vez antes de la segunda corrida.
    expect(resultados).toEqual(
      emails.map((email) => ({
        email,
        inicio: 200,
        consulta: 200,
        creadaAntes: true,
        contrasenaAntes: true,
        error: undefined,
      })),
    );
  });
});
