package com.tabbie.waiter.comun.diagnostico

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.time.Clock
import javax.inject.Singleton

/** El reloj y el registro de diagnóstico, únicos en toda la app. */
@Module
@InstallIn(SingletonComponent::class)
object ModuloComun {
    @Provides
    @Singleton
    fun reloj(): Clock = Clock.systemUTC()

    @Provides
    @Singleton
    fun registro(reloj: Clock): RegistroDiagnostico = RegistroEnLogcat(reloj)
}
