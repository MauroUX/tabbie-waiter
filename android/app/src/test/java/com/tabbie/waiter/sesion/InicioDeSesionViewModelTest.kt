// Change tk-04-app-base (TK-04) · ViewModel del inicio de sesión, con el repositorio en MockK,
// Turbine y el Dispatcher principal reemplazado por uno de prueba.
// Cubre los estados de la pantalla: Formulario → Enviando → Iniciada, Rechazado, SinConexion o
// Error; que un segundo toque mientras envía no vuelve a llamar; que tras un error no se reintenta
// solo (RNF-6, 0007); y que el mozo sí puede volver a intentar.
package com.tabbie.waiter.sesion

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
class InicioDeSesionViewModelTest {
    private val despachador = StandardTestDispatcher()
    private val repositorio = mockk<RepositorioDeSesion>()
    private val email = "mozo.prueba@example.com"
    private val contrasena = "solo-para-pruebas-no-es-real"

    @Before
    fun reemplazarMain() {
        Dispatchers.setMain(despachador)
    }

    @After
    fun restaurarMain() {
        Dispatchers.resetMain()
    }

    /** El repositorio tarda un segundo de tiempo virtual y devuelve [resultados] en orden. */
    private fun repositorioResponde(vararg resultados: ResultadoInicioDeSesion) {
        val pendientes = resultados.toMutableList()
        coEvery { repositorio.iniciarSesion(any(), any()) } coAnswers {
            delay(1_000)
            pendientes.removeAt(0)
        }
    }

    private fun transicion(
        resultado: ResultadoInicioDeSesion,
        esperado: EstadoInicioDeSesion
    ): TestResult = runTest {
        repositorioResponde(resultado)
        val viewModel = InicioDeSesionViewModel(repositorio)

        viewModel.estado.test {
            assertEquals(EstadoInicioDeSesion.Formulario, awaitItem())
            viewModel.entrar(email, contrasena)
            assertEquals(EstadoInicioDeSesion.Enviando, awaitItem())
            assertEquals(esperado, awaitItem())
        }
        coVerify(exactly = 1) { repositorio.iniciarSesion(email, contrasena) }
    }

    @Test
    fun `Inicio de sesión · formulario → enviando → iniciada`() =
        transicion(ResultadoInicioDeSesion.Iniciada, EstadoInicioDeSesion.Iniciada)

    @Test
    fun `Inicio de sesión · formulario → enviando → rechazado`() =
        transicion(ResultadoInicioDeSesion.Rechazada, EstadoInicioDeSesion.Rechazado)

    @Test
    fun `Inicio de sesión · formulario → enviando → sin conexión`() =
        transicion(ResultadoInicioDeSesion.SinConexion, EstadoInicioDeSesion.SinConexion)

    @Test
    fun `Inicio de sesión · formulario → enviando → error`() =
        transicion(ResultadoInicioDeSesion.Fallida, EstadoInicioDeSesion.Error)

    @Test
    fun `Inicio de sesión · enviando · un segundo toque no vuelve a llamar`() = runTest {
        repositorioResponde(ResultadoInicioDeSesion.Iniciada, ResultadoInicioDeSesion.Iniciada)
        val viewModel = InicioDeSesionViewModel(repositorio)

        viewModel.entrar(email, contrasena)
        runCurrent()
        assertEquals(EstadoInicioDeSesion.Enviando, viewModel.estado.value)
        viewModel.entrar(email, contrasena)
        runCurrent()
        advanceUntilIdle()

        coVerify(exactly = 1) { repositorio.iniciarSesion(any(), any()) }
        assertEquals(EstadoInicioDeSesion.Iniciada, viewModel.estado.value)
    }

    @Test
    fun `Inicio de sesión · sin conexión · no vuelve a intentar solo`() = runTest {
        repositorioResponde(ResultadoInicioDeSesion.SinConexion, ResultadoInicioDeSesion.Iniciada)
        val viewModel = InicioDeSesionViewModel(repositorio)

        viewModel.entrar(email, contrasena)
        advanceUntilIdle()

        coVerify(exactly = 1) { repositorio.iniciarSesion(any(), any()) }
        assertEquals(EstadoInicioDeSesion.SinConexion, viewModel.estado.value)
    }

    @Test
    fun `Inicio de sesión · error · el mozo puede volver a tocar Entrar`() = runTest {
        repositorioResponde(ResultadoInicioDeSesion.Fallida, ResultadoInicioDeSesion.Iniciada)
        val viewModel = InicioDeSesionViewModel(repositorio)

        viewModel.entrar(email, contrasena)
        advanceUntilIdle()
        assertEquals(EstadoInicioDeSesion.Error, viewModel.estado.value)
        viewModel.entrar(email, contrasena)
        advanceUntilIdle()

        coVerify(exactly = 2) { repositorio.iniciarSesion(email, contrasena) }
        assertEquals(EstadoInicioDeSesion.Iniciada, viewModel.estado.value)
    }
}
