#!/usr/bin/env node
// Línea de comandos del simulador (design D2). Códigos de salida: 0 bien (una línea JSON en stdout con lo creado);
// 1 una petición rechazada o sin respuesta, o un fallo propio (el motivo, en stderr); 2 argumentos inválidos
// (con el uso, sin mandar nada ni escribir el registro).
import { ErrorDeArgumentos, leerArgumentos, USO } from './argumentos';
import { ErrorDeEscenario } from './cliente';
import type { Turno } from './cliente';
import { correrEscenario } from './escenarios';
import { limpiar, Registro, rutaPorDefecto } from './registro';

async function main(): Promise<number> {
  let argumentos;
  try {
    argumentos = leerArgumentos(process.argv.slice(2), process.env);
  } catch (error) {
    if (error instanceof ErrorDeArgumentos) {
      process.stderr.write(`Argumentos inválidos: ${error.message}\n${USO}\n`);
      return 2;
    }
    throw error;
  }

  try {
    const registro = new Registro(argumentos.registro ?? rutaPorDefecto());
    registro.preparar();
    const turno: Turno = {
      escenario: argumentos.escenario,
      restauranteId: argumentos.restauranteId,
      mesa: argumentos.mesa,
      replicaUrl: argumentos.replicaUrl,
      registro,
    };
    const resumen = await correrEscenario(argumentos, turno);
    process.stdout.write(`${JSON.stringify(resumen)}\n`);
    return 0;
  } catch (error) {
    // Siempre explícito: el escenario, la petición, el código y el mensaje de la réplica; nunca en silencio.
    const motivo = error instanceof ErrorDeEscenario ? error.message : `${argumentos.escenario}: ${(error as Error).message}`;
    process.stderr.write(`${limpiar(motivo)}\n`);
    return 1;
  }
}

main().then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (error: Error) => {
    process.stderr.write(`Error inesperado: ${limpiar(error.message)}\n`);
    process.exitCode = 1;
  },
);
