// Change tk-03-simulador-mesas-pedidos-y-cobros · spec simulador-comensales.
// Scenarios, en este orden y sobre un mismo archivo de registro:
//   - "WS-c1 (en parte) · ESC-1 deja dos mesas ocupadas en el restaurante 1" (mesas 1 y 2);
//   - "WS-c2 (en parte) · ESC-2 confirma un pedido, T16 llega por `/sse/waiters` y la hora queda en el registro" (mesa 3);
//   - "WS-c3 (en parte) · ESC-5 pide un cobro, T17 llega por `/sse/waiters` y la hora queda en el registro" (mesa 4);
//   - "Los parámetros cambian lo que hace el escenario" (mesa 5);
//   - "Cada petición tiene su línea con la mesa, el comensal y la hora", sobre el registro que acumularon los anteriores.
// El describe es el scenario del criterio extra del humano: "Con la réplica cargada desde cero, los tres escenarios
// corren y T16 y T17 llegan por `/sse/waiters`"; su parte "si la base no estaba recién cargada…" la cubre el
// globalSetup (apoyo/base-recien-cargada.ts).
// El simulador se corre por su línea de comandos (design.md, D2) y el efecto se comprueba con T05, T06 y el stream,
// con el JWT del primer mozo del restaurante 1 (DP-71) firmado por la prueba (DP-15). Decisiones: DP-60, DP-78, DP-79,
// DP-81; registro del turno: design.md, D3.
// Excepción aprobada en el gate 2: este archivo toma Date.now() antes y después de cada corrida, solo para acotar la
// `hora` de cada línea del registro en el último test.
import { rmSync } from 'node:fs';
import path from 'node:path';
import { jwtDelMozo1 } from './apoyo/jwt';
import { mesasOcupadas, RESTAURANTE_1, solicitudesDeCobro } from './apoyo/replica';
import type { Registro } from './apoyo/replica';
import {
  directorioTemporal,
  HORA_ISO_UTC_CON_MS,
  leerLineas,
  lineasDeTexto,
  PETICION,
} from './apoyo/registro';
import type { LineaDelRegistro } from './apoyo/registro';
import { correrSimulador } from './apoyo/simulador';
import type { ResultadoDeCorrida } from './apoyo/simulador';
import { datosJson, StreamDeEventos } from './apoyo/stream';
import type { EventoSse } from './apoyo/stream';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const ESCENARIOS = ['esc-1', 'esc-2', 'esc-5'];
const RESULTADOS = ['ok', 'rechazada', 'sin respuesta'];
/** Los campos de cada línea (piezas de contrato, sección 6). */
const CAMPOS_DE_LA_LINEA = [
  'hora',
  'escenario',
  'peticion',
  'restaurantId',
  'mesa',
  'comensal',
  'tableSessionId',
  'orderId',
  'requestId',
  'monto',
  'estado',
  'resultado',
  'mensaje',
];

/** Una corrida del simulador, con las líneas que agregó al registro y el momento en que se lanzó y terminó. */
interface CorridaAnotada {
  escenario: string;
  /** Date.now() justo antes de lanzar el proceso. */
  inicio: number;
  /** Date.now() justo después de que el proceso terminó. */
  fin: number;
  /** Índice de la primera línea del registro que agregó esta corrida. */
  desde: number;
  /** Índice siguiente a la última línea que agregó. */
  hasta: number;
}

const ordenar = <T>(lista: T[]): T[] => [...lista].sort();

/** El JSON de adentro de `data.body` de `order-confirmed-notification` (DP-78), o `undefined`. */
function cuerpoDePedidoConfirmado(evento: EventoSse): Registro | undefined {
  const datos = datosJson(evento) as Registro | undefined;
  if (!datos || typeof datos.body !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(datos.body) as Registro;
  } catch {
    return undefined;
  }
}

function mesaNumero(mesas: Registro[], numero: number): Registro {
  const mesa = mesas.find((candidata) => candidata.number === numero);
  if (!mesa) {
    throw new Error(`T05 no trae la mesa ${numero}; trae ${JSON.stringify(mesas.map((m) => m.number))}.`);
  }
  return mesa;
}

describe('Con la réplica cargada desde cero, los tres escenarios corren y T16 y T17 llegan por `/sse/waiters`', () => {
  const directorio = directorioTemporal('registro-escenarios');
  const registro = path.join(directorio, 'turno.jsonl');
  const corridas: CorridaAnotada[] = [];
  let stream: StreamDeEventos | undefined;

  /** Corre el simulador con el registro de este archivo y devuelve el resultado y las líneas que agregó. */
  async function correr(argumentos: string[]): Promise<{ resultado: ResultadoDeCorrida; lineas: LineaDelRegistro[] }> {
    const desde = lineasDeTexto(registro).length;
    const inicio = Date.now();
    const resultado = await correrSimulador([...argumentos, '--registro', registro]);
    const fin = Date.now();
    const nuevas = lineasDeTexto(registro).slice(desde);
    corridas.push({ escenario: argumentos[0], inicio, fin, desde, hasta: desde + nuevas.length });
    return { resultado, lineas: leerLineas(nuevas) };
  }

  /** Las líneas de una corrida de ESC-1: una por cada `/auth/guest` y cada `/join`. Devuelve los userId unidos. */
  function comprobarLineasDeEsc1(lineas: LineaDelRegistro[], mesa: number, comensales: number): number[] {
    const invitados = lineas.filter(({ peticion }) => peticion === PETICION.invitado);
    const uniones = lineas.filter(({ peticion }) => peticion === PETICION.unirse);
    expect({ invitados: invitados.length, uniones: uniones.length, total: lineas.length }).toEqual({
      invitados: comensales,
      uniones: comensales,
      total: 2 * comensales,
    });
    for (const linea of lineas) {
      expect(linea).toMatchObject({
        escenario: 'esc-1',
        restaurantId: RESTAURANTE_1,
        mesa,
        resultado: 'ok',
        comensal: { guestId: expect.any(String) },
      });
      expect(linea.comensal.guestId).not.toBe('');
      expect(linea.hora).toMatch(HORA_ISO_UTC_CON_MS);
    }
    for (const linea of invitados) {
      expect(linea.comensal.userId).toBeNull();
    }
    for (const linea of uniones) {
      expect(typeof linea.comensal.userId).toBe('number');
    }
    // Cada comensal que se unió entró antes por /auth/guest en esta corrida, y cada uno con su guestId.
    const guestIdsInvitados = invitados.map(({ comensal }) => comensal.guestId);
    expect(new Set(guestIdsInvitados).size).toBe(comensales);
    expect(ordenar(uniones.map(({ comensal }) => comensal.guestId))).toEqual(ordenar(guestIdsInvitados));
    return uniones.map(({ comensal }) => comensal.userId as number);
  }

  afterEach(() => {
    stream?.cerrar();
    stream = undefined;
  });

  afterAll(() => {
    rmSync(directorio, { recursive: true, force: true });
  });

  test('WS-c1 (en parte) · ESC-1 deja dos mesas ocupadas en el restaurante 1', async () => {
    const jwt = jwtDelMozo1();
    // Dado: T05 del primer mozo del restaurante 1 devuelve [] (también lo exige el globalSetup).
    expect(await mesasOcupadas(jwt)).toEqual([]);

    const mesa1 = await correr(['esc-1', '--mesa', '1', '--comensales', '2']);
    const mesa2 = await correr(['esc-1', '--mesa', '2']);

    // Las dos corridas terminan con código 0.
    expect(mesa1.resultado).toMatchObject({ codigo: 0 });
    expect(mesa2.resultado).toMatchObject({ codigo: 0 });

    // El registro tiene una línea por cada /auth/guest y cada /join, con la mesa, el comensal y la hora.
    const unidosAMesa1 = comprobarLineasDeEsc1(mesa1.lineas, 1, 2);
    const unidosAMesa2 = comprobarLineasDeEsc1(mesa2.lineas, 2, 1);

    // T05 devuelve exactamente las mesas 1 y 2: la 1 con dos invitados y la 2 con uno.
    const mesas = await mesasOcupadas(jwt);
    expect(mesas.map((mesa) => mesa.number)).toEqual([1, 2]);
    const usuarios = (numero: number): Registro[] => mesaNumero(mesas, numero).activeSession?.users ?? [];
    expect({
      mesa1: ordenar(usuarios(1).map((usuario) => usuario.id)),
      mesa2: ordenar(usuarios(2).map((usuario) => usuario.id)),
    }).toEqual({ mesa1: ordenar(unidosAMesa1), mesa2: ordenar(unidosAMesa2) });
    for (const usuario of [...usuarios(1), ...usuarios(2)]) {
      expect(usuario.isGuest).toBe(true);
    }
  });

  test('WS-c2 (en parte) · ESC-2 confirma un pedido, T16 llega por `/sse/waiters` y la hora queda en el registro', async () => {
    const jwt = jwtDelMozo1();
    // Dado: /sse/waiters abierto con el JWT del primer mozo del restaurante 1 en el encabezado.
    stream = await StreamDeEventos.abrir(jwt);

    const corrida = await correr(['esc-2', '--mesa', '3']);
    expect(corrida.resultado).toMatchObject({ codigo: 0 });

    // El registro tiene la línea de PUT /orders/:id/confirm con la mesa 3, el comensal, el orderId, ok y la hora.
    const confirmaciones = corrida.lineas.filter(({ peticion }) => peticion === PETICION.confirmarPedido);
    expect(confirmaciones).toHaveLength(1);
    const [confirmacion] = confirmaciones;
    expect(confirmacion).toMatchObject({
      escenario: 'esc-2',
      restaurantId: RESTAURANTE_1,
      mesa: 3,
      comensal: { userId: expect.any(Number), guestId: expect.any(String) },
      orderId: expect.any(Number),
      estado: 200,
      resultado: 'ok',
    });
    expect(confirmacion.hora).toMatch(HORA_ISO_UTC_CON_MS);
    const orderId = confirmacion.orderId as number;

    // El stream recibe order-confirmed-notification con ese orderId.
    const evento = await stream.esperar(
      (candidato) =>
        candidato.tipo === 'order-confirmed-notification' && cuerpoDePedidoConfirmado(candidato)?.orderId === orderId,
    );

    // T05 muestra ese pedido confirmed en la mesa 3; de ahí sale el tableSessionId de la mesa.
    const mesa3 = mesaNumero(await mesasOcupadas(jwt), 3);
    const sesion = mesa3.activeSession as Registro;
    expect(sesion).toBeTruthy();
    const pedidos = (sesion.orders as Registro[]).filter((pedido) => pedido.id === orderId);
    expect(pedidos).toEqual([expect.objectContaining({ id: orderId, status: 'confirmed' })]);

    // data.body trae ese orderId, tableNumber 3, el tableSessionId de la mesa, el restaurante 1 y confirmedAt (DP-78).
    expect(cuerpoDePedidoConfirmado(evento)).toEqual({
      orderId,
      tableNumber: 3,
      tableSessionId: sesion.id,
      restaurantId: RESTAURANTE_1,
      confirmedAt: expect.stringMatching(HORA_ISO_UTC_CON_MS),
    });
  });

  test('WS-c3 (en parte) · ESC-5 pide un cobro, T17 llega por `/sse/waiters` y la hora queda en el registro', async () => {
    const jwt = jwtDelMozo1();
    // Dado: /sse/waiters abierto con el JWT del primer mozo del restaurante 1 en el encabezado.
    stream = await StreamDeEventos.abrir(jwt);

    const corrida = await correr(['esc-5', '--mesa', '4', '--monto', '2000', '--propina', '200', '--metodo', 'Cash']);
    expect(corrida.resultado).toMatchObject({ codigo: 0 });

    // El registro tiene la línea de POST /payments/in-person-request con la mesa 4, el comensal, el requestId,
    // el monto, ok y la hora.
    const solicitudes = corrida.lineas.filter(({ peticion }) => peticion === PETICION.pedirCobro);
    expect(solicitudes).toHaveLength(1);
    const [linea] = solicitudes;
    expect(linea).toMatchObject({
      escenario: 'esc-5',
      restaurantId: RESTAURANTE_1,
      mesa: 4,
      comensal: { userId: expect.any(Number), guestId: expect.any(String) },
      requestId: expect.any(String),
      monto: 2200,
      estado: 201,
      resultado: 'ok',
    });
    expect(linea.hora).toMatch(HORA_ISO_UTC_CON_MS);
    const requestId = linea.requestId as string;
    expect(requestId).not.toBe('');

    // El stream recibe in-person-payment-request con ese id, 2200, 2000, Cash, mesa 4, restaurante 1 y el comensal.
    const evento = await stream.esperar(
      (candidato) =>
        candidato.tipo === 'in-person-payment-request' &&
        (datosJson(candidato) as Registro | undefined)?.id === requestId,
    );
    const solicitud = datosJson(evento) as Registro;
    expect(solicitud).toMatchObject({
      id: requestId,
      amount: 2200,
      noTipAmount: 2000,
      method: 'Cash',
      tableNumber: 4,
      restaurantId: RESTAURANTE_1,
      userId: linea.comensal.userId,
    });

    // T06 del primer mozo devuelve esa solicitud.
    const t06 = await solicitudesDeCobro(jwt);
    expect(t06.estado).toBe(200);
    expect(Array.isArray(t06.cuerpo)).toBe(true);
    expect((t06.cuerpo as Registro[]).filter((guardada) => guardada.id === requestId)).toEqual([solicitud]);
  });

  test('Los parámetros cambian lo que hace el escenario', async () => {
    const jwt = jwtDelMozo1();

    const corrida = await correr(['esc-2', '--mesa', '5', '--pedidos', '2', '--productos', '3x2,6']);

    // La corrida termina con código 0 y el registro tiene dos confirmaciones.
    expect(corrida.resultado).toMatchObject({ codigo: 0 });
    const confirmaciones = corrida.lineas.filter(({ peticion }) => peticion === PETICION.confirmarPedido);
    expect(confirmaciones).toHaveLength(2);
    for (const confirmacion of confirmaciones) {
      expect(confirmacion).toMatchObject({ mesa: 5, resultado: 'ok', orderId: expect.any(Number) });
    }

    // T05 muestra en la mesa 5 dos pedidos confirmed, cada uno con dos del producto 3 y uno del producto 6.
    const mesa5 = mesaNumero(await mesasOcupadas(jwt), 5);
    const pedidos = (mesa5.activeSession?.orders ?? []) as Registro[];
    expect(pedidos).toHaveLength(2);
    for (const pedido of pedidos) {
      expect(pedido.status).toBe('confirmed');
      const lineasDelPedido = (pedido.items as Registro[])
        .map((item) => ({ producto: item.product?.id, cantidad: item.quantity }))
        .sort((a, b) => Number(a.producto) - Number(b.producto));
      expect(lineasDelPedido).toEqual([
        { producto: 3, cantidad: 2 },
        { producto: 6, cantidad: 1 },
      ]);
    }
    // Los dos pedidos son los que confirmó esta corrida.
    expect(ordenar(pedidos.map((pedido) => pedido.id as number))).toEqual(
      ordenar(confirmaciones.map(({ orderId }) => orderId as number)),
    );
  });

  test('Cada petición tiene su línea con la mesa, el comensal y la hora', () => {
    // Dado: el registro que dejaron, en este archivo, los scenarios de WS-c1, WS-c2 y WS-c3 (y el de los parámetros).
    const escenariosCorridos = corridas.map(({ escenario }) => escenario);
    expect(escenariosCorridos).toEqual(expect.arrayContaining(ESCENARIOS));
    const texto = lineasDeTexto(registro);
    expect(texto.length).toBeGreaterThan(0);
    // Cada corrida agregó sus líneas al final del mismo archivo, sin pisar las anteriores.
    expect(texto.length).toBe(corridas[corridas.length - 1].hasta);

    const lineas = leerLineas(texto);
    const problemas: string[] = [];
    lineas.forEach((linea, indice) => {
      const enLinea = (motivo: string): void => {
        problemas.push(`línea ${indice + 1}: ${motivo}`);
      };
      const faltan = CAMPOS_DE_LA_LINEA.filter((campo) => !(campo in linea));
      if (faltan.length > 0) {
        enLinea(`faltan los campos ${faltan.join(', ')}`);
      }
      if (typeof linea.hora !== 'string' || !HORA_ISO_UTC_CON_MS.test(linea.hora)) {
        enLinea(`hora ${JSON.stringify(linea.hora)} no es ISO 8601 en UTC con milisegundos`);
      }
      if (!ESCENARIOS.includes(linea.escenario)) {
        enLinea(`escenario ${JSON.stringify(linea.escenario)}`);
      }
      if (!(Object.values(PETICION) as string[]).includes(linea.peticion)) {
        enLinea(`peticion ${JSON.stringify(linea.peticion)}`);
      }
      if (typeof linea.restaurantId !== 'string' || !UUID.test(linea.restaurantId)) {
        enLinea(`restaurantId ${JSON.stringify(linea.restaurantId)}`);
      }
      if (typeof linea.mesa !== 'number') {
        enLinea(`mesa ${JSON.stringify(linea.mesa)}`);
      }
      const comensal = linea.comensal as LineaDelRegistro['comensal'] | undefined;
      if (!comensal || typeof comensal.guestId !== 'string' || comensal.guestId === '') {
        enLinea(`comensal sin guestId: ${JSON.stringify(comensal)}`);
      } else if (linea.peticion === PETICION.invitado ? comensal.userId !== null : typeof comensal.userId !== 'number') {
        enLinea(`comensal.userId ${JSON.stringify(comensal.userId)} en ${linea.peticion}`);
      }
      if (!RESULTADOS.includes(linea.resultado)) {
        enLinea(`resultado ${JSON.stringify(linea.resultado)}`);
      }
      // Nunca un JWT, un encabezado Authorization ni un email.
      const crudo = texto[indice];
      if (/eyJ/.test(crudo)) {
        enLinea('tiene un JWT');
      }
      if (/authorization/i.test(crudo)) {
        enLinea('tiene un encabezado Authorization');
      }
      if (EMAIL.test(crudo)) {
        enLinea('tiene un email');
      }
    });

    // Las horas de una corrida van en orden, entre el momento en que se lanzó y el momento en que terminó.
    for (const corrida of corridas) {
      const propias = lineas.slice(corrida.desde, corrida.hasta);
      let anterior = corrida.inicio;
      propias.forEach((linea, posicion) => {
        const indice = corrida.desde + posicion;
        if (linea.escenario !== corrida.escenario) {
          problemas.push(`línea ${indice + 1}: escenario ${linea.escenario} en una corrida de ${corrida.escenario}`);
        }
        const hora = Date.parse(linea.hora);
        if (Number.isNaN(hora) || hora < corrida.inicio || hora > corrida.fin) {
          problemas.push(
            `línea ${indice + 1}: hora ${linea.hora} fuera de la corrida ` +
              `(${new Date(corrida.inicio).toISOString()} a ${new Date(corrida.fin).toISOString()})`,
          );
        } else if (hora < anterior) {
          problemas.push(`línea ${indice + 1}: hora ${linea.hora} anterior a la de la línea previa`);
        }
        if (!Number.isNaN(hora)) {
          anterior = Math.max(anterior, hora);
        }
      });
    }

    expect(problemas).toEqual([]);
  });
});
