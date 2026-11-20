package com.tabbie.waiter.sesion

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/** Firebase detrás de la interfaz propia de la Sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class ModuloSesion {
    @Binds
    abstract fun autenticacion(implementacion: AutenticacionFirebaseSdk): AutenticacionFirebase
}
