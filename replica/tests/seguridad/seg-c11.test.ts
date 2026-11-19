// Change tk-02-datos-iniciales · spec datos-iniciales · scenario
// "SEG-c11 · Datos iniciales sintéticos y cuentas de prueba reconocibles", parte de la base, MercadoPago y la carga.
// La parte de la lista del script (modo `lista` del servicio `cuentas`) va en datos/carga-desde-cero.sh, con el mismo ID.
// Decisiones: DP-71 (marca FALSO-NO-ES-MERCADOPAGO- y emails waiterapp.<papel>@example.com), PR-2, PR-3.
// Corre en la CI (DP-43), contra la réplica recién creada y cargada por el servicio `carga`.
// Comprueba:
//   1. cada `user.email` termina en @example.com (control positivo: hay usuarios);
//   2. cada mercadoPagoToken y mercadoPagoRefreshToken empieza con la marca y no con APP_USR- ni TEST-
//      (control positivo: hay restaurantes);
//   3. el servicio `carga` de compose.yaml monta del repo solo ./replica/datos-iniciales, de solo lectura,
//      y existe el servicio `cuentas` en el perfil `firebase`;
//   4. ningún archivo de replica/datos-iniciales/ tiene LOAD DATA, INFILE, SOURCE ni una línea que empiece con `\.`
//      (control positivo: están datos-iniciales.sql y cargar.sh).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { abrirConexion, consultar } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { rutaRepo } from '../apoyo/entorno';

const MARCA_DE_MENTIRA = 'FALSO-NO-ES-MERCADOPAGO-';
const PREFIJOS_REALES = ['APP_USR-', 'TEST-'];
const MONTAJE_DE_LA_CARGA = './replica/datos-iniciales:/datos-iniciales:ro';
const CARPETA_DE_DATOS = 'replica/datos-iniciales';

/** Lo que lee algo fuera de la carpeta: sin distinguir mayúsculas. */
const LECTURAS_PROHIBIDAS: Array<{ nombre: string; patron: RegExp }> = [
  { nombre: 'LOAD DATA', patron: /LOAD\s+DATA/i },
  { nombre: 'INFILE', patron: /INFILE/i },
  { nombre: 'SOURCE', patron: /SOURCE /i },
  { nombre: '\\.', patron: /^\s*\\\./ },
];

type Objeto = Record<string, unknown>;

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Un montaje que viene del repo o de la máquina: ruta relativa o absoluta, no un volumen con nombre. */
function montaAlgoDelRepo(entrada: unknown): boolean {
  if (typeof entrada === 'string') {
    const origen = entrada.split(':')[0];
    return origen.startsWith('.') || origen.startsWith('/') || origen.startsWith('~');
  }
  if (esObjeto(entrada)) {
    const origen = typeof entrada.source === 'string' ? entrada.source : '';
    return entrada.type === 'bind' || origen.startsWith('.') || origen.startsWith('/') || origen.startsWith('~');
  }
  return false;
}

function archivosDe(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivosDe(ruta) : [ruta];
  });
}

describe('SEG-c11 · Datos iniciales sintéticos y cuentas de prueba reconocibles', () => {
  let conexion: Conexion | undefined;

  beforeAll(async () => {
    conexion = await abrirConexion();
  });

  afterAll(async () => {
    await conexion?.end();
  });

  test('SEG-c11 · Datos iniciales sintéticos y cuentas de prueba reconocibles (base, MercadoPago y carga)', async () => {
    const base = conexion as Conexion;
    const repo = rutaRepo();

    // 1. Cada email de `user` es del dominio reservado para ejemplos.
    const usuarios = await consultar<{ email: string }>(base, 'SELECT email FROM `user` ORDER BY id');
    // Control positivo: con la base vacía la comprobación pasaría sin mirar nada.
    expect(usuarios.length).toBeGreaterThan(0);
    const emailsAjenos = usuarios.map(({ email }) => email).filter((email) => !email.endsWith('@example.com'));
    expect(emailsAjenos).toEqual([]);

    // 2. Los valores de MercadoPago son de mentira y reconocibles como tales.
    const restaurantes = await consultar<{
      id: string;
      mercadoPagoToken: string | null;
      mercadoPagoRefreshToken: string | null;
    }>(base, 'SELECT id, mercadoPagoToken, mercadoPagoRefreshToken FROM `restaurant` ORDER BY id');
    // Control positivo: hay restaurantes que mirar.
    expect(restaurantes.length).toBeGreaterThan(0);
    for (const restaurante of restaurantes) {
      for (const campo of ['mercadoPagoToken', 'mercadoPagoRefreshToken'] as const) {
        const valor = restaurante[campo] ?? '';
        expect({
          restaurante: restaurante.id,
          campo,
          conLaMarca: valor.startsWith(MARCA_DE_MENTIRA),
          conFormaReal: PREFIJOS_REALES.some((prefijo) => valor.startsWith(prefijo)),
        }).toEqual({ restaurante: restaurante.id, campo, conLaMarca: true, conFormaReal: false });
      }
    }

    // 3. El servicio de carga monta del repo solo replica/datos-iniciales/, de solo lectura.
    const rutaCompose = path.join(repo, 'compose.yaml');
    const compose = yaml.load(readFileSync(rutaCompose, 'utf8'));
    expect(esObjeto(compose)).toBe(true);
    const servicios = (compose as Objeto).services;
    expect(esObjeto(servicios)).toBe(true);
    const carga = (servicios as Objeto).carga;
    expect({ servicio: 'carga', existe: esObjeto(carga) }).toEqual({ servicio: 'carga', existe: true });
    const volumenes = esObjeto(carga) && Array.isArray(carga.volumes) ? (carga.volumes as unknown[]) : [];
    const montajesDelRepo = volumenes
      .filter(montaAlgoDelRepo)
      .map((entrada) => (typeof entrada === 'string' ? entrada : JSON.stringify(entrada)));
    expect(montajesDelRepo).toEqual([MONTAJE_DE_LA_CARGA]);

    // El servicio del script de replica/firebase/ existe, en el perfil `firebase`.
    const cuentas = (servicios as Objeto).cuentas;
    const perfiles = esObjeto(cuentas) && Array.isArray(cuentas.profiles) ? (cuentas.profiles as unknown[]) : [];
    expect({ servicio: 'cuentas', existe: esObjeto(cuentas), enFirebase: perfiles.includes('firebase') }).toEqual({
      servicio: 'cuentas',
      existe: true,
      enFirebase: true,
    });

    // 4. Ningún archivo de replica/datos-iniciales/ lee algo fuera de la carpeta.
    const carpeta = path.join(repo, CARPETA_DE_DATOS);
    // Control positivo: la carpeta tiene el SQL y el script de carga.
    for (const nombre of ['datos-iniciales.sql', 'cargar.sh']) {
      expect({ archivo: nombre, existe: existsSync(path.join(carpeta, nombre)) }).toEqual({
        archivo: nombre,
        existe: true,
      });
    }
    const hallazgos: string[] = [];
    for (const archivo of archivosDe(carpeta)) {
      const relativo = path.relative(repo, archivo).split(path.sep).join('/');
      readFileSync(archivo, 'utf8')
        .split(/\r?\n/)
        .forEach((linea, indice) => {
          for (const { nombre, patron } of LECTURAS_PROHIBIDAS) {
            if (patron.test(linea)) {
              hallazgos.push(`${relativo}:${indice + 1} (${nombre})`);
            }
          }
        });
    }
    expect(hallazgos).toEqual([]);
  });
});
