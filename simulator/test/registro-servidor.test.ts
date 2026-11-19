// Change tk-03-simulador-mesas-pedidos-y-cobros · spec simulador-comensales · requirement "El registro del turno".
// Scenarios (segunda vuelta, por la revisión adversarial del PR 22):
//   - "La hora es la de antes de mandar la petición";
//   - "Una respuesta exitosa con otra forma también deja su línea".
// design.md, D3 y D10: en lugar de la réplica, un servidor HTTP de la prueba (node:http, en 127.0.0.1 y un puerto libre)
// al que el simulador llega con --replica. No necesita la réplica ni sus datos. Cada test levanta su servidor, usa su
// propio archivo de registro en un directorio temporal y borra los dos al terminar.
// La única lectura del reloj en una aserción es Date.now() al terminar la corrida, para acotar `hora` (excepción
// aprobada para el registro del turno).
import { rmSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { directorioTemporal, leerLineas, lineasDeTexto, PETICION } from './apoyo/registro';
import { correrSimulador } from './apoyo/simulador';

/** Lo que tarda el servidor de la prueba en contestar `POST /auth/guest` en el scenario de la hora. */
const DEMORA_MS = 3000;
/**
 * Lo mínimo que la `hora` de `/auth/guest` tiene que quedar antes del fin de la corrida. Es 1 s menos que DEMORA_MS:
 * ese segundo de margen absorbe un retroceso del reloj de la VM de Docker Desktop, que se reajusta solo (se vio medio
 * segundo), y una hora tomada después de la respuesta igual queda a menos de 1 s del fin y no llega a los 2 s.
 */
const HORA_ANTES_DEL_FIN_MS = 2000;

interface PeticionRecibida {
  metodo: string;
  ruta: string;
}

interface ServidorDePrueba {
  url: string;
  recibidas: PeticionRecibida[];
  cerrar(): Promise<void>;
}

type Responder = (peticion: PeticionRecibida, respuesta: http.ServerResponse, programar: Programar) => void;
type Programar = (accion: () => void, ms: number) => void;

function responderJson(respuesta: http.ServerResponse, estado: number, cuerpo: unknown): void {
  const texto = JSON.stringify(cuerpo);
  respuesta.writeHead(estado, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(texto),
  });
  respuesta.end(texto);
}

/** Levanta un servidor en 127.0.0.1 con un puerto libre; anota cada petición al llegar y la contesta con `responder`. */
function levantarServidor(responder: Responder): Promise<ServidorDePrueba> {
  const recibidas: PeticionRecibida[] = [];
  const temporizadores = new Set<NodeJS.Timeout>();
  const programar: Programar = (accion, ms) => {
    const temporizador = setTimeout(() => {
      temporizadores.delete(temporizador);
      accion();
    }, ms);
    temporizadores.add(temporizador);
  };
  const servidor = http.createServer((pedido, respuesta) => {
    const recibida: PeticionRecibida = { metodo: pedido.method ?? '', ruta: pedido.url ?? '' };
    recibidas.push(recibida);
    // Se lee el cuerpo entero antes de contestar.
    pedido.resume();
    pedido.on('end', () => responder(recibida, respuesta, programar));
  });
  return new Promise((resolver, rechazar) => {
    servidor.once('error', rechazar);
    servidor.listen(0, '127.0.0.1', () => {
      const { port } = servidor.address() as AddressInfo;
      resolver({
        url: `http://127.0.0.1:${port}`,
        recibidas,
        cerrar: () =>
          new Promise<void>((cerrado) => {
            for (const temporizador of temporizadores) {
              clearTimeout(temporizador);
            }
            servidor.closeAllConnections();
            servidor.close(() => cerrado());
          }),
      });
    });
  });
}

/** Lo que no es `POST /auth/guest` no forma parte de estos scenarios: 404, y queda contado en `recibidas`. */
function noEncontrado(respuesta: http.ServerResponse): void {
  responderJson(respuesta, 404, { statusCode: 404, message: 'Ruta fuera del servidor de la prueba', error: 'Not Found' });
}

describe('El registro del turno, contra un servidor de la prueba', () => {
  let directorio = '';
  let servidor: ServidorDePrueba | undefined;

  beforeEach(() => {
    directorio = directorioTemporal('registro-servidor');
  });

  afterEach(async () => {
    await servidor?.cerrar();
    servidor = undefined;
    rmSync(directorio, { recursive: true, force: true });
  });

  test('La hora es la de antes de mandar la petición', async () => {
    // Dado un servidor que tarda 3 s en contestar POST /auth/guest y responde 500.
    servidor = await levantarServidor((peticion, respuesta, programar) => {
      if (peticion.metodo !== 'POST' || peticion.ruta !== '/auth/guest') {
        noEncontrado(respuesta);
        return;
      }
      const recibidaEn = Date.now();
      // Contesta cuando pasaron al menos DEMORA_MS desde que llegó la petición, aunque el temporizador se adelante.
      const contestarCuandoToque = (): void => {
        const falta = recibidaEn + DEMORA_MS - Date.now();
        if (falta > 0) {
          programar(contestarCuandoToque, falta);
          return;
        }
        responderJson(respuesta, 500, {
          statusCode: 500,
          message: 'Error del servidor de la prueba',
          error: 'Internal Server Error',
        });
      };
      programar(contestarCuandoToque, DEMORA_MS);
    });
    const registro = path.join(directorio, 'turno.jsonl');

    // Cuando se corre esc-1 --mesa 1 contra ese servidor.
    const corrida = await correrSimulador(['esc-1', '--mesa', '1', '--replica', servidor.url, '--registro', registro]);
    const terminoEn = Date.now();

    // La corrida termina con código 1.
    expect(corrida).toMatchObject({ codigo: 1 });

    // El servidor recibió una sola petición, la de POST /auth/guest.
    expect(servidor.recibidas).toEqual([{ metodo: 'POST', ruta: '/auth/guest' }]);

    // La hora de la línea de /auth/guest es al menos 2 s anterior al momento en que terminó la corrida (1 s de margen
    // sobre los 3 s del servidor, por los reajustes del reloj; ver HORA_ANTES_DEL_FIN_MS).
    const lineasDelInvitado = leerLineas(lineasDeTexto(registro)).filter(
      ({ peticion }) => peticion === PETICION.invitado,
    );
    expect(lineasDelInvitado).toHaveLength(1);
    const hora = Date.parse(lineasDelInvitado[0].hora);
    expect(terminoEn - hora).toBeGreaterThanOrEqual(HORA_ANTES_DEL_FIN_MS);
  });

  test('Una respuesta exitosa con otra forma también deja su línea', async () => {
    // Dado un servidor que responde 201 a POST /auth/guest con un cuerpo sin access_token ni user.
    servidor = await levantarServidor((peticion, respuesta) => {
      if (peticion.metodo !== 'POST' || peticion.ruta !== '/auth/guest') {
        noEncontrado(respuesta);
        return;
      }
      responderJson(respuesta, 201, { ok: true });
    });
    const registro = path.join(directorio, 'turno.jsonl');

    // Cuando se corre esc-1 --mesa 1 contra ese servidor.
    const corrida = await correrSimulador(['esc-1', '--mesa', '1', '--replica', servidor.url, '--registro', registro]);

    // La corrida termina con código 1, y stderr nombra esc-1, la petición y lo que le falta a la respuesta.
    expect(corrida).toMatchObject({ codigo: 1 });
    expect(corrida.stderr).toContain('esc-1');
    expect(corrida.stderr).toContain('/auth/guest');
    expect(corrida.stderr).toContain('access_token');

    // El registro tiene la línea de /auth/guest con estado 201, rechazada y un mensaje que nombra access_token, y
    // ninguna línea después.
    const lineas = leerLineas(lineasDeTexto(registro));
    expect(lineas.map(({ peticion, estado, resultado }) => ({ peticion, estado, resultado }))).toEqual([
      { peticion: PETICION.invitado, estado: 201, resultado: 'rechazada' },
    ]);
    expect(lineas[0].mensaje).toEqual(expect.stringContaining('access_token'));

    // El servidor recibió una sola petición.
    expect(servidor.recibidas).toEqual([{ metodo: 'POST', ruta: '/auth/guest' }]);
  });
});
