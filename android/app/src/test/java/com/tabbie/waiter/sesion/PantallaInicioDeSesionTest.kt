// Change tk-04-app-base (TK-04) · Pantalla de inicio de sesión sin diseño, con Compose UI test
// sobre Robolectric y cada estado puesto directo.
// Cubre un test por estado: Formulario (escribir y tocar Entrar), Enviando (carga, con el botón
// deshabilitado), Rechazado, SinConexion y Error. Vacío no aplica: es un formulario.
package com.tabbie.waiter.sesion

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PantallaInicioDeSesionTest {
    @get:Rule
    val compose = createComposeRule()

    private val enviando = "Iniciando sesión…"
    private val rechazado = "El email o la contraseña no son correctos."
    private val sinConexion = "No hay conexión. Revisá la red y volvé a intentar."
    private val error = "No se pudo iniciar sesión. Volvé a intentar."
    private val mensajes = listOf(enviando, rechazado, sinConexion, error)

    private val llamadas = mutableListOf<Pair<String, String>>()

    private fun mostrar(estado: EstadoInicioDeSesion) {
        compose.setContent {
            PantallaInicioDeSesion(estado = estado, alEntrar = { e, c -> llamadas.add(e to c) })
        }
    }

    /** Siempre están los dos campos y el botón Entrar. */
    private fun muestraElFormulario() {
        compose.onNodeWithTag("campo-email").assertIsDisplayed()
        compose.onNodeWithTag("campo-contrasena").assertIsDisplayed()
        compose.onNodeWithTag("boton-entrar").assertIsDisplayed()
        compose.onNodeWithText("Entrar").assertIsDisplayed()
    }

    /** Muestra [mensaje] y ninguno de los otros; con null, ninguno. */
    private fun muestraSolo(mensaje: String?) {
        mensajes.forEach {
            if (it == mensaje) {
                compose.onNodeWithText(it).assertIsDisplayed()
            } else {
                compose.onNodeWithText(it).assertDoesNotExist()
            }
        }
    }

    @Test
    fun `Inicio de sesión · formulario · tocar Entrar manda lo escrito una vez`() {
        mostrar(EstadoInicioDeSesion.Formulario)

        muestraElFormulario()
        muestraSolo(null)
        compose.onNodeWithTag("boton-entrar").assertIsEnabled()
        compose.onNodeWithTag("campo-email").performTextInput("mozo.prueba@example.com")
        compose.onNodeWithTag("campo-contrasena").performTextInput("solo-para-pruebas-no-es-real")
        compose.onNodeWithText("Entrar").performClick()

        assertEquals(listOf("mozo.prueba@example.com" to "solo-para-pruebas-no-es-real"), llamadas)
    }

    @Test
    fun `Inicio de sesión · enviando · muestra la carga y el botón no se puede tocar`() {
        mostrar(EstadoInicioDeSesion.Enviando)

        muestraElFormulario()
        muestraSolo(enviando)
        compose.onNodeWithTag("boton-entrar").assertIsNotEnabled()
        compose.onNodeWithText("Entrar").performClick()

        assertEquals(emptyList<Pair<String, String>>(), llamadas)
    }

    @Test
    fun `Inicio de sesión · rechazado · dice que el email o la contraseña no son correctos`() {
        mostrar(EstadoInicioDeSesion.Rechazado)

        muestraElFormulario()
        muestraSolo(rechazado)
        compose.onNodeWithTag("boton-entrar").assertIsEnabled()
    }

    @Test
    fun `Inicio de sesión · sin conexión · dice que no hay conexión`() {
        mostrar(EstadoInicioDeSesion.SinConexion)

        muestraElFormulario()
        muestraSolo(sinConexion)
        compose.onNodeWithTag("boton-entrar").assertIsEnabled()
    }

    @Test
    fun `Inicio de sesión · error · dice que no se pudo iniciar sesión`() {
        mostrar(EstadoInicioDeSesion.Error)

        muestraElFormulario()
        muestraSolo(error)
        compose.onNodeWithTag("boton-entrar").assertIsEnabled()
    }
}
