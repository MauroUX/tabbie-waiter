// Change tk-02-datos-iniciales · apoyo de las pruebas locales: el REST de Firebase Auth y las variables de las cuentas.
// No cubre scenarios. Lo usan las pruebas marcadas locales (DP-43), que corren solo con PRUEBAS_LOCALES=1.
// Nunca devuelve en un mensaje un token, una contraseña, la API key ni la URL con `?key=`: los errores nombran
// el método y el código de Firebase, y las variables que faltan se nombran sin su valor.
import jwt from 'jsonwebtoken';

const BASE_IDENTITY_TOOLKIT = 'https://identitytoolkit.googleapis.com/v1';

/** Audiencia de un custom token de Firebase (design.md, D9). */
export const AUDIENCIA_CUSTOM_TOKEN =
  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

/** Devuelve la variable o falla con un mensaje que la nombra, sin mostrar valores. */
export function variableLocal(nombre: string): string {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') {
    throw new Error(
      `Falta la variable de entorno ${nombre}: la necesitan las pruebas locales con Firebase (PRUEBAS_LOCALES=1).`,
    );
  }
  return valor;
}

/** Los nombres de la lista que no están definidos en el entorno (solo nombres, nunca valores). */
export function variablesQueFaltan(nombres: string[]): string[] {
  return nombres.filter((nombre) => process.env[nombre] === undefined || process.env[nombre] === '');
}

/**
 * Nombre de la variable con la contraseña de una cuenta (DP-71, design.md D6):
 * `CONTRASENA_` + la parte local del email sin el prefijo `waiterapp.`, en mayúsculas,
 * con `_` por cada carácter que no es letra ni número.
 * `waiterapp.mozo1.r1@example.com` → `CONTRASENA_MOZO1_R1`.
 */
export function variableDeContrasena(email: string): string {
  const parteLocal = email.split('@')[0].replace(/^waiterapp\./, '');
  return `CONTRASENA_${parteLocal.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
}

type Objeto = Record<string, unknown>;

interface RespuestaDeFirebase {
  estado: number;
  cuerpo: Objeto;
}

/** Código de error que devuelve Firebase (por ejemplo, INVALID_LOGIN_CREDENTIALS), sin el resto del cuerpo. */
function codigoDeError(cuerpo: Objeto): string | undefined {
  const error = cuerpo.error;
  if (typeof error === 'object' && error !== null && typeof (error as Objeto).message === 'string') {
    return (error as Objeto).message as string;
  }
  return undefined;
}

async function llamar(metodo: string, cuerpo: Objeto): Promise<RespuestaDeFirebase> {
  const clave = variableLocal('FIREBASE_WEB_API_KEY');
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE_IDENTITY_TOOLKIT}/accounts:${metodo}?key=${encodeURIComponent(clave)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  } catch (error) {
    // Solo el nombre del método: el mensaje de fetch no lleva la URL, pero tampoco se arrastra la causa.
    const motivo = error instanceof Error ? error.message : 'error desconocido';
    throw new Error(`No se pudo llamar a accounts:${metodo} de Firebase: ${motivo}`);
  }
  let json: unknown;
  try {
    json = await respuesta.json();
  } catch {
    json = {};
  }
  return {
    estado: respuesta.status,
    cuerpo: typeof json === 'object' && json !== null ? (json as Objeto) : {},
  };
}

export interface InicioDeSesion {
  estado: number;
  /** El email que devuelve Firebase. */
  email?: string;
  /** El ID token. No se imprime ni entra en una aserción. */
  idToken?: string;
  /** Código de error de Firebase, si lo hubo. */
  error?: string;
}

/** REST `accounts:signInWithPassword` con `{email, password, returnSecureToken: true}`. */
export async function iniciarSesion(email: string, contrasena: string): Promise<InicioDeSesion> {
  const { estado, cuerpo } = await llamar('signInWithPassword', {
    email,
    password: contrasena,
    returnSecureToken: true,
  });
  return {
    estado,
    email: typeof cuerpo.email === 'string' ? cuerpo.email : undefined,
    idToken: typeof cuerpo.idToken === 'string' ? cuerpo.idToken : undefined,
    error: codigoDeError(cuerpo),
  };
}

export interface DatosDeCuenta {
  estado: number;
  /** `users[0].createdAt`, en ms desde la época. */
  creadaEn?: number;
  /** `users[0].passwordUpdatedAt`, en ms desde la época. */
  contrasenaCambiadaEn?: number;
  error?: string;
}

function comoNumero(valor: unknown): number | undefined {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return valor;
  }
  if (typeof valor === 'string' && valor.trim() !== '' && Number.isFinite(Number(valor))) {
    return Number(valor);
  }
  return undefined;
}

/** REST `accounts:lookup` con `{idToken}`: la fecha de creación y la de la última contraseña. */
export async function consultarCuenta(idToken: string): Promise<DatosDeCuenta> {
  const { estado, cuerpo } = await llamar('lookup', { idToken });
  const usuarios = Array.isArray(cuerpo.users) ? (cuerpo.users as Objeto[]) : [];
  const [usuario] = usuarios;
  return {
    estado,
    creadaEn: usuario ? comoNumero(usuario.createdAt) : undefined,
    contrasenaCambiadaEn: usuario ? comoNumero(usuario.passwordUpdatedAt) : undefined,
    error: codigoDeError(cuerpo),
  };
}

export interface CanjeDeCustomToken {
  estado: number;
  /** El ID token. No se imprime ni entra en una aserción. */
  idToken?: string;
  error?: string;
}

/** REST `accounts:signInWithCustomToken` con `{token, returnSecureToken: true}`. */
export async function canjearCustomToken(customToken: string): Promise<CanjeDeCustomToken> {
  const { estado, cuerpo } = await llamar('signInWithCustomToken', {
    token: customToken,
    returnSecureToken: true,
  });
  return {
    estado,
    idToken: typeof cuerpo.idToken === 'string' ? cuerpo.idToken : undefined,
    error: codigoDeError(cuerpo),
  };
}

/**
 * Firma un custom token RS256 con la cuenta de servicio (FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY):
 * `iss` y `sub` = el email de la cuenta de servicio, `aud` de Identity Toolkit, `uid` y vencimiento de 1 h.
 * `iat` lo pone jsonwebtoken con el reloj: solo para que la firma sea válida, no entra en ninguna aserción.
 */
export function firmarCustomToken(uid: string): string {
  const cuentaDeServicio = variableLocal('FIREBASE_CLIENT_EMAIL');
  // La clave llega en una sola línea, con `\n` escritos como en el JSON de la cuenta de servicio.
  const clavePrivada = variableLocal('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
  return jwt.sign({ uid }, clavePrivada, {
    algorithm: 'RS256',
    issuer: cuentaDeServicio,
    subject: cuentaDeServicio,
    audience: AUDIENCIA_CUSTOM_TOKEN,
    expiresIn: 3600,
  });
}
