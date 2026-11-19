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
//   4. ningún archivo de replica/datos-iniciales/ lee algo fuera de ella, con una lista blanca:
//      - la carpeta tiene exactamente datos-iniciales.sql y cargar.sh;
//      - datos-iniciales.sql no tiene comandos del cliente de mysql (`\x` fuera de cadenas), ni una sentencia que
//        empiece con `source`, ni LOAD DATA, INFILE o LOAD_FILE;
//      - cargar.sh (sin sus líneas de comentario) no usa otro cliente o programa de red ni una URL, cada invocación
//        de `mysql` lleva -h"$DB_HOST", y la única redirección de entrada es < "$SQL", con
//        SQL="/datos-iniciales/datos-iniciales.sql" asignado una sola vez.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { abrirConexion, consultar } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { rutaRepo } from '../apoyo/entorno';

const MARCA_DE_MENTIRA = 'FALSO-NO-ES-MERCADOPAGO-';
const PREFIJOS_REALES = ['APP_USR-', 'TEST-'];
const MONTAJE_DE_LA_CARGA = './replica/datos-iniciales:/datos-iniciales:ro';
const CARPETA_DE_DATOS = 'replica/datos-iniciales';

/** Los únicos archivos de la carpeta de datos, ordenados. */
const ARCHIVOS_DE_DATOS = ['cargar.sh', 'datos-iniciales.sql'];

// --- Reglas de datos-iniciales.sql ---
/** Un comando del cliente de mysql (`\.`, `\!`, `\T`…), fuera de cadenas entre comillas. */
const COMANDO_DEL_CLIENTE = /\\[.!a-zA-Z]/;
/** Una sentencia que empieza con `source`, fuera de cadenas entre comillas. */
const SENTENCIA_SOURCE = /(^|;)\s*source\b/im;
/** Lecturas de archivos del servidor, en cualquier parte del texto. */
const LECTURA_DE_ARCHIVOS = /load\s+data|infile|load_file/i;

// --- Reglas de cargar.sh ---
/** Otro cliente de MySQL o un programa de red. */
const OTRO_PROGRAMA = /\b(mysqldump|mysqlimport|mysqlpump|curl|wget|nc|ncat|scp|ssh|rsync|ftp)\b/;
const URL = /https?:\/\//;
/** Una invocación de `mysql`: la palabra seguida de espacio y una opción (no MYSQL_PWD ni $MYSQL_USER). */
const INVOCACION_DE_MYSQL = /\bmysql[ \t]+-/g;
const HOST_DE_LA_BASE = '-h"$DB_HOST"';
const REDIRECCION_PERMITIDA = /^<[ \t]*"\$SQL"/;
/** Una asignación a la variable SQL (no a MYSQL_… ni a "$SQL"). */
const ASIGNACION_DE_SQL = /(?<![\w$])SQL\+?=/g;
const ASIGNACION_ESPERADA = 'SQL="/datos-iniciales/datos-iniciales.sql"';

/**
 * El SQL con el contenido de las cadenas entre comillas simples o dobles vaciado, y los saltos de línea conservados
 * (para numerar). Los comentarios (`-- `, `#`, `/* *\/`) quedan como texto visible, sin abrir cadenas.
 */
function sqlFueraDeCadenas(sql: string): string {
  let visible = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const esComentarioDeLinea =
      c === '#' || (c === '-' && sql[i + 1] === '-' && (sql[i + 2] === undefined || /\s/.test(sql[i + 2])));
    if (esComentarioDeLinea) {
      const fin = sql.indexOf('\n', i);
      const hasta = fin < 0 ? sql.length : fin;
      visible += sql.slice(i, hasta);
      i = hasta;
    } else if (c === '/' && sql[i + 1] === '*') {
      const fin = sql.indexOf('*/', i + 2);
      const hasta = fin < 0 ? sql.length : fin + 2;
      visible += sql.slice(i, hasta);
      i = hasta;
    } else if (c === "'" || c === '"') {
      visible += c;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === '\\') {
          visible += sql[i + 1] === '\n' ? '\n' : '';
          i += 2;
        } else if (sql[i] === c && sql[i + 1] === c) {
          i += 2;
        } else if (sql[i] === c) {
          break;
        } else {
          visible += sql[i] === '\n' ? '\n' : '';
          i += 1;
        }
      }
      visible += c;
      i += 1;
    } else {
      visible += c;
      i += 1;
    }
  }
  return visible;
}

/** Los hallazgos de datos-iniciales.sql, como `regla (línea n)`. */
function hallazgosDelSql(sql: string): string[] {
  const hallazgos: string[] = [];
  const visible = sqlFueraDeCadenas(sql);
  visible.split(/\r?\n/).forEach((linea, indice) => {
    if (COMANDO_DEL_CLIENTE.test(linea)) {
      hallazgos.push(`datos-iniciales.sql:${indice + 1} comando del cliente de mysql`);
    }
  });
  if (SENTENCIA_SOURCE.test(visible)) {
    hallazgos.push('datos-iniciales.sql: una sentencia empieza con source');
  }
  sql.split(/\r?\n/).forEach((linea, indice) => {
    if (LECTURA_DE_ARCHIVOS.test(linea)) {
      hallazgos.push(`datos-iniciales.sql:${indice + 1} LOAD DATA, INFILE o LOAD_FILE`);
    }
  });
  return hallazgos;
}

/** Los hallazgos de cargar.sh, sin sus líneas de comentario, como `regla (línea n)`. */
function hallazgosDelScript(script: string): string[] {
  const hallazgos: string[] = [];
  // Las líneas de código, con su número; las continuaciones con `\` se unen a su línea.
  const lineas: Array<{ numero: number; texto: string }> = [];
  let pendiente: { numero: number; texto: string } | undefined;
  script.split(/\r?\n/).forEach((linea, indice) => {
    if (pendiente === undefined && /^\s*#/.test(linea)) {
      return;
    }
    const actual = pendiente ?? { numero: indice + 1, texto: '' };
    if (/\\$/.test(linea)) {
      actual.texto += `${linea.slice(0, -1)} `;
      pendiente = actual;
    } else {
      actual.texto += linea;
      lineas.push(actual);
      pendiente = undefined;
    }
  });
  if (pendiente !== undefined) {
    lineas.push(pendiente);
  }

  let invocaciones = 0;
  let redirecciones = 0;
  let asignaciones = 0;
  for (const { numero, texto } of lineas) {
    const donde = `cargar.sh:${numero}`;
    if (OTRO_PROGRAMA.test(texto)) {
      hallazgos.push(`${donde} otro cliente o programa de red`);
    }
    if (URL.test(texto)) {
      hallazgos.push(`${donde} una URL`);
    }
    for (const invocacion of texto.matchAll(INVOCACION_DE_MYSQL)) {
      invocaciones += 1;
      if (!texto.slice(invocacion.index as number).includes(HOST_DE_LA_BASE)) {
        hallazgos.push(`${donde} mysql sin ${HOST_DE_LA_BASE}`);
      }
    }
    for (let i = texto.indexOf('<'); i >= 0; i = texto.indexOf('<', i + 1)) {
      redirecciones += 1;
      if (!REDIRECCION_PERMITIDA.test(texto.slice(i))) {
        hallazgos.push(`${donde} una redirección de entrada que no es < "$SQL"`);
      }
    }
    for (const asignacion of texto.matchAll(ASIGNACION_DE_SQL)) {
      asignaciones += 1;
      // Desde `SQL=` hasta el final de la línea (sin un comentario al final) es exactamente la asignación esperada.
      const resto = texto.slice(asignacion.index as number).replace(/\s+#.*$/, '').trimEnd();
      if (resto !== ASIGNACION_ESPERADA) {
        hallazgos.push(`${donde} SQL no se asigna como ${ASIGNACION_ESPERADA}`);
      }
    }
  }
  // Control positivo: el script invoca mysql y lee el SQL por la redirección.
  if (invocaciones === 0) {
    hallazgos.push('cargar.sh: no se encontró ninguna invocación de mysql');
  }
  if (redirecciones === 0) {
    hallazgos.push('cargar.sh: no se encontró la redirección < "$SQL"');
  }
  if (asignaciones !== 1) {
    hallazgos.push(`cargar.sh: SQL se asigna ${asignaciones} veces, se esperaba una`);
  }
  return hallazgos;
}

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

    // 4. Ningún archivo de replica/datos-iniciales/ lee algo fuera de la carpeta (lista blanca).
    const carpeta = path.join(repo, CARPETA_DE_DATOS);
    // La carpeta tiene exactamente el SQL y el script de carga.
    const archivos = archivosDe(carpeta)
      .map((archivo) => path.relative(carpeta, archivo).split(path.sep).join('/'))
      .sort();
    expect(archivos).toEqual(ARCHIVOS_DE_DATOS);

    const hallazgos = [
      ...hallazgosDelSql(readFileSync(path.join(carpeta, 'datos-iniciales.sql'), 'utf8')),
      ...hallazgosDelScript(readFileSync(path.join(carpeta, 'cargar.sh'), 'utf8')),
    ];
    expect(hallazgos).toEqual([]);
  });
});
