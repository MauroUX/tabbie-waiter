// Argumentos de la línea de comandos del simulador (design D2). Un escenario por corrida, con sus parámetros.
// Un argumento inválido es un `ErrorDeArgumentos`: la línea de comandos lo muestra con el uso y sale con 2,
// sin mandar ninguna petición ni escribir el registro.
import { parseArgs } from 'node:util';

export const ESCENARIOS = ['esc-1', 'esc-2', 'esc-5'] as const;
export type Escenario = (typeof ESCENARIOS)[number];

export const METODOS_DE_COBRO = ['POS', 'Cash'] as const;
export type MetodoDeCobro = (typeof METODOS_DE_COBRO)[number];

/** El restaurante 1 de los datos iniciales (DP-70). */
export const RESTAURANTE_POR_DEFECTO = '11111111-1111-4111-8111-111111111111';

export class ErrorDeArgumentos extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorDeArgumentos';
  }
}

export interface ProductoPedido {
  productId: number;
  quantity: number;
}

interface Comunes {
  restauranteId: string;
  mesa: number;
  /** Ruta del registro del turno; `undefined` usa el nombre por defecto del día. */
  registro: string | undefined;
  replicaUrl: string;
}

export type Argumentos =
  | ({ escenario: 'esc-1'; comensales: number } & Comunes)
  | ({ escenario: 'esc-2'; pedidos: number; productos: ProductoPedido[] } & Comunes)
  | ({
      escenario: 'esc-5';
      monto: number;
      propina: number;
      metodo: MetodoDeCobro;
      pedidosCubiertos: number[];
      lineasCubiertas: number[];
    } & Comunes);

export const USO = `Uso:
  simulador esc-1 --mesa <n> [--restaurante <uuid>] [--comensales <n>]
  simulador esc-2 --mesa <n> [--restaurante <uuid>] [--pedidos <n>] [--productos <id>[x<cantidad>],...]
  simulador esc-5 --mesa <n> --monto <n> [--restaurante <uuid>] [--propina <n>] [--metodo POS|Cash]
                  [--pedidos-cubiertos <id>,...] [--lineas-cubiertas <id>,...]
  comunes: [--registro <ruta>] [--replica <url>]   (sin --replica usa REPLICA_URL)`;

type Opciones = Record<string, { type: 'string' }>;

const COMUNES: Opciones = {
  mesa: { type: 'string' },
  restaurante: { type: 'string' },
  registro: { type: 'string' },
  replica: { type: 'string' },
};

const OPCIONES_DE: Record<Escenario, Opciones> = {
  'esc-1': { ...COMUNES, comensales: { type: 'string' } },
  'esc-2': { ...COMUNES, pedidos: { type: 'string' }, productos: { type: 'string' } },
  'esc-5': {
    ...COMUNES,
    monto: { type: 'string' },
    propina: { type: 'string' },
    metodo: { type: 'string' },
    'pedidos-cubiertos': { type: 'string' },
    'lineas-cubiertas': { type: 'string' },
  },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function entero(nombre: string, texto: string, minimo: number): number {
  if (!/^\d+$/.test(texto) || !Number.isSafeInteger(Number(texto)) || Number(texto) < minimo) {
    throw new ErrorDeArgumentos(`--${nombre} tiene que ser un entero mayor o igual a ${minimo} (recibió "${texto}")`);
  }
  return Number(texto);
}

function listaDeEnteros(nombre: string, texto: string): number[] {
  return texto.split(',').map((parte) => entero(nombre, parte.trim(), 1));
}

function productos(texto: string): ProductoPedido[] {
  return texto.split(',').map((parte) => {
    const m = /^(\d+)(?:x(\d+))?$/.exec(parte.trim());
    if (m === null) {
      throw new ErrorDeArgumentos(`--productos tiene que ser <id>[x<cantidad>],... (recibió "${parte}")`);
    }
    return { productId: entero('productos', m[1], 1), quantity: m[2] === undefined ? 1 : entero('productos', m[2], 1) };
  });
}

/** Valida `argv` (sin `node` ni el script) y devuelve los argumentos del escenario, o lanza `ErrorDeArgumentos`. */
export function leerArgumentos(argv: string[], entorno: Record<string, string | undefined>): Argumentos {
  const [nombre, ...resto] = argv;
  if (nombre === undefined) {
    throw new ErrorDeArgumentos('falta el escenario (esc-1, esc-2 o esc-5)');
  }
  if (!(ESCENARIOS as readonly string[]).includes(nombre)) {
    throw new ErrorDeArgumentos(`el escenario "${nombre}" no existe (esc-1, esc-2 o esc-5)`);
  }
  const escenario = nombre as Escenario;

  let valores: Record<string, string | undefined>;
  try {
    valores = parseArgs({ args: resto, options: OPCIONES_DE[escenario], allowPositionals: false, strict: true })
      .values as Record<string, string | undefined>;
  } catch (error) {
    throw new ErrorDeArgumentos(`${(error as Error).message} (en ${escenario})`);
  }

  if (valores.mesa === undefined) {
    throw new ErrorDeArgumentos('falta --mesa');
  }
  const restauranteId = valores.restaurante ?? RESTAURANTE_POR_DEFECTO;
  if (!UUID.test(restauranteId)) {
    throw new ErrorDeArgumentos(`--restaurante tiene que ser un uuid (recibió "${restauranteId}")`);
  }
  const replicaUrl = (valores.replica ?? entorno.REPLICA_URL ?? '').trim();
  if (replicaUrl === '') {
    throw new ErrorDeArgumentos('falta la réplica: pasá --replica <url> o definí REPLICA_URL');
  }
  try {
    const url = new URL(replicaUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('protocolo');
    }
  } catch {
    throw new ErrorDeArgumentos('--replica (o REPLICA_URL) tiene que ser una URL http o https');
  }
  const comunes: Comunes = {
    restauranteId,
    mesa: entero('mesa', valores.mesa, 1),
    registro: valores.registro,
    replicaUrl: replicaUrl.replace(/\/+$/, ''),
  };

  if (escenario === 'esc-1') {
    return { escenario, ...comunes, comensales: entero('comensales', valores.comensales ?? '1', 1) };
  }
  if (escenario === 'esc-2') {
    return {
      escenario,
      ...comunes,
      pedidos: entero('pedidos', valores.pedidos ?? '1', 1),
      productos: productos(valores.productos ?? '1'),
    };
  }
  if (valores.monto === undefined) {
    throw new ErrorDeArgumentos('falta --monto');
  }
  const metodo = valores.metodo ?? 'POS';
  if (!(METODOS_DE_COBRO as readonly string[]).includes(metodo)) {
    throw new ErrorDeArgumentos(`--metodo tiene que ser POS o Cash (recibió "${metodo}")`);
  }
  return {
    escenario,
    ...comunes,
    monto: entero('monto', valores.monto, 1),
    propina: entero('propina', valores.propina ?? '0', 0),
    metodo: metodo as MetodoDeCobro,
    pedidosCubiertos: valores['pedidos-cubiertos'] === undefined ? [] : listaDeEnteros('pedidos-cubiertos', valores['pedidos-cubiertos']),
    lineasCubiertas: valores['lineas-cubiertas'] === undefined ? [] : listaDeEnteros('lineas-cubiertas', valores['lineas-cubiertas']),
  };
}
