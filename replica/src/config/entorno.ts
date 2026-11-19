// Lectura y validación de las variables de entorno de la réplica (infraestructura.md, sección 5).
// Una variable obligatoria que falta termina el arranque con un error que la nombra; nunca muestra valores.

export interface EntornoDeBaseDeDatos {
  host: string;
  puerto: number;
  usuario: string;
  clave: string;
  nombre: string;
}

export type EntornoDeRedis = { url: string } | { host: string; puerto: number; clave: string };

/** Con `USE_FIREBASE` desactivada no hay credenciales y no se inicializa nada (DP-43). */
export type EntornoDeFirebase =
  | { activado: false }
  | { activado: true; projectId: string; clientEmail: string; privateKey: string };

export interface Entorno {
  puerto: number;
  baseDeDatos: EntornoDeBaseDeDatos;
  redis: EntornoDeRedis;
  /** Vencimiento, en segundos, de las solicitudes de cobro en Redis (DP-80). */
  redisExpiracionSegundos: number;
  jwtSecret: string;
  firebase: EntornoDeFirebase;
}

export class EntornoIncompleto extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntornoIncompleto';
  }
}

type Variables = Record<string, string | undefined>;

const PUERTO_POR_DEFECTO = 3000;
const REDIS_EXPIRACION_POR_DEFECTO = 3600;

/** Una variable vacía cuenta como ausente: compose pasa `VAR: ${VAR:-}` aunque no esté definida. */
function leer(variables: Variables, nombre: string): string | undefined {
  const valor = variables[nombre];
  return valor === undefined || valor.trim() === '' ? undefined : valor;
}

function aPuerto(nombre: string, valor: string, invalidas: string[]): number {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1 || numero > 65535) {
    invalidas.push(nombre);
    return 0;
  }
  return numero;
}

/** Devuelve el entorno ya validado o lanza `EntornoIncompleto` con los nombres de las variables que fallan. */
export function leerEntorno(variables: Variables = process.env): Entorno {
  const faltan: string[] = [];
  const invalidas: string[] = [];
  const valoresInvalidos: string[] = [];

  const obligatoria = (nombre: string): string => {
    const valor = leer(variables, nombre);
    if (valor === undefined) {
      faltan.push(nombre);
      return '';
    }
    return valor;
  };

  const host = obligatoria('DB_HOST');
  const puertoDb = obligatoria('DB_PORT');
  const usuario = obligatoria('DB_USER');
  const clave = obligatoria('DB_PASSWORD');
  const nombre = obligatoria('DB_NAME');
  const jwtSecret = obligatoria('JWT_SECRET');

  let redis: EntornoDeRedis;
  const redisUrl = leer(variables, 'REDIS_URL');
  if (redisUrl !== undefined) {
    redis = { url: redisUrl };
  } else {
    const redisHost = leer(variables, 'REDIS_HOST');
    const redisPuerto = leer(variables, 'REDIS_PORT');
    const redisClave = leer(variables, 'REDIS_PASSWORD');
    const sinUrl: string[] = [];
    if (redisHost === undefined) sinUrl.push('REDIS_HOST');
    if (redisPuerto === undefined) sinUrl.push('REDIS_PORT');
    if (redisClave === undefined) sinUrl.push('REDIS_PASSWORD');
    if (sinUrl.length > 0) {
      faltan.push(`REDIS_URL (o, sin ella, ${sinUrl.join(', ')})`);
    }
    redis = {
      host: redisHost ?? '',
      puerto: redisPuerto === undefined ? 0 : aPuerto('REDIS_PORT', redisPuerto, invalidas),
      clave: redisClave ?? '',
    };
  }

  // USE_FIREBASE se activa solo con el valor `true`; activada, las tres credenciales son obligatorias.
  const firebaseActivado = leer(variables, 'USE_FIREBASE') === 'true';
  let firebase: EntornoDeFirebase = { activado: false };
  if (firebaseActivado) {
    const projectId = obligatoria('FIREBASE_PROJECT_ID');
    const clientEmail = obligatoria('FIREBASE_CLIENT_EMAIL');
    const privateKey = obligatoria('FIREBASE_PRIVATE_KEY');
    // La clave llega con los saltos de línea escritos como \n (dos caracteres): se convierten en saltos reales.
    firebase = { activado: true, projectId, clientEmail, privateKey: privateKey.split('\\n').join('\n') };
  }

  // DP-80: vacía o ausente, 3600 s; un entero positivo, esos segundos; otro valor, el arranque falla sin mostrarlo.
  const expiracionTexto = leer(variables, 'REDIS_EXPIRATION_TIME');
  let redisExpiracionSegundos = REDIS_EXPIRACION_POR_DEFECTO;
  if (expiracionTexto !== undefined) {
    const segundos = Number(expiracionTexto.trim());
    if (/^\d+$/.test(expiracionTexto.trim()) && Number.isSafeInteger(segundos) && segundos > 0) {
      redisExpiracionSegundos = segundos;
    } else {
      valoresInvalidos.push('REDIS_EXPIRATION_TIME');
    }
  }

  const puertoTexto = leer(variables, 'PORT');
  const puerto = puertoTexto === undefined ? PUERTO_POR_DEFECTO : aPuerto('PORT', puertoTexto, invalidas);
  const puertoBaseDeDatos = puertoDb === '' ? 0 : aPuerto('DB_PORT', puertoDb, invalidas);

  const problemas: string[] = [];
  if (faltan.length > 0) {
    problemas.push(`Faltan variables de entorno obligatorias: ${faltan.join(', ')}.`);
  }
  if (invalidas.length > 0) {
    problemas.push(`Variables de entorno con un puerto inválido: ${invalidas.join(', ')}.`);
  }
  if (valoresInvalidos.length > 0) {
    problemas.push(`Variables de entorno con un valor inválido (tiene que ser un entero positivo de segundos): ${valoresInvalidos.join(', ')}.`);
  }
  if (problemas.length > 0) {
    throw new EntornoIncompleto(problemas.join(' '));
  }

  return {
    puerto,
    baseDeDatos: { host, puerto: puertoBaseDeDatos, usuario, clave, nombre },
    redis,
    redisExpiracionSegundos,
    jwtSecret,
    firebase,
  };
}
