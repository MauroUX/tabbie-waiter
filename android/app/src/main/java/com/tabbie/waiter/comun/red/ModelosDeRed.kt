package com.tabbie.waiter.comun.red

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Cuerpo de T01. */
@Serializable
class CuerpoDeCanje(val firebaseIdToken: String)

/** Respuesta de T01, solo con lo que usa la app. */
@Serializable
class RespuestaDeCanje(
    @SerialName("access_token") val accessToken: String,
    val user: UsuarioDeCanje
)

@Serializable
class UsuarioDeCanje(val role: String, val restaurantId: String)

/** Una mesa de T05, solo con lo que usa la app: los campos de O4 no se declaran. */
@Serializable
class MesaDeRed(val id: Int, val number: Int, val activeSession: SesionDeMesaDeRed? = null)

@Serializable
class SesionDeMesaDeRed(val id: Int)
