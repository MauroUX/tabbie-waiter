package com.tabbie.waiter.comun.red

import java.util.concurrent.TimeUnit
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import retrofit2.Invocation
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** El único cliente HTTP de la app (DP-27): sin reintentos, 4 s para las consultas y 10 s para las acciones (DP-26). */
object ClienteHttp {
    val ESPERA_CONSULTA: Duration = 4.seconds
    val ESPERA_ACCION: Duration = 10.seconds

    fun crearRetrofit(urlBase: String, proveedorDeJwt: ProveedorDeJwt): Retrofit {
        val cliente = OkHttpClient.Builder()
            .retryOnConnectionFailure(false)
            .cache(null)
            .callTimeout(ESPERA_ACCION.inWholeMilliseconds, TimeUnit.MILLISECONDS)
            .connectTimeout(ESPERA_ACCION.inWholeMilliseconds, TimeUnit.MILLISECONDS)
            .readTimeout(ESPERA_ACCION.inWholeMilliseconds, TimeUnit.MILLISECONDS)
            .writeTimeout(ESPERA_ACCION.inWholeMilliseconds, TimeUnit.MILLISECONDS)
            .addInterceptor(EsperaPorLlamada)
            .addInterceptor(Autorizacion(proveedorDeJwt))
            .build()
        val json = Json { ignoreUnknownKeys = true }
        return Retrofit.Builder()
            .baseUrl(urlBase)
            .client(cliente)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }
}

/** Las llamadas marcadas con [Consulta] esperan 4 s; las demás, los 10 s del cliente. */
private object EsperaPorLlamada : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val metodo = chain.request().tag(Invocation::class.java)?.method()
        if (metodo?.isAnnotationPresent(Consulta::class.java) !=
            true
        ) {
            return chain.proceed(chain.request())
        }
        val milis = ClienteHttp.ESPERA_CONSULTA.inWholeMilliseconds.toInt()
        return chain
            .withConnectTimeout(milis, TimeUnit.MILLISECONDS)
            .withReadTimeout(milis, TimeUnit.MILLISECONDS)
            .withWriteTimeout(milis, TimeUnit.MILLISECONDS)
            .proceed(chain.request())
    }
}

/** Agrega el Bearer con el JWT de la sesión, salvo en el canje (T01) o sin sesión. */
private class Autorizacion(private val proveedor: ProveedorDeJwt) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val peticion = chain.request()
        val esCanje = peticion.method == "POST" && peticion.url.encodedPath.endsWith("/auth/login")
        val jwt = proveedor.jwtActual()
        if (esCanje || jwt == null) return chain.proceed(peticion)
        return chain.proceed(peticion.newBuilder().header("Authorization", "Bearer $jwt").build())
    }
}

/** Da el JWT vigente para el encabezado Authorization, o null si no hay sesión. */
fun interface ProveedorDeJwt {
    fun jwtActual(): String?
}

/** Marca una llamada de Retrofit como consulta: usa los 4 s de espera de DP-26. */
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
annotation class Consulta
