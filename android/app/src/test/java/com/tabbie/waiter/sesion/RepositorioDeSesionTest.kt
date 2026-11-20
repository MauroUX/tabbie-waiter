// Change tk-04-app-base (TK-04) · Repositorio de sesión (design D7), con la API real de
// ClienteHttp contra MockWebServer, Firebase con MockK y un registro real con Clock fijo.
// Cubre: el inicio de sesión con el canje de T01 (WS-c1, en parte), cada camino de fallo con su
// línea del registro, el canje bloqueado por HTTP sin cifrar como "sin conexión" (SEG-c7, la parte
// local), que Firebase se llama una sola vez, que sin ID token no hay canje y que la sesión no
// muestra el JWT.
package com.tabbie.waiter.sesion

import com.tabbie.waiter.DatosDePrueba
import com.tabbie.waiter.RegistroEnLista
import com.tabbie.waiter.comun.red.ApiTabbie
import com.tabbie.waiter.comun.red.ClienteHttp
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import java.net.UnknownServiceException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import mockwebserver3.SocketEffect
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class RepositorioDeSesionTest {
    private val servidor = MockWebServer()
    private val firebase = mockk<AutenticacionFirebase>()
    private val sesionEnMemoria = SesionEnMemoria()
    private val registro = RegistroEnLista()
    private val jwt = DatosDePrueba.jwt(exp = DatosDePrueba.VENCE)
    private val email = DatosDePrueba.EMAIL_MOZO
    private val contrasena = DatosDePrueba.CONTRASENA_SINTETICA
    private val idToken = DatosDePrueba.ID_TOKEN_SINTETICO
    private val hora = "2026-11-19T22:00:00Z"
    private val fallida = "$hora sesion fallida origen=inicio-de-sesion"

    @Before
    fun arrancar() {
        servidor.start()
    }

    @After
    fun detener() {
        servidor.close()
    }

    private fun apiDelServidor(): ApiTabbie = ClienteHttp
        .crearRetrofit(servidor.url("/").toString(), sesionEnMemoria)
        .create(ApiTabbie::class.java)

    private fun repositorio(api: ApiTabbie = apiDelServidor()) =
        RepositorioDeSesion(api, firebase, sesionEnMemoria, registro.registro)

    private fun firebaseResponde(resultado: ResultadoFirebase) {
        coEvery { firebase.iniciarSesion(email, contrasena) } returns resultado
    }

    private fun respuesta(codigo: Int, cuerpo: String): MockResponse = MockResponse.Builder()
        .code(codigo)
        .addHeader("Content-Type", "application/json")
        .body(cuerpo)
        .build()

    private fun firebaseSeLlamoUnaVez() {
        coVerify(exactly = 1) { firebase.iniciarSesion(email, contrasena) }
    }

    @Test
    fun `WS-c1 · con el ID token canjeado guarda la sesión y anota sesion iniciada`() = runTest {
        firebaseResponde(ResultadoFirebase.IdToken(idToken))
        servidor.enqueue(respuesta(201, DatosDePrueba.respuestaDeCanje(jwt)))

        val resultado = repositorio().iniciarSesion(email, contrasena)

        assertEquals(ResultadoInicioDeSesion.Iniciada, resultado)
        assertEquals(
            SesionActiva(
                jwt = jwt,
                vence = DatosDePrueba.VENCE,
                restaurantId = DatosDePrueba.RESTAURANTE_1,
                rol = "waiter"
            ),
            sesionEnMemoria.sesion.value
        )
        assertEquals(jwt, sesionEnMemoria.jwtActual())
        assertEquals(
            listOf(
                "$hora sesion iniciada origen=inicio-de-sesion rol=waiter " +
                    "restaurante=${DatosDePrueba.RESTAURANTE_1} vence=2026-11-20T06:00:00Z"
            ),
            registro.lineas
        )
        firebaseSeLlamoUnaVez()
        assertEquals(1, servidor.requestCount)
        val canje = checkNotNull(servidor.takeRequest(1, TimeUnit.SECONDS))
        assertEquals("/auth/login", canje.url.encodedPath)
        assertEquals(
            buildJsonObject { put("firebaseIdToken", idToken) },
            Json.parseToJsonElement(canje.body?.utf8().orEmpty())
        )
    }

    @Test
    fun `Sesión · Firebase rechaza las credenciales · Rechazada sin canje`() = runTest {
        firebaseResponde(ResultadoFirebase.CredencialesRechazadas)

        val resultado = repositorio().iniciarSesion(email, contrasena)

        assertEquals(ResultadoInicioDeSesion.Rechazada, resultado)
        assertNull(sesionEnMemoria.sesion.value)
        assertEquals(listOf("$fallida motivo=credenciales-rechazadas"), registro.lineas)
        firebaseSeLlamoUnaVez()
        assertEquals(0, servidor.requestCount)
    }

    @Test
    fun `Sesión · Firebase sin conexión · SinConexion sin canje`() = runTest {
        firebaseResponde(ResultadoFirebase.SinConexion)

        val resultado = repositorio().iniciarSesion(email, contrasena)

        assertEquals(ResultadoInicioDeSesion.SinConexion, resultado)
        assertNull(sesionEnMemoria.sesion.value)
        assertEquals(listOf("$fallida motivo=sin-conexion"), registro.lineas)
        firebaseSeLlamoUnaVez()
        assertEquals(0, servidor.requestCount)
    }

    @Test
    fun `Sesión · Firebase sin configuración · Fallida sin canje`() = runTest {
        firebaseResponde(ResultadoFirebase.SinConfiguracion)

        val resultado = repositorio().iniciarSesion(email, contrasena)

        assertEquals(ResultadoInicioDeSesion.Fallida, resultado)
        assertNull(sesionEnMemoria.sesion.value)
        assertEquals(listOf("$fallida motivo=sin-configuracion-de-firebase"), registro.lineas)
        firebaseSeLlamoUnaVez()
        assertEquals(0, servidor.requestCount)
    }

    @Test
    fun `Sesión · el canje responde 401 · Rechazada`() = runTest {
        firebaseResponde(ResultadoFirebase.IdToken(idToken))
        servidor.enqueue(respuesta(401, """{"statusCode":401,"message":"Unauthorized"}"""))

        val resultado = repositorio().iniciarSesion(email, contrasena)

        assertEquals(ResultadoInicioDeSesion.Rechazada, resultado)
        assertNull(sesionEnMemoria.sesion.value)
        assertEquals(listOf("$fallida motivo=canje-rechazado codigo=401"), registro.lineas)
        firebaseSeLlamoUnaVez()
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `Sesión · el canje responde 500 · Fallida`() = runTest {
        firebaseResponde(ResultadoFirebase.IdToken(idToken))
        servidor.enqueue(respuesta(500, """{"statusCode":500,"message":"Internal error"}"""))

        val resultado = repositorio().iniciarSesion(email, contrasena)

        assertEquals(ResultadoInicioDeSesion.Fallida, resultado)
        assertNull(sesionEnMemoria.sesion.value)
        assertEquals(listOf("$fallida motivo=canje-fallido codigo=500"), registro.lineas)
        firebaseSeLlamoUnaVez()
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `SEG-c7 · el canje bloqueado por HTTP sin cifrar termina en SinConexion`() = runTest {
        firebaseResponde(ResultadoFirebase.IdToken(idToken))
        val api = mockk<ApiTabbie>()
        coEvery { api.canjear(any()) } throws
            UnknownServiceException("CLEARTEXT communication not permitted by network policy")

        val resultado = repositorio(api).iniciarSesion(email, contrasena)

        assertEquals(ResultadoInicioDeSesion.SinConexion, resultado)
        assertNull(sesionEnMemoria.sesion.value)
        assertEquals(listOf("$fallida motivo=http-sin-cifrar-bloqueado"), registro.lineas)
        firebaseSeLlamoUnaVez()
        coVerify(exactly = 1) { api.canjear(match { it.firebaseIdToken == idToken }) }
    }

    @Test
    fun `Sesión · un corte durante el canje · SinConexion sin repetirlo`() = runTest {
        firebaseResponde(ResultadoFirebase.IdToken(idToken))
        servidor.enqueue(MockResponse.Builder().onResponseStart(SocketEffect.CloseSocket()).build())
        // Si el canje se repitiera, esta respuesta iniciaría la sesión.
        servidor.enqueue(respuesta(201, DatosDePrueba.respuestaDeCanje(jwt)))

        val resultado = repositorio().iniciarSesion(email, contrasena)

        assertEquals(ResultadoInicioDeSesion.SinConexion, resultado)
        assertNull(sesionEnMemoria.sesion.value)
        assertEquals(listOf("$fallida motivo=sin-conexion"), registro.lineas)
        firebaseSeLlamoUnaVez()
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `Sesión · el canje responde algo ilegible · Fallida por respuesta inválida`() = runTest {
        firebaseResponde(ResultadoFirebase.IdToken(idToken))
        servidor.enqueue(respuesta(201, "esto no es JSON"))

        val resultado = repositorio().iniciarSesion(email, contrasena)

        assertEquals(ResultadoInicioDeSesion.Fallida, resultado)
        assertNull(sesionEnMemoria.sesion.value)
        assertEquals(listOf("$fallida motivo=respuesta-invalida"), registro.lineas)
        firebaseSeLlamoUnaVez()
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `Sesión · el JWT del canje no trae exp · Fallida por respuesta inválida`() = runTest {
        firebaseResponde(ResultadoFirebase.IdToken(idToken))
        val jwtSinExp = DatosDePrueba.jwt(exp = null)
        servidor.enqueue(respuesta(201, DatosDePrueba.respuestaDeCanje(jwtSinExp)))

        val resultado = repositorio().iniciarSesion(email, contrasena)

        assertEquals(ResultadoInicioDeSesion.Fallida, resultado)
        assertNull(sesionEnMemoria.sesion.value)
        assertEquals(listOf("$fallida motivo=respuesta-invalida"), registro.lineas)
        firebaseSeLlamoUnaVez()
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `Sesión · la sesión activa no muestra el JWT al pasarla a texto`() {
        val sesion = SesionActiva(
            jwt = jwt,
            vence = DatosDePrueba.VENCE,
            restaurantId = DatosDePrueba.RESTAURANTE_1,
            rol = "waiter"
        )

        val texto = sesion.toString()

        assertFalse("toString() muestra el JWT", texto.contains(jwt))
        assertFalse(
            "toString() muestra la firma del JWT",
            texto.contains(jwt.substringAfterLast('.'))
        )
        assertFalse("toString() muestra el payload del JWT", texto.contains(jwt.split('.')[1]))
        // Control positivo: la sesión se compara por valor, como dice el contrato.
        val igual = SesionActiva(
            jwt = jwt,
            vence = DatosDePrueba.VENCE,
            restaurantId = DatosDePrueba.RESTAURANTE_1,
            rol = "waiter"
        )
        assertEquals(igual, sesion)
        assertEquals(igual.hashCode(), sesion.hashCode())
    }
}
