// Change tk-03-simulador-mesas-pedidos-y-cobros · spec simulador-comensales · scenario
// "Con la réplica cargada desde cero, los tres escenarios corren y T16 y T17 llegan por `/sse/waiters`", la parte
// "si la base no estaba recién cargada, la suite falla antes de correr ningún escenario".
// globalSetup de Jest: con el JWT del primer mozo del restaurante 1, T05 del restaurante 1 tiene que devolver `[]`.
import { jwtDelMozo1 } from './jwt';
import { mesasActivasDelRestaurante1 } from './replica';

const MENSAJE_BASE_NO_RECIEN_CARGADA =
  'la suite del simulador supone una base recién cargada: corré carga-desde-cero.sh';

export default async function baseRecienCargada(): Promise<void> {
  const { estado, cuerpo } = await mesasActivasDelRestaurante1(jwtDelMozo1());
  if (estado !== 200 || !Array.isArray(cuerpo)) {
    throw new Error(
      `La comprobación inicial no pudo leer T05 del primer mozo del restaurante 1: respondió ${estado} con ${JSON.stringify(cuerpo)}.`,
    );
  }
  if (cuerpo.length !== 0) {
    throw new Error(MENSAJE_BASE_NO_RECIEN_CARGADA);
  }
}
