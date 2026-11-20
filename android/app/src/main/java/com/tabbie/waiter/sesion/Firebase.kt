package com.tabbie.waiter.sesion

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.tasks.await

/** Resultado del inicio de sesión en Firebase (T19). */
sealed interface ResultadoFirebase {
    data class IdToken(val valor: String) : ResultadoFirebase {
        override fun toString(): String = "IdToken"
    }

    data object CredencialesRechazadas : ResultadoFirebase

    data object SinConexion : ResultadoFirebase

    data object SinConfiguracion : ResultadoFirebase

    /** Otro fallo del SDK, que no es de credenciales, de red ni de configuración (design D7). */
    data object Fallida : ResultadoFirebase
}

/** Email y contraseña en Firebase Authentication. */
interface AutenticacionFirebase {
    suspend fun iniciarSesion(email: String, contrasena: String): ResultadoFirebase
}

/** La implementación con el SDK de Firebase; se prueba en el emulador (design D7). */
class AutenticacionFirebaseSdk @Inject constructor(
    @param:ApplicationContext private val contexto: Context
) : AutenticacionFirebase {
    override suspend fun iniciarSesion(email: String, contrasena: String): ResultadoFirebase {
        if (FirebaseApp.getApps(contexto).isEmpty()) return ResultadoFirebase.SinConfiguracion
        return try {
            val auth = FirebaseAuth.getInstance()
            val usuario = auth.signInWithEmailAndPassword(email, contrasena).await().user
            val token = usuario?.getIdToken(true)?.await()?.token
            if (token == null) {
                ResultadoFirebase.CredencialesRechazadas
            } else {
                ResultadoFirebase.IdToken(token)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: FirebaseNetworkException) {
            ResultadoFirebase.SinConexion
        } catch (e: FirebaseAuthInvalidCredentialsException) {
            ResultadoFirebase.CredencialesRechazadas
        } catch (e: FirebaseAuthInvalidUserException) {
            ResultadoFirebase.CredencialesRechazadas
        } catch (e: Exception) {
            // Cualquier otro fallo del SDK no es una credencial rechazada ni un corte de red: el mozo ve el
            // error genérico y el registro lo anota con su propio motivo.
            ResultadoFirebase.Fallida
        }
    }
}
