import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Restaurant } from '../restaurants/restaurant.entity';
import { TableSession } from '../table-sessions/table-session.entity';

/** Tabla `table` (modelo-de-datos.md, 2.3). `activeSessionId` es una columna simple, sin FK. */
@Entity('table')
@Index(['restaurant'])
@Index(['isBusy'])
@Index(['activeSessionId'])
@Index(['restaurant', 'isBusy'])
@Index(['restaurant', 'number'], { unique: true })
@Index(['qrCode'], { unique: true })
export class Table {
  @ApiProperty({ type: 'integer' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: 'integer' })
  @Column({ type: 'int' })
  number: number;

  @ApiProperty({ type: 'integer' })
  @Column({ type: 'int' })
  seats: number;

  @ApiProperty({ type: 'string' })
  @Column({ type: 'varchar', length: 500 })
  qrCode: string;

  @ApiProperty({ type: () => Restaurant, nullable: true })
  @ManyToOne(() => Restaurant, (restaurante) => restaurante.tables, { nullable: true })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Relation<Restaurant> | null;

  @ApiProperty({ type: 'integer', nullable: true })
  @Column({ type: 'int', nullable: true })
  activeSessionId: number | null;

  /** La sesión a la que apunta `activeSessionId`; solo para leerla (la columna no tiene FK en la base). */
  @ApiProperty({ type: () => TableSession, nullable: true })
  @ManyToOne(() => TableSession, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'activeSessionId' })
  activeSession: Relation<TableSession> | null;

  @ApiProperty({ type: 'boolean' })
  @Column({ type: 'boolean', default: false })
  isBusy: boolean;

  @OneToMany(() => TableSession, (sesion) => sesion.table)
  tableSessions: Relation<TableSession[]>;
}
