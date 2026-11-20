// Change tk-04-app-base (TK-04) · Scenario SEG-c7: solo HTTPS fuera de la réplica local (PA-7).
// Corre en el emulador. La parte de la demo, en la variante demo compilada con
// -PurlBase=http://10.0.2.2:<puerto>/, con Firebase y la cuenta de prueba (no corre en la CI,
// DP-43). La parte local, en la variante local, con la réplica levantada para el control positivo.
package com.tabbie.waiter

import android.security.NetworkSecurityPolicy
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.tabbie.waiter.comun.red.ApiTabbie
import com.tabbie.waiter.comun.red.ClienteHttp
import java.net.UnknownServiceException
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import retrofit2.HttpException

@RunWith(AndroidJUnit4::class)
class SegC7DispositivoTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private fun apiHacia(urlBase: String): ApiTabbie =
        ClienteHttp.crearRetrofit(urlBase) { null }.create(ApiTabbie::class.java)

    private fun errorDeMesasActivas(api: ApiTabbie): Throwable? = runBlocking {
        runCatching { api.mesasActivas(Dispositivo.RESTAURANTE_1) }.exceptionOrNull()
    }

    @Test
    fun SEG_c7_laVarianteDeDemoConHttpNoLlegaALaReplicaYMuestraSinConexion() {
        assumeTrue(
            "Solo en la variante demo compilada con una URL base http://",
            BuildConfig.FLAVOR == "demo" && BuildConfig.URL_BASE.startsWith("http://")
        )
        val email = Dispositivo.emailMozo()
        val contrasena = Dispositivo.contrasenaMozo()
        Dispositivo.limpiarLogcat()

        compose.iniciarSesionPorLaPantalla(email, contrasena)

        compose.esperarHasta("la pantalla dice que no hay conexión") {
            compose.hayNodoQueDice("No hay conexión")
        }
        val bloqueo = "sesion fallida origen=inicio-de-sesion motivo=http-sin-cifrar-bloqueado"
        compose.esperarHasta("el registro anota el HTTP sin cifrar bloqueado") {
            Dispositivo.lineasDelRegistro().any { it.contains(bloqueo) }
        }
        assertTrue(
            "El registro no anota el inicio de sesión bloqueado",
            Dispositivo.lineasDelRegistro().any { it.contains(bloqueo) }
        )
        compose.onNodeWithTag("lista-mesas").assertDoesNotExist()
    }

    @Test
    fun SEG_c7_laVarianteLocalBloqueaHttpHaciaOtroHost() {
        assumeTrue("Solo en la variante local", BuildConfig.FLAVOR == "local")
        val politica = NetworkSecurityPolicy.getInstance()

        assertFalse(
            "La variante local permite HTTP sin cifrar hacia otro host",
            politica.isCleartextTrafficPermitted("192.0.2.10")
        )
        assertTrue(
            "La variante local no permite HTTP sin cifrar hacia la máquina de desarrollo",
            politica.isCleartextTrafficPermitted("10.0.2.2")
        )

        val haciaOtroHost = errorDeMesasActivas(apiHacia("http://192.0.2.10/"))
        assertTrue(
            "Hacia otro host se esperaba UnknownServiceException y llegó: $haciaOtroHost",
            haciaOtroHost is UnknownServiceException
        )

        // Control positivo: la misma petición hacia la réplica local sale y la réplica la rechaza
        // por no llevar JWT.
        val haciaLaReplica = errorDeMesasActivas(apiHacia(BuildConfig.URL_BASE))
        assertFalse(
            "Hacia la máquina de desarrollo el tráfico sin cifrar se bloqueó",
            haciaLaReplica is UnknownServiceException
        )
        assertTrue(
            "Hacia la réplica se esperaba un 401 y llegó: $haciaLaReplica",
            haciaLaReplica is HttpException && haciaLaReplica.code() == 401
        )
    }
}
