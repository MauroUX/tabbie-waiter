// Change tk-01-replica-base · spec replica-base · scenario "SEG-c10 · Los secretos no están en el repo" (DP-62, DP-63).
// Comprueba, sobre el repo montado en REPO_PATH:
//   1. gitleaks sobre todo el historial y todas las ramas, sin hallazgos;
//   2. los ejemplos de replica/entornos/ con los nombres de infraestructura.md, sección 5, y sin valores;
//   3. ningún otro archivo de variables de entorno versionado;
//   4. control positivo: gitleaks, con la misma configuración, detecta una clave privada generada en el momento
//      en un repo temporal que se borra al terminar.
// La búsqueda de los valores del archivo local no va acá: la corre el humano con su script (design.md, D2).
import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { rutaRepo } from '../apoyo/entorno';

const VARIABLES_DE_INFRAESTRUCTURA = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'JWT_SECRET',
  'JWT_EXPIRATION_WAITERS',
  'JWT_EXPIRATION',
  'REDIS_EXPIRATION_TIME',
  'USE_FIREBASE',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'PORT',
  'CORS_ORIGINS',
];

const EJEMPLOS = ['replica/entornos/local.env.example', 'replica/entornos/pruebas.env.example'];

function ejecutar(comando: string, argumentos: string[]): SpawnSyncReturns<string> {
  const resultado = spawnSync(comando, argumentos, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (resultado.error) {
    throw new Error(`No se pudo ejecutar ${comando}: ${resultado.error.message}`);
  }
  return resultado;
}

/** Si el repo trae configuración propia de gitleaks, el control positivo usa la misma. */
function argumentosDeConfiguracion(repo: string): string[] {
  const configuracion = path.join(repo, '.gitleaks.toml');
  return existsSync(configuracion) ? ['--config', configuracion] : [];
}

function esArchivoDeVariables(rutaVersionada: string): boolean {
  const nombre = path.posix.basename(rutaVersionada);
  return nombre.startsWith('.env') || nombre.endsWith('.env');
}

describe('SEG-c10 · Los secretos no están en el repo', () => {
  const repo = rutaRepo();
  const temporales: string[] = [];

  afterAll(() => {
    for (const carpeta of temporales) {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });

  test('SEG-c10 · Los secretos no están en el repo', () => {
    // 1. gitleaks sobre todo el historial y todas las ramas.
    const escaneo = ejecutar('gitleaks', [
      'git',
      repo,
      '--log-opts=--all',
      '--redact',
      '--no-banner',
      ...argumentosDeConfiguracion(repo),
    ]);
    expect({ codigo: escaneo.status, salida: `${escaneo.stdout}\n${escaneo.stderr}` }).toEqual({
      codigo: 0,
      salida: expect.any(String),
    });

    // 2. Los ejemplos existen y definen cada variable con el nombre y sin valor.
    for (const ejemplo of EJEMPLOS) {
      const ruta = path.join(repo, ejemplo);
      expect({ ejemplo, existe: existsSync(ruta) }).toEqual({ ejemplo, existe: true });
      const lineas = readFileSync(ruta, 'utf8').split(/\r?\n/);

      const faltantes = VARIABLES_DE_INFRAESTRUCTURA.filter(
        (nombre) => !lineas.some((linea) => new RegExp(`^${nombre}=\\s*$`).test(linea)),
      );
      expect({ ejemplo, faltantes }).toEqual({ ejemplo, faltantes: [] });

      const conValor = lineas
        .map((linea, indice) => ({ numero: indice + 1, linea: linea.trim() }))
        .filter(({ linea }) => linea !== '' && !linea.startsWith('#'))
        .filter(({ linea }) => !/^[A-Za-z_][A-Za-z0-9_]*=\s*$/.test(linea))
        // Solo el número de línea: nunca se imprime el valor.
        .map(({ numero }) => numero);
      expect({ ejemplo, lineasConValor: conValor }).toEqual({ ejemplo, lineasConValor: [] });
    }

    // 3. Ningún otro archivo de variables de entorno versionado.
    const listado = ejecutar('git', ['-C', repo, 'ls-files', '-z']);
    expect(listado.status).toBe(0);
    const otrosArchivosDeVariables = listado.stdout
      .split('\0')
      .filter((archivo) => archivo !== '')
      .filter(esArchivoDeVariables)
      .filter((archivo) => !/^replica\/entornos\/[^/]+\.env\.example$/.test(archivo));
    expect(otrosArchivosDeVariables).toEqual([]);

    // 4. Control positivo: un repo temporal con una clave privada generada en el momento.
    const repoTemporal = mkdtempSync(path.join(tmpdir(), 'seg-c10-repo-'));
    const carpetaInforme = mkdtempSync(path.join(tmpdir(), 'seg-c10-informe-'));
    temporales.push(repoTemporal, carpetaInforme);

    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    writeFileSync(path.join(repoTemporal, 'clave-de-mentira.txt'), privateKey, 'utf8');

    const git = (...argumentos: string[]): void => {
      const resultado = ejecutar('git', [
        '-C',
        repoTemporal,
        '-c',
        'user.name=Prueba SEG-c10',
        '-c',
        'user.email=seg-c10@example.com',
        '-c',
        'commit.gpgsign=false',
        ...argumentos,
      ]);
      expect({ git: argumentos[0], codigo: resultado.status, error: resultado.stderr }).toEqual({
        git: argumentos[0],
        codigo: 0,
        error: expect.any(String),
      });
    };
    git('init', '--quiet');
    git('add', 'clave-de-mentira.txt');
    git('commit', '--quiet', '-m', 'secreto de mentira para el control positivo');

    const informe = path.join(carpetaInforme, 'informe.json');
    const control = ejecutar('gitleaks', [
      'git',
      repoTemporal,
      '--log-opts=--all',
      '--redact',
      '--no-banner',
      '--report-format',
      'json',
      '--report-path',
      informe,
      ...argumentosDeConfiguracion(repo),
    ]);
    expect(control.status).not.toBe(0);
    const hallazgos = JSON.parse(readFileSync(informe, 'utf8')) as Array<{ File: string }>;
    expect(hallazgos.map((hallazgo) => hallazgo.File)).toContain('clave-de-mentira.txt');
  });
});
