package com.tabbie.waiter

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import com.tabbie.waiter.salon.SalonConectado
import com.tabbie.waiter.sesion.InicioDeSesionConectado
import com.tabbie.waiter.sesion.SesionEnMemoria
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/** La única actividad: muestra el inicio de sesión o el Salón según la sesión (TK-04, design D8). */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject
    lateinit var sesionEnMemoria: SesionEnMemoria

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface {
                    val sesion = sesionEnMemoria.sesion.collectAsState()
                    if (sesion.value == null) InicioDeSesionConectado() else SalonConectado()
                }
            }
        }
    }
}
