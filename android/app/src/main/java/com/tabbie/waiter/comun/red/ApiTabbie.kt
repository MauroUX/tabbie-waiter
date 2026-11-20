package com.tabbie.waiter.comun.red

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/** Los endpoints de la réplica que usa TK-04: T01 y T05. */
interface ApiTabbie {
    @POST("auth/login")
    suspend fun canjear(@Body cuerpo: CuerpoDeCanje): RespuestaDeCanje

    @Consulta
    @GET("restaurants/{id}/tables/active")
    suspend fun mesasActivas(@Path("id") restaurantId: String): List<MesaDeRed>
}
