// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas del simulador: correr su línea de comandos
// (`node $SIMULADOR_CLI <escenario> …`) como un proceso aparte, con el entorno de la prueba (hereda REPLICA_URL).
// No cubre scenarios. No importa nada de simulator/src/ (design.md, D4).
import { spawn } from 'node:child_process';
import { cliDelSimulador } from './entorno';

export interface ResultadoDeCorrida {
  /** Código de salida, o `null` si el proceso terminó por una señal. */
  codigo: number | null;
  stdout: string;
  stderr: string;
}

/** Tope para una corrida: el simulador espera hasta 10 s por petición y ninguna corrida de la suite hace más de 8. */
const TOPE_DE_CORRIDA_MS = 100_000;

export function correrSimulador(argumentos: string[]): Promise<ResultadoDeCorrida> {
  return new Promise((resolver, rechazar) => {
    const proceso = spawn('node', [cliDelSimulador(), ...argumentos], {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proceso.stdout.setEncoding('utf8');
    proceso.stderr.setEncoding('utf8');
    proceso.stdout.on('data', (parte: string) => {
      stdout += parte;
    });
    proceso.stderr.on('data', (parte: string) => {
      stderr += parte;
    });
    const temporizador = setTimeout(() => {
      proceso.kill('SIGKILL');
    }, TOPE_DE_CORRIDA_MS);
    proceso.on('error', (error) => {
      clearTimeout(temporizador);
      rechazar(new Error(`No se pudo lanzar el simulador: ${error.message}`));
    });
    proceso.on('close', (codigo) => {
      clearTimeout(temporizador);
      resolver({ codigo, stdout, stderr });
    });
  });
}
