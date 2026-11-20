// Change tk-04-app-base (TK-04) · El registro de diagnóstico no anota datos sensibles (PA-6; WS-c1,
// en parte; DoD propia del ticket).
// Recorre el flujo completo, inicio de sesión y primera consulta de mesas, con MockWebServer como
// réplica y respuestas que traen todo lo que excluye PA-6: el JWT, el email y el nombre del mozo,
// los emails y nombres de los comensales y las credenciales de cobro del restaurante (O4).
package com.tabbie.waiter.comun.diagnostico

import com.tabbie.waiter.DatosDePrueba
import com.tabbie.waiter.RegistroEnLista
import com.tabbie.waiter.comun.red.ApiTabbie
import com.tabbie.waiter.comun.red.ClienteHttp
import com.tabbie.waiter.salon.RepositorioDeSalon
import com.tabbie.waiter.salon.ResultadoMesas
import com.tabbie.waiter.sesion.AutenticacionFirebase
import com.tabbie.waiter.sesion.RepositorioDeSesion
import com.tabbie.waiter.sesion.ResultadoFirebase
import com.tabbie.waiter.sesion.ResultadoInicioDeSesion
import com.tabbie.waiter.sesion.SesionEnMemoria
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class RegistroSinDatosSensiblesTest {
    private val servidor = MockWebServer()
    private val firebase = mockk<AutenticacionFirebase>()
    private val sesionEnMemoria = SesionEnMemoria()
    private val registro = RegistroEnLista()
    private val jwt = DatosDePrueba.jwt(exp = DatosDePrueba.VENCE)

    @Before
    fun arrancar() {
        servidor.start()
    }

    @After
    fun detener() {
        servidor.close()
    }

    private fun respuesta(codigo: Int, cuerpo: String): MockResponse = MockResponse.Builder()
        .code(codigo)
        .addHeader("Content-Type", "application/json")
        .body(cuerpo)
        .build()

    /** Lo que ninguna línea puede contener, con una descripción que no lo repite. */
    private fun prohibidos(): Map<String, String> {
        val partesDelJwt = jwt.split('.')
        return buildMap {
            put("el JWT", jwt)
            put("el encabezado del JWT", partesDelJwt[0])
            put("el payload del JWT", partesDelJwt[1])
            put("la firma del JWT", partesDelJwt[2])
            put(
                "el payload del JWT sin codificar",
                DatosDePrueba.payloadDelJwt(DatosDePrueba.VENCE)
            )
            put("Bearer", "Bearer")
            put("token=", "token=")
            put("access_token", "access_token")
            put("el ID token", DatosDePrueba.ID_TOKEN_SINTETICO)
            put("la contraseña", DatosDePrueba.CONTRASENA_SINTETICA)
            put("un email", "@")
            put("el email del mozo", DatosDePrueba.EMAIL_MOZO)
            put("el nombre del mozo", DatosDePrueba.NOMBRE_MOZO)
            for (numero in 1..2) {
                put(
                    "el email del comensal de la mesa $numero",
                    DatosDePrueba.emailDeComensal(numero)
                )
                put(
                    "el nombre del comensal de la mesa $numero",
                    DatosDePrueba.nombreDeComensal(numero)
                )
            }
            put("una credencial de cobro", "FALSO-NO-ES-MERCADOPAGO")
            put("el token de MercadoPago", DatosDePrueba.MP_TOKEN_FALSO)
            put("el refresh token de MercadoPago", DatosDePrueba.MP_REFRESH_FALSO)
            put("la URL del servidor", servidor.url("/").toString())
            put("el host y el puerto del servidor", "${servidor.hostName}:${servidor.port}")
            put("una ruta de la API", "/restaurants/")
            put("un cuerpo de respuesta", "{")
        }
    }

    @Test
    fun `WS-c1 · el registro del inicio de sesión y las mesas no tiene datos sensibles`() =
        runTest {
            coEvery {
                firebase.iniciarSesion(DatosDePrueba.EMAIL_MOZO, DatosDePrueba.CONTRASENA_SINTETICA)
            } returns ResultadoFirebase.IdToken(DatosDePrueba.ID_TOKEN_SINTETICO)
            servidor.enqueue(respuesta(201, DatosDePrueba.respuestaDeCanje(jwt)))
            servidor.enqueue(
                respuesta(
                    200,
                    DatosDePrueba.respuestaDeT05(
                        DatosDePrueba.mesaDeT05(id = 21, numero = 1, sesionId = 11),
                        DatosDePrueba.mesaDeT05(id = 22, numero = 2, sesionId = 12)
                    )
                )
            )
            val api = ClienteHttp
                .crearRetrofit(servidor.url("/").toString(), sesionEnMemoria)
                .create(ApiTabbie::class.java)
            val sesion = RepositorioDeSesion(api, firebase, sesionEnMemoria, registro.registro)
            val salon = RepositorioDeSalon(api, sesionEnMemoria, registro.registro)

            val inicio = sesion.iniciarSesion(
                DatosDePrueba.EMAIL_MOZO,
                DatosDePrueba.CONTRASENA_SINTETICA
            )
            val mesas = salon.consultarMesas()

            // Control positivo: el flujo pasó y el registro anotó las dos líneas.
            assertEquals(ResultadoInicioDeSesion.Iniciada, inicio)
            assertTrue("Se esperaban las mesas y llegó: $mesas", mesas is ResultadoMesas.Mesas)
            val lineas = registro.lineas.toList()
            assertTrue("Se esperaban al menos 2 líneas", lineas.size >= 2)
            assertTrue(lineas.any { it.contains(" sesion iniciada origen=inicio-de-sesion ") })
            assertTrue(lineas.any { it.contains(" mesas actualizadas origen=consulta ") })

            lineas.forEachIndexed { indice, linea ->
                prohibidos().forEach { (que, valor) ->
                    assertFalse("La línea $indice contiene $que", linea.contains(valor))
                }
            }
        }
}
