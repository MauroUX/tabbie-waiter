package com.tabbie.waiter.sesion

import com.tabbie.waiter.comun.diagnostico.RegistroDiagnostico
import com.tabbie.waiter.comun.red.ApiTabbie
import com.tabbie.waiter.comun.red.CuerpoDeCanje
import com.tabbie.waiter.comun.red.ProveedorDeJwt
import java.io.IOException
import java.net.UnknownServiceException
import java.time.Instant
import java.util.Base64
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import retrofit2.HttpException

/** La sesión del mozo, en memoria (TK-04; DataStore llega con TK-11). */
class SesionActiva(val jwt: String, val vence: Instant, val restaurantId: String, val rol: String) {
    override fun equals(other: Any?): Boolean = other is SesionActiva &&
        jwt == other.jwt &&
        vence == other.vence &&
        restaurantId == other.restaurantId &&
        rol == other.rol

    override fun hashCode(): Int {
        var resultado = jwt.hashCode()
        resultado = 31 * resultado + vence.hashCode()
        resultado = 31 * resultado + restaurantId.hashCode()
        resultado = 31 * resultado + rol.hashCode()
        return resultado
    }

    /** Sin el JWT (PA-6). */
    override fun toString(): String =
        "SesionActiva(rol=$rol, restaurantId=$restaurantId, vence=$vence)"
}

/** Guarda la sesión activa y da su JWT al Cliente HTTP. */
@Singleton
class SesionEnMemoria @Inject constructor() : ProveedorDeJwt {
    private val actual = MutableStateFlow<SesionActiva?>(null)

    val sesion: StateFlow<SesionActiva?> get() = actual.asStateFlow()

    fun guardar(sesion: SesionActiva) {
        actual.value = sesion
    }

    override fun jwtActual(): String? = actual.value?.jwt
}

sealed interface ResultadoInicioDeSesion {
    data object Iniciada : ResultadoInicioDeSesion

    data object Rechazada : ResultadoInicioDeSesion

    data object SinConexion : ResultadoInicioDeSesion

    data object Fallida : ResultadoInicioDeSesion
}

/** Inicio de sesión: Firebase (T19) y canje del ID token por el JWT (T01). */
class RepositorioDeSesion @Inject constructor(
    private val api: ApiTabbie,
    private val firebase: AutenticacionFirebase,
    private val sesionEnMemoria: SesionEnMemoria,
    private val registro: RegistroDiagnostico
) {
    suspend fun iniciarSesion(email: String, contrasena: String): ResultadoInicioDeSesion =
        when (val resultado = firebase.iniciarSesion(email, contrasena)) {
            ResultadoFirebase.CredencialesRechazadas ->
                fallo(ResultadoInicioDeSesion.Rechazada, "credenciales-rechazadas")

            ResultadoFirebase.SinConexion ->
                fallo(ResultadoInicioDeSesion.SinConexion, "sin-conexion")

            ResultadoFirebase.SinConfiguracion ->
                fallo(ResultadoInicioDeSesion.Fallida, "sin-configuracion-de-firebase")

            ResultadoFirebase.Fallida ->
                fallo(ResultadoInicioDeSesion.Fallida, "firebase-fallido")

            is ResultadoFirebase.IdToken -> canjear(resultado.valor)
        }

    private suspend fun canjear(idToken: String): ResultadoInicioDeSesion {
        val respuesta = try {
            api.canjear(CuerpoDeCanje(idToken))
        } catch (e: UnknownServiceException) {
            return fallo(ResultadoInicioDeSesion.SinConexion, "http-sin-cifrar-bloqueado")
        } catch (e: IOException) {
            return fallo(ResultadoInicioDeSesion.SinConexion, "sin-conexion")
        } catch (e: HttpException) {
            val codigo = "codigo" to e.code()
            return if (e.code() == CODIGO_NO_AUTORIZADO) {
                fallo(ResultadoInicioDeSesion.Rechazada, "canje-rechazado", codigo)
            } else {
                fallo(ResultadoInicioDeSesion.Fallida, "canje-fallido", codigo)
            }
        } catch (e: SerializationException) {
            return fallo(ResultadoInicioDeSesion.Fallida, "respuesta-invalida")
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            return fallo(ResultadoInicioDeSesion.Fallida, "error-inesperado")
        }
        val vence = vencimientoDe(respuesta.accessToken)
            ?: return fallo(ResultadoInicioDeSesion.Fallida, "respuesta-invalida")
        val sesion = SesionActiva(
            jwt = respuesta.accessToken,
            vence = vence,
            restaurantId = respuesta.user.restaurantId,
            rol = respuesta.user.role
        )
        sesionEnMemoria.guardar(sesion)
        registro.anotar(
            "sesion iniciada",
            ORIGEN,
            "rol" to sesion.rol,
            "restaurante" to sesion.restaurantId,
            "vence" to sesion.vence
        )
        return ResultadoInicioDeSesion.Iniciada
    }

    /** El `exp` está en el payload del JWT; la firma la valida la réplica, no la app. */
    private fun vencimientoDe(jwt: String): Instant? = try {
        val payload = jwt.split('.').getOrNull(PARTE_DEL_PAYLOAD)
        val texto = payload?.let { String(Base64.getUrlDecoder().decode(it), Charsets.UTF_8) }
        val exp = texto?.let {
            Json.parseToJsonElement(it).jsonObject["exp"]?.jsonPrimitive?.longOrNull
        }
        exp?.let { Instant.ofEpochSecond(it) }
    } catch (e: IllegalArgumentException) {
        null
    } catch (e: SerializationException) {
        null
    } catch (e: java.time.DateTimeException) {
        null
    }

    private fun fallo(
        resultado: ResultadoInicioDeSesion,
        motivo: String,
        vararg extra: Pair<String, Any>
    ): ResultadoInicioDeSesion {
        registro.anotar("sesion fallida", ORIGEN, "motivo" to motivo, *extra)
        return resultado
    }

    private companion object {
        const val ORIGEN = "inicio-de-sesion"
        const val CODIGO_NO_AUTORIZADO = 401
        const val PARTE_DEL_PAYLOAD = 1
    }
}
