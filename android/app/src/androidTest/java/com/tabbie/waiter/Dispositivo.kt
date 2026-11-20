// Change tk-04-app-base (TK-04) · Ayudas de las pruebas en el dispositivo (SEG-c7 y WS-c1).
// La cuenta de prueba llega por argumentos de instrumentación, que salen de variables de entorno
// (DP-93); nunca se escribe en un log ni en un mensaje. El registro de diagnóstico y el resto del
// Logcat de la app se leen desde la instrumentación, y las esperas son siempre con una condición.
// Para el email de WS-c1, el Logcat se lee con su etiqueta y se le quitan las líneas del SDK de
// Firebase (decisión del humano, opción a).
package com.tabbie.waiter

import android.os.ParcelFileDescriptor
import android.os.Process
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.platform.app.InstrumentationRegistry

object Dispositivo {
    /** El restaurante 1 de los datos iniciales de la réplica. */
    const val RESTAURANTE_1 = "11111111-1111-4111-8111-111111111111"

    /** Lo más que se espera una condición en el dispositivo. */
    const val ESPERA_MS = 30_000L

    /** La etiqueta del registro de diagnóstico en Logcat (design D5). */
    const val ETIQUETA_DEL_REGISTRO = "TabbieDiag"

    private fun shell(comando: String): String {
        val salida = InstrumentationRegistry.getInstrumentation().uiAutomation
            .executeShellCommand(comando)
        return ParcelFileDescriptor.AutoCloseInputStream(salida).bufferedReader().use {
            it.readText()
        }
    }

    fun limpiarLogcat() {
        shell("logcat -c")
    }

    /** Las líneas del registro de diagnóstico, sin los separadores de Logcat. */
    fun lineasDelRegistro(): List<String> = shell("logcat -d -v raw -s $ETIQUETA_DEL_REGISTRO:I")
        .lines()
        .map { it.trim() }
        .filter { it.isNotEmpty() && !it.startsWith("---------") }

    /** Todo el Logcat del proceso de la app, que es también el de la instrumentación. */
    fun logcatDeLaApp(): String = shell("logcat -d --pid=${Process.myPid()}")

    /**
     * El mismo Logcat del proceso, con el formato `-v tag`: cada línea empieza por
     * `<prioridad>/<etiqueta>: `, así la etiqueta se puede leer.
     */
    fun logcatDeLaAppConEtiqueta(): String = shell("logcat -d -v tag --pid=${Process.myPid()}")

    /** El prefijo de las etiquetas del SDK de Firebase en Logcat (por ejemplo, `FirebaseAuth`). */
    const val PREFIJO_DEL_SDK_DE_FIREBASE = "Firebase"

    /** El encabezado de una línea con el formato `-v tag`: la prioridad, la barra y la etiqueta. */
    private val encabezadoConEtiqueta = Regex("""^[A-Z]/([^:]*):""")

    /** La etiqueta de una línea con el formato `-v tag`, o null si la línea no tiene encabezado. */
    fun etiquetaDe(linea: String): String? =
        encabezadoConEtiqueta.find(linea)?.groupValues?.getOrNull(1)?.trim()

    /**
     * [logcat] sin las líneas cuya etiqueta empieza por [PREFIJO_DEL_SDK_DE_FIREBASE]. Una línea
     * sin encabezado se queda: ante la duda, cuenta.
     */
    fun sinEtiquetasDelSdkDeFirebase(logcat: String): String = logcat.lines()
        .filterNot { etiquetaDe(it)?.startsWith(PREFIJO_DEL_SDK_DE_FIREBASE) == true }
        .joinToString("\n")

    private fun argumento(nombre: String, variable: String): String {
        val valor = InstrumentationRegistry.getArguments().getString(nombre)
        if (valor.isNullOrEmpty()) {
            throw AssertionError(
                "Falta el argumento de instrumentación $nombre: definí la variable de entorno " +
                    "$variable antes de correr las pruebas en el dispositivo."
            )
        }
        return valor
    }

    fun emailMozo(): String = argumento("emailMozo", "EMAIL_MOZO1_R1")

    fun contrasenaMozo(): String = argumento("contrasenaMozo", "CONTRASENA_MOZO1_R1")
}

/** Espera hasta [Dispositivo.ESPERA_MS] a que se cumpla [condicion]; si no, falla con [descripcion]. */
fun ComposeTestRule.esperarHasta(descripcion: String, condicion: () -> Boolean) {
    waitUntil(descripcion, Dispositivo.ESPERA_MS, condicion)
}

fun ComposeTestRule.hayNodoConTag(tag: String): Boolean =
    onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty()

fun ComposeTestRule.hayNodoQueDice(texto: String): Boolean =
    onAllNodesWithText(texto, substring = true).fetchSemanticsNodes().isNotEmpty()

/** El mozo escribe su cuenta en la pantalla de inicio de sesión y toca "Entrar". */
fun ComposeTestRule.iniciarSesionPorLaPantalla(email: String, contrasena: String) {
    esperarHasta("aparece la pantalla de inicio de sesión") { hayNodoConTag("campo-email") }
    onNodeWithTag("campo-email").performTextInput(email)
    onNodeWithTag("campo-contrasena").performTextInput(contrasena)
    onNodeWithText("Entrar").performClick()
}
