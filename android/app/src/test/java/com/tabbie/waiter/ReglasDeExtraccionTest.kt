// Change tk-04-app-base (TK-04) · Revisión adversarial del PR (design D14), DP-97: nada sale de la
// tablet por copia en la nube ni por transferencia entre dispositivos (PA-3).
// Cubre el recurso R.xml.reglas_de_extraccion, leído con Robolectric: tiene una sección
// cloud-backup y una device-transfer; cada una excluye, con path=".", todos los dominios, y ninguna
// incluye nada. Que el manifiesto lo declare en android:dataExtractionRules lo comprueba la sesión
// principal con aapt, fuera de este test.
package com.tabbie.waiter

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.xmlpull.v1.XmlPullParser

@RunWith(AndroidJUnit4::class)
class ReglasDeExtraccionTest {
    private val dominios = listOf(
        "root",
        "file",
        "database",
        "sharedpref",
        "external",
        "device_root",
        "device_file",
        "device_database",
        "device_sharedpref"
    )
    private val nombresDeSeccion = setOf("cloud-backup", "device-transfer")

    private class Seccion(val nombre: String) {
        val excluidos = mutableListOf<Pair<String?, String?>>()
        val incluidos = mutableListOf<Pair<String?, String?>>()
    }

    private class Reglas(val secciones: List<Seccion>, val incluidosFueraDeSeccion: Int)

    private fun leerReglas(): Reglas {
        val contexto = ApplicationProvider.getApplicationContext<Context>()
        val parser = contexto.resources.getXml(R.xml.reglas_de_extraccion)
        val secciones = mutableListOf<Seccion>()
        var incluidosFuera = 0
        var actual: Seccion? = null
        try {
            var evento = parser.eventType
            while (evento != XmlPullParser.END_DOCUMENT) {
                // En el texto y al final del documento el nombre es nulo.
                val nombre: String = parser.name.orEmpty()
                if (evento == XmlPullParser.START_TAG) {
                    val regla = parser.getAttributeValue(null, "domain") to
                        parser.getAttributeValue(null, "path")
                    when {
                        nombre in nombresDeSeccion -> {
                            val seccion = Seccion(nombre)
                            secciones.add(seccion)
                            actual = seccion
                        }

                        nombre == "exclude" -> actual?.excluidos?.add(regla)

                        nombre == "include" -> {
                            val seccion = actual
                            if (seccion == null) incluidosFuera++ else seccion.incluidos.add(regla)
                        }
                    }
                } else if (evento == XmlPullParser.END_TAG && nombre in nombresDeSeccion) {
                    actual = null
                }
                evento = parser.next()
            }
        } finally {
            parser.close()
        }
        return Reglas(secciones, incluidosFuera)
    }

    private fun comprobarSeccion(reglas: Reglas, nombre: String) {
        val secciones = reglas.secciones.filter { it.nombre == nombre }
        assertEquals("Se esperaba una sola sección $nombre", 1, secciones.size)
        val seccion = secciones.first()
        for (dominio in dominios) {
            assertTrue(
                "$nombre no excluye el dominio $dominio con path=\".\"",
                seccion.excluidos.contains(dominio to ".")
            )
        }
        assertEquals("$nombre incluye algo", emptyList<Pair<String?, String?>>(), seccion.incluidos)
    }

    @Test
    fun `DP-97 · la copia en la nube excluye todo y no incluye nada`() {
        val reglas = leerReglas()

        comprobarSeccion(reglas, "cloud-backup")
        assertEquals("Hay un include fuera de las secciones", 0, reglas.incluidosFueraDeSeccion)
    }

    @Test
    fun `DP-97 · la transferencia a otro dispositivo excluye todo y no incluye nada`() {
        val reglas = leerReglas()

        comprobarSeccion(reglas, "device-transfer")
        assertEquals("Hay un include fuera de las secciones", 0, reglas.incluidosFueraDeSeccion)
    }
}
