import { Logger, Module } from '@nestjs/common';
import { cert, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { leerEntorno } from '../config/entorno';

export const FIREBASE_AUTH = 'FIREBASE_AUTH';

/**
 * Firebase Admin solo se usa para verificar el ID token de `POST /auth/login` (contexto, sección 0).
 * Con `USE_FIREBASE` desactivada no inicializa nada y devuelve `null` (DP-43, DP-59).
 * Activada, las credenciales ya las validó `leerEntorno`: si falta una, la réplica no arranca y la nombra.
 */
export function crearAuthDeFirebase(): Auth | null {
  const registro = new Logger('FirebaseAdminModule');
  const { firebase } = leerEntorno();
  if (!firebase.activado) {
    registro.log('Firebase desactivado (USE_FIREBASE): no se inicializa Firebase Admin');
    return null;
  }
  const app = initializeApp(
    {
      credential: cert({
        projectId: firebase.projectId,
        clientEmail: firebase.clientEmail,
        privateKey: firebase.privateKey,
      }),
    },
    'replica',
  );
  registro.log('Firebase Admin inicializado');
  return getAuth(app);
}

@Module({
  providers: [{ provide: FIREBASE_AUTH, useFactory: crearAuthDeFirebase }],
  exports: [FIREBASE_AUTH],
})
export class FirebaseAdminModule {}
