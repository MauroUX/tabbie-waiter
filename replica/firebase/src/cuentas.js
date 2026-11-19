'use strict';
// Cuentas de prueba en Firebase (TK-02, D6; DP-71).
// La lista de cuentas sale de la tabla `user` de la base cargada (isGuest = 0): no hay una segunda lista a mano.
//
// Modos (primer argumento):
//   lista  imprime por stdout solo los emails, uno por línea. No toca Firebase ni pide sus variables.
//   plan   busca cada email en Firebase Admin e informa "existe" o "la crearía". No escribe nada.
//   crear  comprueba que estén todas las CONTRASENA_<PAPEL>; después crea solo las cuentas que no existen.
//
// Solo usa getUserByEmail y createUser. Nunca listUsers, updateUser ni deleteUser, y nunca imprime contraseñas
// ni credenciales. Un error termina con código distinto de 0 y un mensaje por stderr.

const mysql = require('mysql2/promise');

const DOMINIO = '@example.com';
const PREFIJO_LOCAL = 'waiterapp.';

function fallar(mensaje) {
  console.error(`cuentas: ${mensaje}`);
  process.exit(1);
}

function exigir(nombres) {
  const faltan = nombres.filter((nombre) => !process.env[nombre]);
  if (faltan.length > 0) {
    fallar(`faltan variables de entorno: ${faltan.join(', ')}`);
  }
}

/** CONTRASENA_ + la parte local sin `waiterapp.`, en mayúsculas, con `_` por cada carácter que no es letra ni número. */
function variableDeContrasena(email) {
  let parteLocal = email.split('@')[0];
  if (parteLocal.startsWith(PREFIJO_LOCAL)) {
    parteLocal = parteLocal.slice(PREFIJO_LOCAL.length);
  }
  return `CONTRASENA_${parteLocal.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
}

async function leerUsuarios() {
  exigir(['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']);
  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  });
  try {
    const [filas] = await conexion.query('SELECT email, name FROM `user` WHERE isGuest = 0 ORDER BY id');
    return filas;
  } finally {
    await conexion.end();
  }
}

function abrirFirebase() {
  exigir(['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL']);
  const admin = require('firebase-admin');
  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
  return admin.auth(app);
}

async function existe(auth, email) {
  try {
    await auth.getUserByEmail(email);
    return true;
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') {
      return false;
    }
    throw error;
  }
}

async function principal() {
  const modo = process.argv[2];
  if (!['lista', 'plan', 'crear'].includes(modo)) {
    fallar(`modo desconocido${modo ? ` "${modo}"` : ''}: se esperaba lista, plan o crear`);
  }

  const usuarios = await leerUsuarios();
  if (usuarios.length === 0) {
    fallar('la tabla user no tiene cuentas: ¿se cargaron los datos iniciales?');
  }
  const ajenos = usuarios.filter(({ email }) => !String(email).endsWith(DOMINIO));
  if (ajenos.length > 0) {
    fallar(`${ajenos.length} email(s) de user no terminan en ${DOMINIO}: el script no toca cuentas que no son de prueba`);
  }

  if (modo === 'lista') {
    for (const { email } of usuarios) {
      console.log(email);
    }
    return;
  }

  if (modo === 'plan') {
    const auth = abrirFirebase();
    let existentes = 0;
    let nuevas = 0;
    for (const { email } of usuarios) {
      if (await existe(auth, email)) {
        existentes += 1;
        console.log(`${email}: existe`);
      } else {
        nuevas += 1;
        console.log(`${email}: la crearía`);
      }
    }
    console.log(`plan: la crearía: ${nuevas} · existentes: ${existentes} (no se escribió nada)`);
    return;
  }

  // crear: primero todas las variables, sin crear ninguna si falta alguna.
  const faltan = usuarios.map(({ email }) => variableDeContrasena(email)).filter((nombre) => !process.env[nombre]);
  if (faltan.length > 0) {
    fallar(`faltan variables de contraseña, no se creó ninguna cuenta: ${faltan.join(', ')}`);
  }
  const auth = abrirFirebase();
  let creadas = 0;
  let existentes = 0;
  for (const { email, name } of usuarios) {
    if (await existe(auth, email)) {
      existentes += 1;
      console.log(`${email}: ya existía`);
      continue;
    }
    await auth.createUser({
      email,
      password: process.env[variableDeContrasena(email)],
      displayName: name || undefined,
    });
    creadas += 1;
    console.log(`${email}: creada`);
  }
  console.log(`creadas: ${creadas} · existentes: ${existentes}`);
}

principal().catch((error) => {
  const detalle = error && error.code ? `${error.code}` : error && error.message ? error.message : String(error);
  fallar(`error: ${detalle}`);
});
