// Change tk-03-simulador-mesas-pedidos-y-cobros · apoyo de las pruebas del simulador: JWT del primer mozo del
// restaurante 1, firmado por la prueba (DP-15, DP-57). No cubre scenarios.
// HS256 con JWT_SECRET del entorno y claims {userId, role, iat, exp}, con fechas literales, sin reloj.
import jwt from 'jsonwebtoken';
import { variable } from './entorno';
import { MOZO_1_DEL_RESTAURANTE_1 } from './replica';

/** 2026-01-01T00:00:00Z */
const IAT_VIGENTE = 1767225600;
/** 2100-01-01T00:00:00Z */
const EXP_VIGENTE = 4102444800;

/** JWT vigente del primer mozo del restaurante 1 (`userId` 1, rol `waiter`, DP-71). */
export function jwtDelMozo1(): string {
  return jwt.sign(
    { userId: MOZO_1_DEL_RESTAURANTE_1, role: 'waiter', iat: IAT_VIGENTE, exp: EXP_VIGENTE },
    variable('JWT_SECRET'),
    { algorithm: 'HS256' },
  );
}
