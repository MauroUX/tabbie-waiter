package com.tabbie.waiter.sesion

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.tabbie.waiter.R
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface EstadoInicioDeSesion {
    data object Formulario : EstadoInicioDeSesion

    data object Enviando : EstadoInicioDeSesion

    data object Iniciada : EstadoInicioDeSesion

    data object Rechazado : EstadoInicioDeSesion

    data object SinConexion : EstadoInicioDeSesion

    data object Error : EstadoInicioDeSesion
}

@HiltViewModel
class InicioDeSesionViewModel @Inject constructor(private val repositorio: RepositorioDeSesion) :
    ViewModel() {
    private val _estado = MutableStateFlow<EstadoInicioDeSesion>(EstadoInicioDeSesion.Formulario)
    val estado: StateFlow<EstadoInicioDeSesion> get() = _estado.asStateFlow()

    /** Un toque mientras envía no hace nada (RNF-6); tras un fallo, el mozo decide si vuelve a intentar. */
    fun entrar(email: String, contrasena: String) {
        if (_estado.value == EstadoInicioDeSesion.Enviando) return
        _estado.value = EstadoInicioDeSesion.Enviando
        viewModelScope.launch {
            _estado.value = when (repositorio.iniciarSesion(email, contrasena)) {
                ResultadoInicioDeSesion.Iniciada -> EstadoInicioDeSesion.Iniciada
                ResultadoInicioDeSesion.Rechazada -> EstadoInicioDeSesion.Rechazado
                ResultadoInicioDeSesion.SinConexion -> EstadoInicioDeSesion.SinConexion
                ResultadoInicioDeSesion.Fallida -> EstadoInicioDeSesion.Error
            }
        }
    }
}

/** Conecta la pantalla con su ViewModel. */
@Composable
fun InicioDeSesionConectado(viewModel: InicioDeSesionViewModel = hiltViewModel()) {
    val estado = viewModel.estado.collectAsStateWithLifecycle()
    PantallaInicioDeSesion(estado = estado.value, alEntrar = viewModel::entrar)
}

@Composable
fun PantallaInicioDeSesion(estado: EstadoInicioDeSesion, alEntrar: (String, String) -> Unit) {
    var email by rememberSaveable { mutableStateOf("") }
    var contrasena by remember { mutableStateOf("") }
    Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.widthIn(max = 480.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text(stringResource(R.string.campo_email)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.testTag("campo-email")
            )
            OutlinedTextField(
                value = contrasena,
                onValueChange = { contrasena = it },
                label = { Text(stringResource(R.string.campo_contrasena)) },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.testTag("campo-contrasena")
            )
            when (estado) {
                EstadoInicioDeSesion.Enviando -> Text(stringResource(R.string.inicio_enviando))

                EstadoInicioDeSesion.Rechazado -> Text(stringResource(R.string.inicio_rechazado))

                EstadoInicioDeSesion.SinConexion -> Text(
                    stringResource(R.string.inicio_sin_conexion)
                )

                EstadoInicioDeSesion.Error -> Text(stringResource(R.string.inicio_error))

                EstadoInicioDeSesion.Formulario, EstadoInicioDeSesion.Iniciada -> Unit
            }
            Button(
                onClick = { alEntrar(email, contrasena) },
                enabled = estado != EstadoInicioDeSesion.Enviando,
                modifier = Modifier.testTag("boton-entrar")
            ) {
                Text(stringResource(R.string.boton_entrar))
            }
        }
    }
}
