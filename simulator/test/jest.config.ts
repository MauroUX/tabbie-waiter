// Change tk-03-simulador-mesas-pedidos-y-cobros · configuración de Jest de las pruebas del simulador.
// No cubre scenarios por sí misma: corre los *.test.ts de esta carpeta con ts-jest, en Node, uno detrás de otro.
// El globalSetup comprueba, antes de cualquier escenario, que la base está recién cargada (criterio extra del humano).
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  globalSetup: '<rootDir>/apoyo/base-recien-cargada.ts',
  // Holgado: cada test corre el simulador como un proceso aparte contra la réplica.
  testTimeout: 120_000,
};

export default config;
