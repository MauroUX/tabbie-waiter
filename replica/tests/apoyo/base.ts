// Change tk-01-replica-base · apoyo de las pruebas de contrato: conexión a MySQL e inserciones que se deshacen.
// No cubre scenarios. Los datos los escribe cada test a la vista; acá solo está el mecanismo.
import mysql from 'mysql2/promise';
import type { Connection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { variable, variableNumerica } from './entorno';

export type Conexion = Connection;

/** Abre una conexión a la base de la réplica con las variables DB_*. */
export async function abrirConexion(): Promise<Conexion> {
  return mysql.createConnection({
    host: variable('DB_HOST'),
    port: variableNumerica('DB_PORT'),
    user: variable('DB_USER'),
    password: variable('DB_PASSWORD'),
    database: variable('DB_NAME'),
    timezone: 'Z',
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

/** Ejecuta una consulta y devuelve sus filas. */
export async function consultar<T extends Record<string, unknown>>(
  conexion: Conexion,
  sql: string,
  parametros: unknown[] = [],
): Promise<T[]> {
  const [filas] = await conexion.query<RowDataPacket[]>(sql, parametros);
  return filas as unknown as T[];
}

/** Cantidad de filas de una tabla. */
export async function contarFilas(conexion: Conexion, tabla: string): Promise<number> {
  const [fila] = await consultar<{ cantidad: number | string }>(
    conexion,
    `SELECT COUNT(*) AS cantidad FROM \`${tabla}\``,
  );
  return Number(fila.cantidad);
}

/** El máximo `user.id` más 1 000 000, comprobado como inexistente (DP-57). */
export async function idDeUsuarioInexistente(conexion: Conexion): Promise<number> {
  const [maximo] = await consultar<{ maximo: number | string | null }>(
    conexion,
    'SELECT MAX(id) AS maximo FROM `user`',
  );
  const id = Number(maximo.maximo ?? 0) + 1_000_000;
  const [existe] = await consultar<{ cantidad: number | string }>(
    conexion,
    'SELECT COUNT(*) AS cantidad FROM `user` WHERE id = ?',
    [id],
  );
  if (Number(existe.cantidad) !== 0) {
    throw new Error(`El userId ${id} que se esperaba inexistente existe en user.`);
  }
  return id;
}

type Fila = Record<string, string | number | boolean | null>;

/**
 * Registra lo que inserta un test y lo borra en el orden inverso, que respeta las FK.
 * Los ids salen del INSERT: el `insertId`, o el `id` que trae la fila (el uuid de `restaurant`).
 */
export class Sembrado {
  private readonly insertadas: Array<{ tabla: string; donde: Fila }> = [];

  constructor(private readonly conexion: Conexion) {}

  /** Inserta una fila y devuelve su `insertId`. */
  async insertar(tabla: string, fila: Fila): Promise<number> {
    const resultado = await this.ejecutarInsert(tabla, fila);
    const id = fila.id !== undefined && fila.id !== null ? fila.id : resultado.insertId;
    this.insertadas.push({ tabla, donde: { id } });
    return resultado.insertId;
  }

  /** Inserta una fila de una tabla intermedia (PK compuesta: se borra por todas sus columnas). */
  async insertarIntermedia(tabla: string, fila: Fila): Promise<void> {
    await this.ejecutarInsert(tabla, fila);
    this.insertadas.push({ tabla, donde: { ...fila } });
  }

  /** Actualiza columnas de una fila por su id (p. ej. `table.activeSessionId`). */
  async actualizar(tabla: string, id: number | string, cambios: Fila): Promise<void> {
    const columnas = Object.keys(cambios);
    const asignaciones = columnas.map((columna) => `\`${columna}\` = ?`).join(', ');
    await this.conexion.query(`UPDATE \`${tabla}\` SET ${asignaciones} WHERE id = ?`, [
      ...columnas.map((columna) => cambios[columna]),
      id,
    ]);
  }

  /** Borra todo lo insertado, del último al primero. */
  async deshacer(): Promise<void> {
    while (this.insertadas.length > 0) {
      const { tabla, donde } = this.insertadas.pop() as { tabla: string; donde: Fila };
      const columnas = Object.keys(donde);
      const condicion = columnas.map((columna) => `\`${columna}\` = ?`).join(' AND ');
      await this.conexion.query(
        `DELETE FROM \`${tabla}\` WHERE ${condicion}`,
        columnas.map((columna) => donde[columna]),
      );
    }
  }

  private async ejecutarInsert(tabla: string, fila: Fila): Promise<ResultSetHeader> {
    const columnas = Object.keys(fila);
    const sql =
      `INSERT INTO \`${tabla}\` (${columnas.map((columna) => `\`${columna}\``).join(', ')}) ` +
      `VALUES (${columnas.map(() => '?').join(', ')})`;
    const [resultado] = await this.conexion.query<ResultSetHeader>(
      sql,
      columnas.map((columna) => fila[columna]),
    );
    return resultado;
  }
}
