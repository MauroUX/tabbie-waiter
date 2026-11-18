// Change tk-01-replica-base · configuración de Jest de las pruebas de contrato de la réplica.
// No cubre scenarios: corre los archivos *.test.ts de esta carpeta con ts-jest, en Node.
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  // Holgado: gitleaks recorre todo el historial y la réplica puede tardar en contestar.
  testTimeout: 120_000,
};

export default config;
