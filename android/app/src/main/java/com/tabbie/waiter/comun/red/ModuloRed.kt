package com.tabbie.waiter.comun.red

import com.tabbie.waiter.BuildConfig
import com.tabbie.waiter.sesion.SesionEnMemoria
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import retrofit2.Retrofit

/** El cliente HTTP único y la API de la réplica. */
@Module
@InstallIn(SingletonComponent::class)
object ModuloRed {
    @Provides
    @Singleton
    fun retrofit(sesion: SesionEnMemoria): Retrofit =
        ClienteHttp.crearRetrofit(BuildConfig.URL_BASE, sesion)

    @Provides
    @Singleton
    fun api(retrofit: Retrofit): ApiTabbie = retrofit.create(ApiTabbie::class.java)
}
