// Change tk-04-app-base (TK-04) · Revisión adversarial del PR (design D14), DP-100: una consulta de
// mesas tiene un tope total de 4 s (ClienteHttp.ESPERA_CONSULTA), con el tiempo virtual de runTest.
// Cubre el borde con un caso a cada lado: T05 responde a los 3999 ms y la consulta da las mesas; T05
// no respondió a los 4000 ms y la consulta es SinConexion con motivo=sin-respuesta, sin repetirse.
// ApiTabbie es de MockK y espera con delay(n), así que no hay ninguna espera real.
// En la app, el tope corre en tiempo real, en el contexto de IO que RepositorioDeSalon usa por
// defecto (contextoDelTope): los tests con MockWebServer real lo necesitan así, porque en el tiempo
// virtual de runTest el tope vencería mientras la petición espera la red. Este test lo prueba en el
// tiempo virtual: construye el repositorio con contextoDelTope = EmptyCoroutineContext, y la
// consulta corre en el contexto de runTest.
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
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.currentTime
import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TopeDeConsultaTest {
    private val servidor = MockWebServer()
    private val api = mockk<ApiTabbie>()
    private val sesionEnMemoria = SesionEnMemoria()
    private val registro = RegistroEnLista()
    private val restaurante = "5a1a0000-0000-4000-8000-0000000000bb"
    private val hora = "2026-11-19T22:00:00Z"

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

    /**
     * La lista de T05 con una mesa con sesión (mesa 1, sesión 11), leída con el cliente real. Así el
     * test no depende del nombre del modelo de red de T05, que no es parte del contrato. Se lee antes
     * de runTest, para que no cuente en el tiempo virtual.
     */
    private fun mesasDeT05ConUnaMesa() = runBlocking {
        servidor.enqueue(
            MockResponse.Builder()
                .code(200)
                .addHeader("Content-Type", "application/json")
                .body(
                    DatosDePrueba.respuestaDeT05(
                        DatosDePrueba.mesaDeT05(
                            id = 21,
                            numero = 1,
                            sesionId = 11,
                            restaurantId = restaurante
                        )
                    )
                )
                .build()
        )
        ClienteHttp
            .crearRetrofit(servidor.url("/").toString(), sesionEnMemoria)
            .create(ApiTabbie::class.java)
            .mesasActivas(restaurante)
    }

    private fun t05RespondeA(milisegundos: Long) {
        val mesas = mesasDeT05ConUnaMesa()
        coEvery { api.mesasActivas(restaurante) } coAnswers {
            delay(milisegundos)
            mesas
        }
    }

    // Sin el contexto de IO del valor por defecto: el tope corre en el tiempo virtual de runTest.
    private fun repositorio() = RepositorioDeSalon(
        api,
        sesionEnMemoria,
        registro.registro,
        contextoDelTope = EmptyCoroutineContext
    )

    @Test
    fun `Tope de 4 s · T05 responde a los 3999 ms y la consulta da las mesas`() {
        t05RespondeA(3_999)

        runTest {
            val resultado = repositorio().consultarMesas()

            assertEquals(ResultadoMesas.Mesas(listOf(MesaActiva(1, 11))), resultado)
            assertEquals(
                listOf("$hora mesas actualizadas origen=consulta cantidad=1 sesiones=[11]"),
                registro.lineas
            )
            assertEquals(3_999L, currentTime)
            coVerify(exactly = 1) { api.mesasActivas(restaurante) }
        }
    }

    @Test
    fun `Tope de 4 s · a los 4000 ms sin respuesta la consulta es SinConexion y no se repite`() {
        t05RespondeA(4_000)

        runTest {
            val resultado = repositorio().consultarMesas()

            assertEquals(ResultadoMesas.SinConexion, resultado)
            assertEquals(
                listOf("$hora consulta de mesas fallida origen=consulta motivo=sin-respuesta"),
                registro.lineas
            )
            assertEquals(4_000L, currentTime)
            coVerify(exactly = 1) { api.mesasActivas(restaurante) }
        }
    }
}
