// Change tk-01-replica-base · apoyo de las pruebas de contrato: JWT propio firmado por la prueba (DP-15, DP-57).
// No cubre scenarios. HS256 con JWT_SECRET y claims {userId, role, iat, exp}; las fechas son literales, sin reloj.
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { variable } from './entorno';

/** 2026-01-01T00:00:00Z */
const IAT_VIGENTE = 1767225600;
/** 2100-01-01T00:00:00Z */
const EXP_VIGENTE = 4102444800;
/** 2024-01-01T00:00:00Z */
const IAT_VENCIDO = 1704067200;
/** 2024-01-01T01:00:00Z */
const EXP_VENCIDO = 1704070800;

export type Rol = 'user' | 'admin' | 'waiter' | 'backoffice';

function firmar(userId: number, role: Rol, iat: number, exp: number, secreto: string): string {
  return jwt.sign({ userId, role, iat, exp }, secreto, { algorithm: 'HS256' });
}

/** JWT vigente, firmado con el JWT_SECRET de la réplica. */
export function jwtVigente(userId: number, role: Rol): string {
  return firmar(userId, role, IAT_VIGENTE, EXP_VIGENTE, variable('JWT_SECRET'));
}

/** JWT ya vencido, firmado con el JWT_SECRET de la réplica. */
export function jwtVencido(userId: number, role: Rol): string {
  return firmar(userId, role, IAT_VENCIDO, EXP_VENCIDO, variable('JWT_SECRET'));
}

/** JWT vigente firmado con un secreto aleatorio generado en el momento ("otra firma"). */
export function jwtConOtraFirma(userId: number, role: Rol): string {
  const secretoAjeno = randomBytes(32).toString('hex');
  return firmar(userId, role, IAT_VIGENTE, EXP_VIGENTE, secretoAjeno);
}
