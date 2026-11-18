import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/user.entity';
import { JwtStrategy } from './jwt.strategy';

/** Registra la estrategia `jwt` de Passport. Lo importan los módulos con rutas con `JwtAuthGuard`. */
@Module({
  imports: [PassportModule, TypeOrmModule.forFeature([User])],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class AuthGuardsModule {}
