package com.tabbie.waiter.salon

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.tabbie.waiter.R
import com.tabbie.waiter.comun.diagnostico.RegistroDiagnostico
import com.tabbie.waiter.comun.red.ApiTabbie
import com.tabbie.waiter.comun.red.ClienteHttp
import com.tabbie.waiter.sesion.SesionEnMemoria
import dagger.hilt.android.lifecycle.HiltViewModel
import java.io.IOException
import java.net.UnknownServiceException
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.SerializationException
import retrofit2.HttpException

data class MesaActiva(val numero: Int, val sesionDeMesaId: Int)

sealed interface ResultadoMesas {
    data class Mesas(val mesas: List<MesaActiva>) : ResultadoMesas

    data object SinConexion : ResultadoMesas

    data object Fallida : ResultadoMesas

    data object SinSesion : ResultadoMesas
}

/** Salón, lo mínimo: una consulta de T05 con el restaurantId de la sesión (PA-2). */
class RepositorioDeSalon(
    private val api: ApiTabbie,
    private val sesionEnMemoria: SesionEnMemoria,
    private val registro: RegistroDiagnostico,
    private val contextoDelTope: CoroutineContext = Dispatchers.IO
) {
    @Inject
    constructor(
        api: ApiTabbie,
        sesionEnMemoria: SesionEnMemoria,
        registro: RegistroDiagnostico
    ) : this(api, sesionEnMemoria, registro, Dispatchers.IO)

    suspend fun consultarMesas(): ResultadoMesas {
        val restaurantId = sesionEnMemoria.sesion.value?.restaurantId
            ?: return fallo(ResultadoMesas.SinSesion, "sin-sesion")
        val respuesta = try {
            withContext(contextoDelTope) {
                withTimeout(ClienteHttp.ESPERA_CONSULTA) { api.mesasActivas(restaurantId) }
            }
        } catch (e: TimeoutCancellationException) {
            return fallo(ResultadoMesas.SinConexion, "sin-respuesta")
        } catch (e: UnknownServiceException) {
            return fallo(ResultadoMesas.SinConexion, "http-sin-cifrar-bloqueado")
        } catch (e: IOException) {
            return fallo(ResultadoMesas.SinConexion, "sin-conexion")
        } catch (e: HttpException) {
            return fallo(ResultadoMesas.Fallida, "respuesta-http", "codigo" to e.code())
        } catch (e: SerializationException) {
            return fallo(ResultadoMesas.Fallida, "respuesta-invalida")
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            return fallo(ResultadoMesas.Fallida, "error-inesperado")
        }
        val mesas = respuesta.mapNotNull { mesa ->
            mesa.activeSession?.let { MesaActiva(numero = mesa.number, sesionDeMesaId = it.id) }
        }
        registro.anotar(
            "mesas actualizadas",
            ORIGEN,
            "cantidad" to mesas.size,
            "sesiones" to mesas.joinToString(separator = ",", prefix = "[", postfix = "]") {
                it.sesionDeMesaId.toString()
            }
        )
        return ResultadoMesas.Mesas(mesas)
    }

    private fun fallo(
        resultado: ResultadoMesas,
        motivo: String,
        vararg extra: Pair<String, Any>
    ): ResultadoMesas {
        registro.anotar("consulta de mesas fallida", ORIGEN, "motivo" to motivo, *extra)
        return resultado
    }

    private companion object {
        const val ORIGEN = "consulta"
    }
}

sealed interface EstadoSalon {
    data object Cargando : EstadoSalon

    data class ConMesas(val mesas: List<MesaActiva>) : EstadoSalon

    data object SinMesas : EstadoSalon

    data object Error : EstadoSalon

    data object SinConexion : EstadoSalon
}

@HiltViewModel
class SalonViewModel @Inject constructor(private val repositorio: RepositorioDeSalon) :
    ViewModel() {
    private val _estado = MutableStateFlow<EstadoSalon>(EstadoSalon.Cargando)
    val estado: StateFlow<EstadoSalon> get() = _estado.asStateFlow()

    init {
        consultar()
    }

    /** El mozo repite la consulta; mientras carga no hace nada, y la app nunca la repite sola (RNF-6). */
    fun volverACargar() {
        if (_estado.value == EstadoSalon.Cargando) return
        _estado.value = EstadoSalon.Cargando
        consultar()
    }

    private fun consultar() {
        viewModelScope.launch {
            _estado.value = when (val resultado = repositorio.consultarMesas()) {
                is ResultadoMesas.Mesas ->
                    if (resultado.mesas.isEmpty()) {
                        EstadoSalon.SinMesas
                    } else {
                        EstadoSalon.ConMesas(resultado.mesas)
                    }

                ResultadoMesas.SinConexion -> EstadoSalon.SinConexion

                ResultadoMesas.Fallida, ResultadoMesas.SinSesion -> EstadoSalon.Error
            }
        }
    }
}

/** Conecta la pantalla con su ViewModel. */
@Composable
fun SalonConectado(viewModel: SalonViewModel = hiltViewModel()) {
    val estado = viewModel.estado.collectAsStateWithLifecycle()
    PantallaSalon(estado = estado.value, alVolverACargar = viewModel::volverACargar)
}

@Composable
fun PantallaSalon(estado: EstadoSalon, alVolverACargar: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        when (estado) {
            EstadoSalon.Cargando -> Text(stringResource(R.string.salon_cargando))

            is EstadoSalon.ConMesas -> ListaDeMesas(estado.mesas)

            EstadoSalon.SinMesas -> Text(stringResource(R.string.salon_vacio))

            EstadoSalon.Error -> Mensaje(stringResource(R.string.salon_error), alVolverACargar)

            EstadoSalon.SinConexion ->
                Mensaje(stringResource(R.string.salon_sin_conexion), alVolverACargar)
        }
    }
}

@Composable
private fun ListaDeMesas(mesas: List<MesaActiva>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().testTag("lista-mesas"),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(mesas, key = { it.numero }) { mesa ->
            Text(
                text = stringResource(R.string.salon_mesa, mesa.numero),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.testTag("mesa-${mesa.numero}")
            )
        }
    }
}

@Composable
private fun Mensaje(texto: String, alVolverACargar: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(texto)
        Button(onClick = alVolverACargar, modifier = Modifier.testTag("boton-volver-a-cargar")) {
            Text(stringResource(R.string.boton_volver_a_cargar))
        }
    }
}
