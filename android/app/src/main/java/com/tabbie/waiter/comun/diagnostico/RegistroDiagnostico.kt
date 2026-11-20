package com.tabbie.waiter.comun.diagnostico

import java.time.Clock

/** El registro de diagnóstico (walking skeleton, sección 4; design D5). */
interface RegistroDiagnostico {
    fun anotar(que: String, origen: String, vararg datos: Pair<String, Any>)
}

/** Escribe cada línea en Logcat, con la etiqueta [ETIQUETA]. */
class RegistroEnLogcat(
    private val reloj: Clock,
    private val escribir: (String) -> Unit = { android.util.Log.i(ETIQUETA, it) }
) : RegistroDiagnostico {
    override fun anotar(que: String, origen: String, vararg datos: Pair<String, Any>) {
        val linea = buildString {
            append(reloj.instant())
            append(' ').append(que)
            append(" origen=").append(origen)
            datos.forEach { (clave, valor) -> append(' ').append(clave).append('=').append(valor) }
        }
        escribir(linea)
    }

    companion object {
        const val ETIQUETA = "TabbieDiag"
    }
}
