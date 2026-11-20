// Change tk-04-app-base (TK-04) · Registro de diagnóstico en Logcat (design D5, DP-91).
// Cubre: el formato exacto de cada línea, con la hora de un Clock fijo, qué cambió, de dónde vino
// y sus datos; y la etiqueta propia con la que se lee desde la máquina.
package com.tabbie.waiter.comun.diagnostico

import com.tabbie.waiter.DatosDePrueba
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import org.junit.Assert.assertEquals
import org.junit.Test

class RegistroEnLogcatTest {
    private val lineas = mutableListOf<String>()
    private val registro = RegistroEnLogcat(DatosDePrueba.RELOJ) { lineas.add(it) }

    @Test
    fun `Registro · una línea con la hora, qué cambió, el origen y cada dato en orden`() {
        registro.anotar("mesas actualizadas", "consulta", "cantidad" to 2, "sesiones" to "[11,12]")

        assertEquals(
            listOf(
                "2026-11-19T22:00:00Z mesas actualizadas origen=consulta cantidad=2 sesiones=[11,12]"
            ),
            lineas
        )
    }

    @Test
    fun `Registro · sin datos la línea termina en el origen`() {
        registro.anotar("sesion fallida", "inicio-de-sesion")

        assertEquals(listOf("2026-11-19T22:00:00Z sesion fallida origen=inicio-de-sesion"), lineas)
    }

    @Test
    fun `Registro · la hora sale del Clock que recibe`() {
        val otroReloj = Clock.fixed(Instant.parse("2026-11-19T22:00:05Z"), ZoneOffset.UTC)
        val otrasLineas = mutableListOf<String>()

        RegistroEnLogcat(otroReloj) { otrasLineas.add(it) }
            .anotar("sesion fallida", "inicio-de-sesion", "motivo" to "sin-conexion")

        assertEquals(
            listOf(
                "2026-11-19T22:00:05Z sesion fallida origen=inicio-de-sesion motivo=sin-conexion"
            ),
            otrasLineas
        )
    }

    @Test
    fun `Registro · la etiqueta de Logcat es TabbieDiag`() {
        assertEquals("TabbieDiag", RegistroEnLogcat.ETIQUETA)
    }
}
