// Change tk-04-app-base (TK-04) · Revisión adversarial del PR (design D14), DP-99, en el Salón: un
// error no previsto en la consulta de mesas termina en Fallida con motivo=error-inesperado, sin
// anotar su mensaje y sin cerrar la app; una cancelación se vuelve a lanzar.
// Cubre: T05 responde 204 sin cuerpo (MockWebServer con el cliente real), ApiTabbie lanza una
// IllegalStateException (MockK) y ApiTabbie lanza una CancellationException (MockK).
package com.tabbie.waiter.salon

import com.tabbie.waiter.DatosDePrueba
import com.tabbie.waiter.RegistroEnLista
import com.tabbie.waiter.comun.red.ApiTabbie
import com.tabbie.waiter.comun.red.ClienteHttp
import com.tabbie.waiter.sesion.SesionActiva
import com.tabbie.waiter.sesion.SesionEnMemoria
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import java.util.concurrent.TimeUnit
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ErrorInesperadoDelSalonTest {
    private val servidor = MockWebServer()
    private val sesionEnMemoria = SesionEnMemoria()
    private val registro = RegistroEnLista()
    private val restaurante = "5a1a0000-0000-4000-8000-0000000000cc"
    private val inesperado =
        "2026-11-19T22:00:00Z consulta de mesas fallida origen=consulta motivo=error-inesperado"
    private val detalle = "detalle-que-no-se-anota"

    @Before
    fun arrancar() {
        servidor.start()
        sesionEnMemoria.guardar(
            SesionActiva(
                jwt = DatosDePrueba.jwt(exp = DatosDePrueba.VENCE),
                vence = DatosDePrueba.VENCE,
                restaurantId = restaurante,
                rol = "waiter"
            )
        )
    }

    @After
    fun detener() {
        servidor.close()
    }

    private fun apiDelServidor(): ApiTabbie = ClienteHttp
        .crearRetrofit(servidor.url("/").toString(), sesionEnMemoria)
        .create(ApiTabbie::class.java)

    private fun repositorio(api: ApiTabbie = apiDelServidor()) =
        RepositorioDeSalon(api, sesionEnMemoria, registro.registro)

    @Test
    fun `DP-99 · Salón · T05 responde 204 sin cuerpo · Fallida por error inesperado`() = runTest {
        servidor.enqueue(MockResponse.Builder().code(204).build())

        val resultado = repositorio().consultarMesas()

        assertEquals(ResultadoMesas.Fallida, resultado)
        assertEquals(listOf(inesperado), registro.lineas)
        assertEquals(1, servidor.requestCount)
        // Control positivo: la consulta salió a T05 del restaurante de la sesión.
        val peticion = checkNotNull(servidor.takeRequest(1, TimeUnit.SECONDS))
        assertEquals("/restaurants/$restaurante/tables/active", peticion.url.encodedPath)
    }

    @Test
    fun `DP-99 · Salón · una IllegalStateException da Fallida y su mensaje no se anota`() =
        runTest {
            val api = mockk<ApiTabbie>()
            coEvery { api.mesasActivas(any()) } throws IllegalStateException(detalle)

            val resultado = repositorio(api).consultarMesas()

            assertEquals(ResultadoMesas.Fallida, resultado)
            assertEquals(listOf(inesperado), registro.lineas)
            assertFalse(
                "El registro anota el mensaje de la excepción",
                registro.lineas.any { it.contains(detalle) }
            )
            coVerify(exactly = 1) { api.mesasActivas(restaurante) }
        }

    @Test
    fun `DP-99 · Salón · una CancellationException se vuelve a lanzar y no se anota nada`() =
        runTest {
            val api = mockk<ApiTabbie>()
            coEvery { api.mesasActivas(any()) } throws CancellationException("cancelada")

            val error = runCatching { repositorio(api).consultarMesas() }.exceptionOrNull()

            assertTrue(
                "Se esperaba la CancellationException y llegó: $error",
                error is CancellationException
            )
            assertEquals(emptyList<String>(), registro.lineas)
            // Control positivo: la cancelación salió de la consulta a T05, no de antes.
            coVerify(exactly = 1) { api.mesasActivas(restaurante) }
        }
}
