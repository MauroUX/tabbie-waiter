// Change tk-02-datos-iniciales · spec datos-iniciales · requirement "Los datos iniciales cumplen el modelo de datos
// (DoD de Datos)" · scenario "Los datos cargados respetan los tipos, las FK, los enums, los umbrales y los precios".
// Origen: Definition of Done, "Datos", fila 2; modelo-de-datos.md, secciones 2.1, 2.2, 2.3, 2.10, 2.11, 2.12 y 4.
// Corre en la CI, contra MySQL directo, sin pasar por la réplica, sobre la base recién cargada por el servicio `carga`.
// Precios: datos-iniciales.sql no tiene ningún literal con punto decimal en ninguna parte (ni entre comillas ni en
// comentarios), y cada precio de la base es igual al que escribe el SQL. Para compararlos, el test lee las sentencias
// `INSERT INTO \`product\`` y `INSERT INTO \`product_option_value\`` (una por tabla, con la lista de columnas entre
// backticks, VALUES y una tupla por fila, terminada en `;`) con un tokenizador que respeta las comillas simples.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { abrirConexion, consultar, contarFilas } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { rutaRepo, variable } from '../apoyo/entorno';

const FORMA_DE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMENSAL = 'waiterapp.comensal@example.com';
const RUTA_DEL_SQL = 'replica/datos-iniciales/datos-iniciales.sql';
/** Un literal con punto decimal, con o sin dígitos adelante (`12.5`, `.5`), en cualquier parte del texto. */
const LITERAL_CON_DECIMALES = /\d*\.\d+/g;
/** Filas que carga el SQL en cada tabla con precio (DP-70): 8 + 3 productos y los 3 valores de "Punto de cocción". */
const FILAS_CON_PRECIO: Record<string, number> = { product: 11, product_option_value: 3 };

const ENUMS = {
  role: ['user', 'admin', 'waiter', 'backoffice'],
  paymentStyle: ['before-order', 'after-order'],
  type: ['single-choice', 'multiple-choice'],
};

/** FK que aceptan nulos y los datos iniciales tienen que llenar, con la tabla a la que apuntan. */
const FK_A_LLENAR: Array<{ tabla: string; columna: string; padre: string; filtro?: string }> = [
  { tabla: 'table', columna: 'restaurantId', padre: 'restaurant' },
  { tabla: 'product', columna: 'restaurantId', padre: 'restaurant' },
  { tabla: 'product_option', columna: 'productId', padre: 'product' },
  { tabla: 'product_option_value', columna: 'productOptionId', padre: 'product_option' },
  // Todo usuario que no sea el comensal tiene restaurante.
  { tabla: 'user', columna: 'restaurantId', padre: 'restaurant', filtro: 'h.email <> ?' },
];

type Token =
  | { tipo: 'simbolo'; valor: '(' | ')' | ',' | ';' }
  | { tipo: 'cadena'; valor: string }
  | { tipo: 'identificador'; valor: string }
  | { tipo: 'palabra'; valor: string };

/**
 * Tokeniza desde `inicio` hasta el primer `;` fuera de comillas (incluido).
 * Cadenas entre comillas simples (con `''` y `\x` como escapes), identificadores entre backticks,
 * los símbolos `( ) , ;` y, el resto, palabras sueltas (números, NULL, VALUES…).
 */
function tokenizarSentencia(sql: string, inicio: number): Token[] {
  const tokens: Token[] = [];
  let i = inicio;
  while (i < sql.length) {
    const c = sql[i];
    if (/\s/.test(c)) {
      i += 1;
    } else if (c === '(' || c === ')' || c === ',' || c === ';') {
      tokens.push({ tipo: 'simbolo', valor: c });
      i += 1;
      if (c === ';') {
        return tokens;
      }
    } else if (c === "'") {
      let valor = '';
      i += 1;
      for (;;) {
        if (i >= sql.length) {
          throw new Error('El SQL tiene una cadena entre comillas simples sin cerrar.');
        }
        if (sql[i] === '\\') {
          valor += sql[i + 1] ?? '';
          i += 2;
        } else if (sql[i] === "'" && sql[i + 1] === "'") {
          valor += "'";
          i += 2;
        } else if (sql[i] === "'") {
          i += 1;
          break;
        } else {
          valor += sql[i];
          i += 1;
        }
      }
      tokens.push({ tipo: 'cadena', valor });
    } else if (c === '`') {
      const fin = sql.indexOf('`', i + 1);
      if (fin < 0) {
        throw new Error('El SQL tiene un identificador entre backticks sin cerrar.');
      }
      tokens.push({ tipo: 'identificador', valor: sql.slice(i + 1, fin) });
      i = fin + 1;
    } else {
      let valor = '';
      while (i < sql.length && !/[\s(),;'`]/.test(sql[i])) {
        valor += sql[i];
        i += 1;
      }
      tokens.push({ tipo: 'palabra', valor });
    }
  }
  throw new Error('Una sentencia INSERT del SQL no termina en `;`.');
}

/**
 * Las filas de la única sentencia `INSERT INTO \`<tabla>\`` del SQL, como `{ id, price }` en texto.
 * Falla si no hay exactamente una sentencia, si la forma no es la del contrato, o si un `price` no es un entero
 * sin comillas.
 */
function preciosDelSql(sql: string, tabla: string): Array<{ id: string; price: string }> {
  const encabezado = new RegExp(`INSERT\\s+INTO\\s+\`${tabla}\`\\s*\\(`, 'gi');
  const sentencias = [...sql.matchAll(encabezado)];
  if (sentencias.length !== 1) {
    throw new Error(`El SQL tiene ${sentencias.length} sentencias INSERT INTO \`${tabla}\`; se esperaba una.`);
  }
  const tokens = tokenizarSentencia(sql, (sentencias[0].index as number) + sentencias[0][0].length - 1);
  let posicion = 0;
  const siguiente = (): Token => {
    const token = tokens[posicion];
    if (token === undefined) {
      throw new Error(`La sentencia INSERT INTO \`${tabla}\` termina antes de tiempo.`);
    }
    posicion += 1;
    return token;
  };
  const esperarSimbolo = (simbolo: string): void => {
    const token = siguiente();
    if (token.tipo !== 'simbolo' || token.valor !== simbolo) {
      throw new Error(`En INSERT INTO \`${tabla}\` se esperaba "${simbolo}" y vino "${token.valor}".`);
    }
  };

  // La lista de columnas, entre backticks.
  esperarSimbolo('(');
  const columnas: string[] = [];
  for (;;) {
    const columna = siguiente();
    if (columna.tipo !== 'identificador') {
      throw new Error(`En INSERT INTO \`${tabla}\` la lista de columnas no va entre backticks ("${columna.valor}").`);
    }
    columnas.push(columna.valor);
    const separador = siguiente();
    if (separador.tipo === 'simbolo' && separador.valor === ')') {
      break;
    }
    if (separador.tipo !== 'simbolo' || separador.valor !== ',') {
      throw new Error(`En INSERT INTO \`${tabla}\` la lista de columnas tiene "${separador.valor}".`);
    }
  }
  const indiceId = columnas.indexOf('id');
  const indicePrecio = columnas.indexOf('price');
  if (indiceId < 0 || indicePrecio < 0) {
    throw new Error(`INSERT INTO \`${tabla}\` no trae las columnas id y price.`);
  }

  const values = siguiente();
  if (values.tipo !== 'palabra' || values.valor.toUpperCase() !== 'VALUES') {
    throw new Error(`En INSERT INTO \`${tabla}\` se esperaba VALUES y vino "${values.valor}".`);
  }

  // Una tupla por fila, separadas por coma, hasta el `;`.
  const filas: Array<{ id: string; price: string }> = [];
  for (;;) {
    esperarSimbolo('(');
    const tupla: Token[] = [];
    for (;;) {
      const valor = siguiente();
      if (valor.tipo === 'simbolo') {
        throw new Error(`En INSERT INTO \`${tabla}\` una tupla tiene "${valor.valor}" donde iba un valor.`);
      }
      tupla.push(valor);
      const separador = siguiente();
      if (separador.tipo === 'simbolo' && separador.valor === ')') {
        break;
      }
      if (separador.tipo !== 'simbolo' || separador.valor !== ',') {
        throw new Error(`En INSERT INTO \`${tabla}\` una tupla tiene "${separador.valor}" donde iba una coma.`);
      }
    }
    if (tupla.length !== columnas.length) {
      throw new Error(
        `En INSERT INTO \`${tabla}\` la fila ${filas.length + 1} tiene ${tupla.length} valores y hay ${columnas.length} columnas.`,
      );
    }
    const id = tupla[indiceId];
    const precio = tupla[indicePrecio];
    if (id.tipo !== 'palabra' || !/^\d+$/.test(id.valor)) {
      throw new Error(`En INSERT INTO \`${tabla}\` la fila ${filas.length + 1} no tiene un id entero.`);
    }
    if (precio.tipo !== 'palabra' || !/^\d+$/.test(precio.valor)) {
      throw new Error(
        `En INSERT INTO \`${tabla}\` el price de la fila con id ${id.valor} no es un entero sin comillas ("${precio.valor}").`,
      );
    }
    filas.push({ id: id.valor, price: precio.valor });
    const separador = siguiente();
    if (separador.tipo === 'simbolo' && separador.valor === ';') {
      break;
    }
    if (separador.tipo !== 'simbolo' || separador.valor !== ',') {
      throw new Error(`En INSERT INTO \`${tabla}\` después de una tupla vino "${separador.valor}".`);
    }
  }
  return filas;
}

describe('DoD Datos · los datos iniciales cumplen el modelo de datos', () => {
  let conexion: Conexion | undefined;

  beforeAll(async () => {
    conexion = await abrirConexion();
  });

  afterAll(async () => {
    await conexion?.end();
  });

  test('DoD Datos · uuid, FK, enums, umbrales y precios', async () => {
    const base = conexion as Conexion;

    // Control positivo: con tablas vacías todas las comprobaciones pasarían sin mirar nada.
    for (const tabla of ['restaurant', 'user', 'table', 'product', 'product_option', 'product_option_value']) {
      expect({ tabla, conFilas: (await contarFilas(base, tabla)) > 0 }).toEqual({ tabla, conFilas: true });
    }

    // Cada restaurant.id tiene la forma de un uuid (8-4-4-4-12 hexadecimales).
    const restaurantes = await consultar<{ id: string }>(base, 'SELECT id FROM `restaurant` ORDER BY id');
    expect(restaurantes.map(({ id }) => id).filter((id) => !FORMA_DE_UUID.test(id))).toEqual([]);

    // Ninguna FK de la lista es nula, y cada una apunta a una fila que existe.
    for (const { tabla, columna, padre, filtro } of FK_A_LLENAR) {
      const huerfanas = await consultar<{ id: number | string }>(
        base,
        `SELECT h.id AS id FROM \`${tabla}\` h ` +
          `WHERE ${filtro ? `${filtro} AND ` : ''}(h.\`${columna}\` IS NULL ` +
          `OR NOT EXISTS (SELECT 1 FROM \`${padre}\` p WHERE p.id = h.\`${columna}\`)) ORDER BY h.id`,
        filtro ? [COMENSAL] : [],
      );
      expect({ fk: `${tabla}.${columna}`, huerfanas: huerfanas.map(({ id }) => id) }).toEqual({
        fk: `${tabla}.${columna}`,
        huerfanas: [],
      });
    }

    // Los enums tienen solo sus valores.
    const valores = async (tabla: string, columna: string): Promise<string[]> =>
      (
        await consultar<{ valor: string | null }>(
          base,
          `SELECT DISTINCT \`${columna}\` AS valor FROM \`${tabla}\` ORDER BY valor`,
        )
      ).map(({ valor }) => String(valor));
    expect((await valores('user', 'role')).filter((valor) => !ENUMS.role.includes(valor))).toEqual([]);
    expect(
      (await valores('restaurant', 'paymentStyle')).filter((valor) => !ENUMS.paymentStyle.includes(valor)),
    ).toEqual([]);
    expect((await valores('product_option', 'type')).filter((valor) => !ENUMS.type.includes(valor))).toEqual([]);

    // En cada restaurante, 10 <= amarillo < rojo < rojo parpadeante <= 10800.
    const umbrales = await consultar<{
      id: string;
      yellowTicketSeconds: number;
      redTicketSeconds: number;
      redPulseTicketSeconds: number;
    }>(
      base,
      'SELECT id, yellowTicketSeconds, redTicketSeconds, redPulseTicketSeconds FROM `restaurant` ORDER BY id',
    );
    for (const { id, yellowTicketSeconds: amarillo, redTicketSeconds: rojo, redPulseTicketSeconds: pulso } of umbrales) {
      expect({ restaurante: id, ordenados: 10 <= amarillo && amarillo < rojo && rojo < pulso && pulso <= 10800 }).toEqual(
        { restaurante: id, ordenados: true },
      );
    }

    // Los precios son decimal(10,0) en la base.
    const tipos = await consultar<{ tabla: string; tipo: string }>(
      base,
      'SELECT TABLE_NAME AS tabla, COLUMN_TYPE AS tipo FROM information_schema.columns ' +
        "WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'price' AND TABLE_NAME IN ('product', 'product_option_value') " +
        'ORDER BY TABLE_NAME',
      [variable('DB_NAME')],
    );
    expect(tipos.map(({ tabla, tipo }) => [tabla, String(tipo).toLowerCase()])).toEqual([
      ['product', 'decimal(10,0)'],
      ['product_option_value', 'decimal(10,0)'],
    ]);

    // Ningún precio del SQL tiene decimales: ningún literal con punto decimal en ninguna parte del archivo,
    // ni entre comillas ni en comentarios.
    const sql = readFileSync(path.join(rutaRepo(), RUTA_DEL_SQL), 'utf8');
    expect(sql.trim().length).toBeGreaterThan(0);
    const literalesConDecimales = sql
      .split(/\r?\n/)
      .flatMap((linea, indice) =>
        (linea.match(LITERAL_CON_DECIMALES) ?? []).map((literal) => `línea ${indice + 1}: ${literal}`),
      );
    expect(literalesConDecimales).toEqual([]);

    // Y cada precio de la base es igual al que escribe el SQL, fila por fila (por id).
    for (const [tabla, filasEsperadas] of Object.entries(FILAS_CON_PRECIO)) {
      const delSql = preciosDelSql(sql, tabla);
      // Control positivo: el parser encontró las filas que carga el SQL.
      expect({ tabla, filasDelSql: delSql.length }).toEqual({ tabla, filasDelSql: filasEsperadas });

      const deLaBase = await consultar<{ id: number | string; price: string }>(
        base,
        `SELECT id, price FROM \`${tabla}\` ORDER BY id`,
      );
      const porId = (a: { id: string }, b: { id: string }): number => Number(a.id) - Number(b.id);
      const sqlOrdenado = [...delSql].sort(porId);
      const baseOrdenada = deLaBase.map(({ id, price }) => ({ id: String(id), price: String(price) })).sort(porId);

      // Los mismos ids.
      expect({ tabla, ids: baseOrdenada.map(({ id }) => Number(id)) }).toEqual({
        tabla,
        ids: sqlOrdenado.map(({ id }) => Number(id)),
      });
      // Y, para cada id, el mismo precio.
      const precioDelSql = new Map(sqlOrdenado.map(({ id, price }) => [id, Number(price)]));
      const distintos = baseOrdenada
        .filter(({ id, price }) => Number(price) !== precioDelSql.get(id))
        .map(({ id, price }) => `id ${id}: base ${price}, SQL ${String(precioDelSql.get(id))}`);
      expect({ tabla, distintos }).toEqual({ tabla, distintos: [] });
    }
  });
});
