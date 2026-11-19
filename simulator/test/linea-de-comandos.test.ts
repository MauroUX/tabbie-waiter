// Change tk-03-simulador-mesas-pedidos-y-cobros · spec simulador-comensales.
// Scenarios:
//   - "Argumentos inválidos" (requirement "Cada escenario se corre desde la línea de comandos con sus parámetros"),
//     cambiado en la segunda vuelta con el OK del humano: el argumento y su valor van en la primera línea de stderr;
//   - "Una mesa que no existe" (requirement "Una petición rechazada termina el escenario con un error explícito").
// Cada test usa su propio archivo de registro en un directorio temporal. Códigos de salida: design.md, D2 (0 bien,
// 1 petición rechazada o sin respuesta, 2 argumentos inválidos). La mesa 99 no existe en el restaurante 1 (DP-70);
// el test lo comprueba contra la réplica antes de aceptar el mensaje.
import { rmSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { urlReplica } from './apoyo/entorno';
import { RESTAURANTE_1 } from './apoyo/replica';
import { directorioTemporal, leerLineas, lineasDeTexto, PETICION } from './apoyo/registro';
import { correrSimulador } from './apoyo/simulador';

/** La primera línea no vacía de un texto, o '' si no tiene ninguna. */
function primeraLinea(texto: string): string {
  return texto.split('\n').find((linea) => linea.trim() !== '')?.trim() ?? '';
}

describe('Línea de comandos del simulador', () => {
  let directorio = '';

  beforeEach(() => {
    directorio = directorioTemporal('registro-linea-de-comandos');
  });

  afterEach(() => {
    rmSync(directorio, { recursive: true, force: true });
  });

  test('Argumentos inválidos', async () => {
    const registro = path.join(directorio, 'turno.jsonl');

    const metodoInvalido = await correrSimulador([
      'esc-5',
      '--mesa',
      '1',
      '--monto',
      '100',
      '--metodo',
      'Tarjeta',
      '--registro',
      registro,
    ]);
    const escenarioInexistente = await correrSimulador(['esc-9', '--registro', registro]);

    // Las dos terminan con código 2, y la primera línea de stderr, antes del texto de uso, nombra el argumento y su
    // valor (--metodo y Tarjeta) o el escenario (esc-9). Se toma la primera línea no vacía.
    expect(metodoInvalido).toMatchObject({ codigo: 2 });
    expect(primeraLinea(metodoInvalido.stderr)).toContain('--metodo');
    expect(primeraLinea(metodoInvalido.stderr)).toContain('Tarjeta');
    expect(escenarioInexistente).toMatchObject({ codigo: 2 });
    expect(primeraLinea(escenarioInexistente.stderr)).toContain('esc-9');

    // Ninguna agrega una línea al registro.
    expect(lineasDeTexto(registro)).toEqual([]);
  });

  test('Una mesa que no existe', async () => {
    const registro = path.join(directorio, 'turno.jsonl');

    const corrida = await correrSimulador(['esc-1', '--mesa', '99', '--registro', registro]);
    const lineas = leerLineas(lineasDeTexto(registro));

    // Código 1.
    expect(corrida).toMatchObject({ codigo: 1 });

    // El registro tiene /auth/guest ok y /join 404 rechazada, una sola vez, y ninguna línea después.
    expect(lineas.map(({ peticion, mesa, estado, resultado }) => ({ peticion, mesa, estado, resultado }))).toEqual([
      { peticion: PETICION.invitado, mesa: 99, estado: 201, resultado: 'ok' },
      { peticion: PETICION.unirse, mesa: 99, estado: 404, resultado: 'rechazada' },
    ]);
    const comensal = lineas[1].comensal;
    expect(typeof comensal.userId).toBe('number');

    // La réplica rechaza esa misma unión con 404: la mesa 99 no existe. Su mensaje es el que tiene que nombrar stderr.
    const directa = await request(urlReplica())
      .post(`/table-sessions/join/restaurant/${RESTAURANTE_1}/table/99`)
      .send({ userId: comensal.userId });
    expect(directa.status).toBe(404);
    const mensaje: unknown = directa.body?.message;
    const mensajes = (Array.isArray(mensaje) ? mensaje : [mensaje]).filter(
      (parte): parte is string => typeof parte === 'string' && parte !== '',
    );
    expect(mensajes.length).toBeGreaterThan(0);

    // stderr nombra esc-1, la petición /join, el código 404 y el mensaje de la réplica.
    expect(corrida.stderr).toContain('esc-1');
    expect(corrida.stderr).toContain('/join');
    expect(corrida.stderr).toContain('404');
    for (const parte of mensajes) {
      expect(corrida.stderr).toContain(parte);
    }
  });
});
