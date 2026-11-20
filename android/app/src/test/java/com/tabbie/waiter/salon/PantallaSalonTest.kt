// Change tk-04-app-base (TK-04) · Pantalla del Salón sin diseño, con Compose UI test sobre
// Robolectric y cada estado puesto directo.
// Cubre un test por estado: Cargando, ConMesas (Mesa 1 y Mesa 2 en la lista), SinMesas (vacío),
// Error y SinConexion, estos dos con "Volver a cargar", que el mozo toca una vez.
package com.tabbie.waiter.salon

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PantallaSalonTest {
    @get:Rule
    val compose = createComposeRule()

    private val cargando = "Cargando mesas…"
    private val sinMesas = "No hay mesas ocupadas."
    private val error = "No se pudieron cargar las mesas."
    private val sinConexion = "No hay conexión. No se pudieron cargar las mesas."
    private val mensajes = listOf(cargando, sinMesas, error, sinConexion)

    private var vecesVolverACargar = 0

    private fun mostrar(estado: EstadoSalon) {
        compose.setContent {
            PantallaSalon(estado = estado, alVolverACargar = { vecesVolverACargar++ })
        }
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

    /** La fila de la mesa [numero]: con su tag, con el texto "Mesa N" y dentro de la lista. */
    private fun muestraLaMesa(numero: Int) {
        val fila = hasTestTag("mesa-$numero")
        compose.onNode(fila and hasAnyAncestor(hasTestTag("lista-mesas")), useUnmergedTree = true)
            .assertExists()
        compose.onNode(
            hasText("Mesa $numero") and (fila or hasAnyAncestor(fila)),
            useUnmergedTree = true
        ).assertIsDisplayed()
    }

    @Test
    fun `Salón · cargando · dice que las mesas están llegando`() {
        mostrar(EstadoSalon.Cargando)

        muestraSolo(cargando)
        compose.onNodeWithTag("lista-mesas").assertDoesNotExist()
    }

    @Test
    fun `Salón · con mesas · muestra una fila por mesa en la lista`() {
        mostrar(
            EstadoSalon.ConMesas(
                listOf(MesaActiva(numero = 1, sesionDeMesaId = 11), MesaActiva(2, 12))
            )
        )

        compose.onNodeWithTag("lista-mesas").assertIsDisplayed()
        muestraLaMesa(1)
        muestraLaMesa(2)
        compose.onNodeWithTag("mesa-3").assertDoesNotExist()
        muestraSolo(null)
    }

    @Test
    fun `Salón · vacío · dice que no hay mesas ocupadas`() {
        mostrar(EstadoSalon.SinMesas)

        muestraSolo(sinMesas)
        compose.onNodeWithTag("mesa-1").assertDoesNotExist()
    }

    @Test
    fun `Salón · error · lo dice y ofrece volver a cargar`() {
        mostrar(EstadoSalon.Error)

        muestraSolo(error)
        compose.onNodeWithText("Volver a cargar").assertIsDisplayed().performClick()

        assertEquals(1, vecesVolverACargar)
    }

    @Test
    fun `Salón · sin conexión · lo dice y ofrece volver a cargar`() {
        mostrar(EstadoSalon.SinConexion)

        muestraSolo(sinConexion)
        compose.onNodeWithText("Volver a cargar").assertIsDisplayed().performClick()

        assertEquals(1, vecesVolverACargar)
    }
}
