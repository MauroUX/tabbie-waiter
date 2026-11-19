// Change tk-02-datos-iniciales · spec datos-iniciales · requirement "Los datos iniciales cumplen el modelo de datos
// (DoD de Datos)" · scenario "Los datos cargados respetan los tipos, las FK, los enums, los umbrales y los precios".
// Origen: Definition of Done, "Datos", fila 2; modelo-de-datos.md, secciones 2.1, 2.2, 2.3, 2.10, 2.11, 2.12 y 4.
// Corre en la CI, contra MySQL directo, sin pasar por la réplica, sobre la base recién cargada por el servicio `carga`.
// "Cada precio de la base es igual al que escribe el SQL" se lee así: el SQL no escribe ningún literal con decimales
// (fuera de comillas), y cada precio de la base es entero; así MySQL no redondeó nada en silencio.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { abrirConexion, consultar, contarFilas } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { rutaRepo, variable } from '../apoyo/entorno';

const FORMA_DE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMENSAL = 'waiterapp.comensal@example.com';
const RUTA_DEL_SQL = 'replica/datos-iniciales/datos-iniciales.sql';
const LITERAL_CON_DECIMALES = /\b\d+\.\d+\b/g;

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

/** Quita del SQL lo que va entre comillas simples, dobles o invertidas, con sus escapes. */
function sinComillas(sql: string): string {
  return sql
    .replace(/'(?:[^'\\]|\\.|'')*'/g, "''")
    .replace(/"(?:[^"\\]|\\.|"")*"/g, '""')
    .replace(/`(?:[^`]|``)*`/g, '``');
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

    // Ningún precio del SQL tiene decimales: ningún literal numérico con punto fuera de comillas.
    const sql = readFileSync(path.join(rutaRepo(), RUTA_DEL_SQL), 'utf8');
    expect(sql.trim().length).toBeGreaterThan(0);
    const literalesConDecimales = sinComillas(sql)
      .split(/\r?\n/)
      .flatMap((linea, indice) =>
        (linea.match(LITERAL_CON_DECIMALES) ?? []).map((literal) => `línea ${indice + 1}: ${literal}`),
      );
    expect(literalesConDecimales).toEqual([]);

    // Y cada precio de la base es entero: igual al que escribe el SQL, sin redondeo de MySQL.
    for (const tabla of ['product', 'product_option_value']) {
      const conDecimales = await consultar<{ id: number }>(
        base,
        `SELECT id FROM \`${tabla}\` WHERE price <> ROUND(price) ORDER BY id`,
      );
      expect({ tabla, conDecimales: conDecimales.map(({ id }) => id) }).toEqual({ tabla, conDecimales: [] });
    }
  });
});
