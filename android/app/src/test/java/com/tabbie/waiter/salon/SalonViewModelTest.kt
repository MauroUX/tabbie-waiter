// Change tk-04-app-base (TK-04) · ViewModel del Salón, con el repositorio en MockK, Turbine y el
// Dispatcher principal reemplazado por uno de prueba.
// Cubre los estados de la pantalla desde la carga: Cargando → ConMesas, SinMesas (vacío), Error
// (Fallida y SinSesion) o SinConexion; que consulta una sola vez al crearse; que "Volver a cargar"
// no hace nada mientras carga; que tras un error no reintenta solo (RNF-6, 0007); y que "Volver a
// cargar" vuelve a Cargando y consulta otra vez.
package com.tabbie.waiter.salon

import app.cash.turbine.test
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestResult
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SalonViewModelTest {
    private val despachador = StandardTestDispatcher()
    private val repositorio = mockk<RepositorioDeSalon>()
    private val dosMesas = listOf(MesaActiva(numero = 1, sesionDeMesaId = 11), MesaActiva(2, 12))

    @Before
    fun reemplazarMain() {
        Dispatchers.setMain(despachador)
    }

    @After
    fun restaurarMain() {
        Dispatchers.resetMain()
    }

    /** El repositorio tarda un segundo de tiempo virtual y devuelve [resultados] en orden. */
    private fun repositorioResponde(vararg resultados: ResultadoMesas) {
        val pendientes = resultados.toMutableList()
        coEvery { repositorio.consultarMesas() } coAnswers {
            delay(1_000)
            pendientes.removeAt(0)
        }
    }

    private fun transicion(resultado: ResultadoMesas, esperado: EstadoSalon): TestResult = runTest {
        repositorioResponde(resultado)
        val viewModel = SalonViewModel(repositorio)

        viewModel.estado.test {
            assertEquals(EstadoSalon.Cargando, awaitItem())
            assertEquals(esperado, awaitItem())
        }
        coVerify(exactly = 1) { repositorio.consultarMesas() }
    }

    @Test
    fun `Salón · cargando → con mesas`() =
        transicion(ResultadoMesas.Mesas(dosMesas), EstadoSalon.ConMesas(dosMesas))

    @Test
    fun `Salón · cargando → vacío`() =
        transicion(ResultadoMesas.Mesas(emptyList()), EstadoSalon.SinMesas)

    @Test
    fun `Salón · cargando → sin conexión`() =
        transicion(ResultadoMesas.SinConexion, EstadoSalon.SinConexion)

    @Test
    fun `Salón · cargando → error si la consulta falla`() =
        transicion(ResultadoMesas.Fallida, EstadoSalon.Error)

    @Test
    fun `Salón · cargando → error si no hay sesión`() =
        transicion(ResultadoMesas.SinSesion, EstadoSalon.Error)

    @Test
    fun `Salón · cargando · volver a cargar no consulta otra vez`() = runTest {
        repositorioResponde(ResultadoMesas.Mesas(dosMesas), ResultadoMesas.Mesas(dosMesas))
        val viewModel = SalonViewModel(repositorio)

        runCurrent()
        assertEquals(EstadoSalon.Cargando, viewModel.estado.value)
        viewModel.volverACargar()
        runCurrent()
        advanceUntilIdle()

        coVerify(exactly = 1) { repositorio.consultarMesas() }
        assertEquals(EstadoSalon.ConMesas(dosMesas), viewModel.estado.value)
    }

    @Test
    fun `Salón · sin conexión · no vuelve a consultar solo`() = runTest {
        repositorioResponde(ResultadoMesas.SinConexion, ResultadoMesas.Mesas(dosMesas))
        val viewModel = SalonViewModel(repositorio)

        advanceUntilIdle()

        coVerify(exactly = 1) { repositorio.consultarMesas() }
        assertEquals(EstadoSalon.SinConexion, viewModel.estado.value)
    }

    @Test
    fun `Salón · error · volver a cargar pasa por cargando y consulta otra vez`() = runTest {
        repositorioResponde(ResultadoMesas.Fallida, ResultadoMesas.Mesas(dosMesas))
        val viewModel = SalonViewModel(repositorio)

        viewModel.estado.test {
            assertEquals(EstadoSalon.Cargando, awaitItem())
            assertEquals(EstadoSalon.Error, awaitItem())
            viewModel.volverACargar()
            assertEquals(EstadoSalon.Cargando, awaitItem())
            assertEquals(EstadoSalon.ConMesas(dosMesas), awaitItem())
        }
        coVerify(exactly = 2) { repositorio.consultarMesas() }
    }
}
