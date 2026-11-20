// Change tk-04-app-base (TK-04) · Revisión adversarial del PR (design D14), DP-99, en la Sesión: un
// error no previsto en el canje de T01 termina en Fallida con motivo=error-inesperado, sin sesión
// guardada, sin anotar su mensaje y sin cerrar la app.
// Cubre: el canje responde 204 sin cuerpo (MockWebServer con el cliente real) y ApiTabbie lanza una
// IllegalStateException con un mensaje (MockK). Firebase es de MockK y da el ID token.
package com.tabbie.waiter.sesion

import com.tabbie.waiter.DatosDePrueba
import com.tabbie.waiter.RegistroEnLista
import com.tabbie.waiter.comun.red.ApiTabbie
import com.tabbie.waiter.comun.red.ClienteHttp
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class ErrorInesperadoDeLaSesionTest {
    private val servidor = MockWebServer()
    private val firebase = mockk<AutenticacionFirebase>()
    private val sesionEnMemoria = SesionEnMemoria()
    private val registro = RegistroEnLista()
    private val email = DatosDePrueba.EMAIL_MOZO
    private val contrasena = DatosDePrueba.CONTRASENA_SINTETICA
    private val idToken = DatosDePrueba.ID_TOKEN_SINTETICO
    private val inesperado =
        "2026-11-19T22:00:00Z sesion fallida origen=inicio-de-sesion motivo=error-inesperado"
    private val detalle = "detalle-del-canje-que-no-se-anota"

    @Before
    fun arrancar() {
        servidor.start()
        coEvery { firebase.iniciarSesion(email, contrasena) } returns
            ResultadoFirebase.IdToken(idToken)
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

    @Test
    fun `DP-99 · Sesión · el canje responde 204 sin cuerpo · Fallida por error inesperado`() =
        runTest {
            servidor.enqueue(MockResponse.Builder().code(204).build())

            val resultado = repositorio().iniciarSesion(email, contrasena)

            assertEquals(ResultadoInicioDeSesion.Fallida, resultado)
            assertNull(sesionEnMemoria.sesion.value)
            assertEquals(listOf(inesperado), registro.lineas)
            coVerify(exactly = 1) { firebase.iniciarSesion(email, contrasena) }
            assertEquals(1, servidor.requestCount)
            // Control positivo: lo que recibió la réplica es el canje.
            val canje = checkNotNull(servidor.takeRequest(1, TimeUnit.SECONDS))
            assertEquals("/auth/login", canje.url.encodedPath)
        }

    @Test
    fun `DP-99 · Sesión · una IllegalStateException en el canje da Fallida sin anotarla`() =
        runTest {
            val api = mockk<ApiTabbie>()
            coEvery { api.canjear(any()) } throws IllegalStateException(detalle)

            val resultado = repositorio(api).iniciarSesion(email, contrasena)

            assertEquals(ResultadoInicioDeSesion.Fallida, resultado)
            assertNull(sesionEnMemoria.sesion.value)
            assertEquals(listOf(inesperado), registro.lineas)
            assertFalse(
                "El registro anota el mensaje de la excepción",
                registro.lineas.any { it.contains(detalle) }
            )
            coVerify(exactly = 1) { firebase.iniciarSesion(email, contrasena) }
            coVerify(exactly = 1) { api.canjear(match { it.firebaseIdToken == idToken }) }
        }
}
