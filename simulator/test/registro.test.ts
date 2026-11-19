// Change tk-03-simulador-mesas-pedidos-y-cobros · spec simulador-comensales · requirement "El registro del turno"
// · scenario "El registro no entra al repo" (design.md, D3).
// Sobre el repo montado de solo lectura en REPO_PATH: en simulator/registros/ solo está versionado el .gitkeep, y un
// archivo de registro de esa carpeta queda ignorado por una regla de .gitignore.
import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import { rutaRepo } from './apoyo/entorno';

/** Un archivo de registro con el nombre por defecto del simulador (`turno-<AAAA-MM-DD>.jsonl`). */
const REGISTRO_DE_EJEMPLO = 'simulator/registros/turno-2026-11-19.jsonl';

function git(argumentos: string[]): SpawnSyncReturns<string> {
  const resultado = spawnSync('git', ['-C', rutaRepo(), ...argumentos], { encoding: 'utf8' });
  if (resultado.error) {
    throw new Error(`No se pudo ejecutar git: ${resultado.error.message}`);
  }
  return resultado;
}

describe('El registro del turno', () => {
  test('El registro no entra al repo', () => {
    // En el árbol versionado, simulator/registros/ solo tiene el .gitkeep.
    const versionados = git(['ls-files', '--', 'simulator/registros']);
    expect(versionados.status).toBe(0);
    const archivos = versionados.stdout.split('\n').filter((linea) => linea.trim() !== '');
    expect(archivos).toEqual(['simulator/registros/.gitkeep']);

    // .gitignore ignora los archivos de simulator/registros/ (sin mirar el índice).
    const ignorado = git(['check-ignore', '--no-index', '--verbose', REGISTRO_DE_EJEMPLO]);
    expect({ codigo: ignorado.status, salida: ignorado.stdout.trim() }).toEqual({
      codigo: 0,
      salida: expect.stringMatching(/^\.gitignore:\d+:[^!\t][^\t]*\tsimulator\/registros\/turno-2026-11-19\.jsonl$/),
    });
  });
});
