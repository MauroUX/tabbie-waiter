// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas de contrato: borrar lo que crearon las llamadas
// a la réplica. No cubre scenarios. `Sembrado` borra lo que insertó la prueba; esto borra lo que insertó la réplica
// (sesiones, su intermedia, pedidos con su árbol, pagos e invitados) en los restaurantes propios de la prueba, para
// que `datos/contenido.test.ts` siga viendo la base recién cargada. Corre antes de `Sembrado.deshacer()`.
import { consultar } from './base';
import type { Conexion } from './base';

export interface LoQueCreoLaReplica {
  /** Los uuid de los restaurantes que sembró la prueba. */
  restaurantes: string[];
  /** Los emails `invitado.<guestId>@example.com` de los invitados que pidió la prueba (DP-72). */
  emailsDeInvitados: string[];
}

type Lista = Array<number | string>;

async function ids(conexion: Conexion, sql: string, parametros: unknown[]): Promise<Lista> {
  const filas = await consultar<{ id: number | string }>(conexion, sql, parametros);
  return filas.map((fila) => fila.id);
}

/** `DELETE`/`UPDATE` con `col IN (?) OR …`, solo con las listas que no están vacías; si todas lo están, no hace nada. */
async function ejecutarDonde(conexion: Conexion, inicio: string, condiciones: Array<[string, Lista]>): Promise<void> {
  const conDatos = condiciones.filter(([, lista]) => lista.length > 0);
  if (conDatos.length === 0) {
    return;
  }
  const donde = conDatos.map(([columna]) => `\`${columna}\` IN (?)`).join(' OR ');
  await conexion.query(`${inicio} WHERE ${donde}`, conDatos.map(([, lista]) => lista));
}

export async function borrarLoQueCreoLaReplica(
  conexion: Conexion,
  { restaurantes, emailsDeInvitados }: LoQueCreoLaReplica,
): Promise<void> {
  const mesas =
    restaurantes.length > 0
      ? await ids(conexion, 'SELECT id FROM `table` WHERE restaurantId IN (?)', [restaurantes])
      : [];
  const sesiones =
    mesas.length > 0 ? await ids(conexion, 'SELECT id FROM `table_session` WHERE tableId IN (?)', [mesas]) : [];
  const invitados =
    emailsDeInvitados.length > 0
      ? await ids(conexion, 'SELECT id FROM `user` WHERE email IN (?)', [emailsDeInvitados])
      : [];

  // La mesa vuelve a libre.
  await ejecutarDonde(conexion, 'UPDATE `table` SET isBusy = 0, activeSessionId = NULL', [['id', mesas]]);
  // Los pedidos (sus líneas y opciones elegidas caen en cascada).
  await ejecutarDonde(conexion, 'DELETE FROM `order`', [
    ['restaurantId', restaurantes],
    ['tableSessionId', sesiones],
    ['userId', invitados],
  ]);
  await ejecutarDonde(conexion, 'DELETE FROM `payment`', [
    ['sessionId', sesiones],
    ['userId', invitados],
  ]);
  await ejecutarDonde(conexion, 'DELETE FROM `table_session_users_user`', [
    ['tableSessionId', sesiones],
    ['userId', invitados],
  ]);
  await ejecutarDonde(conexion, 'DELETE FROM `table_session`', [['id', sesiones]]);
  await ejecutarDonde(conexion, 'DELETE FROM `user`', [['id', invitados]]);
}

/** El máximo `id` de la tabla más 1 000 000, comprobado como inexistente. */
export async function idInexistente(conexion: Conexion, tabla: 'table_session' | 'order'): Promise<number> {
  const [maximo] = await consultar<{ maximo: number | string | null }>(
    conexion,
    `SELECT MAX(id) AS maximo FROM \`${tabla}\``,
  );
  const id = Number(maximo.maximo ?? 0) + 1_000_000;
  const [existe] = await consultar<{ cantidad: number | string }>(
    conexion,
    `SELECT COUNT(*) AS cantidad FROM \`${tabla}\` WHERE id = ?`,
    [id],
  );
  if (Number(existe.cantidad) !== 0) {
    throw new Error(`El id ${id} que se esperaba inexistente existe en ${tabla}.`);
  }
  return id;
}
