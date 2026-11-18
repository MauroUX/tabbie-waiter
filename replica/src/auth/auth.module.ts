import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { leerEntorno } from '../config/entorno';
import { FirebaseAdminModule } from '../firebase-admin/firebase-admin.module';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    FirebaseAdminModule,
    // El vencimiento lo elige AuthService en cada login, según el rol.
    JwtModule.registerAsync({
      useFactory: () => ({ secret: leerEntorno().jwtSecret, signOptions: { algorithm: 'HS256' } }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
