// Change tk-04-app-base (TK-04) · Scenario WS-c1 (en parte): la app arranca contra la réplica.
// Corre en el emulador, en la variante local, contra la réplica con sus datos iniciales y Firebase
// (perfil local.env), recién cargada, con las mesas 1 y 2 del restaurante 1 ocupadas por ESC-1.
// Necesita la cuenta de prueba del primer mozo del restaurante 1 (no corre en la CI, DP-43).
// La contraseña y "token=" se buscan en todo el Logcat del proceso, sin excluir nada. El email se
// busca en el registro de diagnóstico (TabbieDiag) y en el resto del Logcat del proceso sin las
// líneas de las etiquetas del SDK de Firebase (las que empiezan por "Firebase"): firebase-auth
// escribe por su cuenta, con la etiqueta FirebaseAuth, el email con el que se inicia sesión, y la
// app no controla esa línea (decisión del humano, opción a). Cualquier otra etiqueta que escriba
// el email, incluida TabbieDiag, hace fallar el test.
package com.tabbie.waiter

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WsC1DispositivoTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    /** Una línea del registro empieza por la hora en ISO-8601 UTC. */
    private val conHora = Regex("""^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z .+""")

    @Test
    fun WS_c1_elPrimerMozoDelRestaurante1IniciaSesionYVeLasDosMesasDeESC1() {
        assumeTrue("Solo en la variante local", BuildConfig.FLAVOR == "local")
        val email = Dispositivo.emailMozo()
        val contrasena = Dispositivo.contrasenaMozo()
        Dispositivo.limpiarLogcat()

        compose.iniciarSesionPorLaPantalla(email, contrasena)

        // La lista muestra exactamente las mesas 1 y 2.
        compose.esperarHasta("aparece la mesa 1 en la lista") { compose.hayNodoConTag("mesa-1") }
        compose.onNodeWithTag("lista-mesas").assertIsDisplayed()
        compose.onNodeWithTag("mesa-1").assertExists()
        compose.onNodeWithTag("mesa-2").assertExists()
        for (numero in 3..8) {
            compose.onNodeWithTag("mesa-$numero").assertDoesNotExist()
        }

        // El registro anota la sesión iniciada y la primera consulta de mesas, con la hora.
        val consulta = "mesas actualizadas origen=consulta cantidad=2 "
        compose.esperarHasta("el registro anota la primera consulta de mesas") {
            Dispositivo.lineasDelRegistro().any { it.contains(consulta) }
        }
        val lineas = Dispositivo.lineasDelRegistro()
        val iniciada = "sesion iniciada origen=inicio-de-sesion rol=waiter " +
            "restaurante=${Dispositivo.RESTAURANTE_1} "
        val lineaIniciada = lineas.firstOrNull { it.contains(iniciada) }
        val lineaConsulta = lineas.firstOrNull { it.contains(consulta) }
        assertTrue("El registro no anota la sesión iniciada", lineaIniciada != null)
        assertTrue("El registro no anota la consulta de mesas", lineaConsulta != null)
        assertTrue(
            "La línea de la sesión iniciada no empieza por la hora: $lineaIniciada",
            lineaIniciada.orEmpty().matches(conHora)
        )
        assertTrue(
            "La línea de la consulta no empieza por la hora: $lineaConsulta",
            lineaConsulta.orEmpty().matches(conHora)
        )

        // Ni el registro ni el resto del Logcat de la app tienen la contraseña ni un token en la URL.
        val logcat = Dispositivo.logcatDeLaApp() + "\n" + lineas.joinToString("\n")
        assertFalse(
            "El Logcat de la app contiene la contraseña del mozo",
            logcat.contains(contrasena)
        )
        assertFalse("El Logcat de la app contiene token=", logcat.contains("token="))

        // El email, sin las líneas de las etiquetas del SDK de Firebase.
        val logcatSinFirebase = Dispositivo.sinEtiquetasDelSdkDeFirebase(
            Dispositivo.logcatDeLaAppConEtiqueta()
        )
        // Control positivo: lo que queda se leyó de verdad y conserva las líneas de TabbieDiag.
        assertTrue(
            "El Logcat de la app sin las etiquetas de Firebase no tiene la consulta de mesas " +
                "con la etiqueta ${Dispositivo.ETIQUETA_DEL_REGISTRO}",
            logcatSinFirebase.lines().any {
                Dispositivo.etiquetaDe(it) == Dispositivo.ETIQUETA_DEL_REGISTRO &&
                    it.contains(consulta)
            }
        )
        assertFalse(
            "El registro de diagnóstico contiene el email del mozo",
            lineas.any { it.contains(email) }
        )
        assertFalse(
            "El Logcat de la app, sin las etiquetas del SDK de Firebase, contiene el email del mozo",
            logcatSinFirebase.contains(email)
        )
    }

    /**
     * Control positivo de la exclusión: solo se quitan las líneas de las etiquetas que empiezan por
     * "Firebase"; el email escrito con cualquier otra etiqueta, incluida TabbieDiag, sigue contando.
     */
    @Test
    fun WS_c1_elEmailSoloSeIgnoraEnLasEtiquetasDelSdkDeFirebase() {
        val email = "mozo.inventado@example.com"
        val delSdk = listOf(
            "D/FirebaseAuth: Logging in as $email with empty reCAPTCHA token",
            "I/FirebaseAuth( 1234): Logging in as $email",
            "W/FirebaseApp: $email"
        )
        val deLaApp = listOf(
            "I/TabbieDiag: 2026-11-19T12:00:00Z sesion iniciada $email",
            "I/TabbieDiag(12345): $email",
            "D/OkHttp  : $email",
            "E/AndroidRuntime: $email",
            "I/MiFirebase: $email",
            "$email sin encabezado"
        )

        for (linea in delSdk) {
            assertFalse(
                "La exclusión no quita una línea del SDK de Firebase",
                Dispositivo.sinEtiquetasDelSdkDeFirebase(linea).contains(email)
            )
        }
        for (linea in deLaApp) {
            assertTrue(
                "La exclusión quita una línea que no es del SDK de Firebase",
                Dispositivo.sinEtiquetasDelSdkDeFirebase(linea).contains(email)
            )
        }
        val mezclado = Dispositivo.sinEtiquetasDelSdkDeFirebase(
            (delSdk + deLaApp).joinToString("\n")
        )
        assertTrue(
            "La exclusión no deja exactamente las líneas que no son del SDK de Firebase",
            mezclado.lines() == deLaApp
        )
    }
}
