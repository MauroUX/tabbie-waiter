import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { TableSession } from '../table-sessions/table-session.entity';
import { User } from '../users/user.entity';

/** Tabla `payment` (modelo-de-datos.md, 2.13). `method` no es un enum en la base. `amount` llega como string. */
@Entity('payment')
@Index(['sessionId', 'createdAt'])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  sessionId: number;

  @ManyToOne(() => TableSession, (sesion) => sesion.payments)
  @JoinColumn({ name: 'sessionId' })
  session: Relation<TableSession>;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: string;

  @Column({ type: 'varchar', length: 255 })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  method: string | null;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @Column({ type: 'boolean', default: false })
  prepaid: boolean;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, (usuario) => usuario.payments, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: Relation<User> | null;
}
