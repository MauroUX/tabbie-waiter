import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';

const DECIMAL = 'decimal(10,2): llega como string.';

export class JoinDto {
  @ApiProperty({ type: 'integer', description: 'El user.id que devolvió /auth/guest.' })
  userId: number;
}

/** Un `payment` de la sesión (T07, DP-82): sus columnas y `user` con su `restaurant` (`null` en los pagos manuales, C10). */
export class PagoDeSesion {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty({ type: 'integer' })
  sessionId: number;

  @ApiProperty({ type: 'string', description: DECIMAL })
  amount: string;

  @ApiProperty({ type: 'string' })
  currency: string;

  @ApiProperty({ type: 'string', nullable: true })
  method: string | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'boolean' })
  prepaid: boolean;

  @ApiProperty({ type: 'integer', nullable: true })
  userId: number | null;

  @ApiProperty({ type: () => User, nullable: true })
  user: User | null;
}

/** La sesión que devuelve /join: las columnas de `table_session` y sus `users`, cada uno con su `restaurant`. */
export class SesionDeJoin {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty({ type: 'integer' })
  tableId: number;

  @ApiProperty({ type: 'string', description: DECIMAL })
  amountPaid: string;

  @ApiProperty({ type: 'string', description: DECIMAL })
  tips: string;

  @ApiProperty({ type: 'string', description: DECIMAL })
  total: string;

  @ApiProperty({ type: 'boolean' })
  requestingHelp: boolean;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  closedAt: Date | null;

  @ApiProperty({ type: () => [User] })
  users: User[];
}
