// Change tk-04-app-base (TK-04) · Cliente HTTP base, con MockWebServer como réplica.
// Cubre: el canje de T01 sin Authorization y T05 con Bearer (WS-c1, en parte); los cortes sin
// repetir la petición (DP-27, RNF-6); el cliente sin reintentos ni caché (0005, DP-27); la lectura
// de T05 con los campos sensibles que trae por O4; y el borde de los tiempos de espera (DP-26):
// T05 es consulta (4 s) y el canje es acción (10 s), un test por lado.
package com.tabbie.waiter.comun.red

import com.tabbie.waiter.DatosDePrueba
import java.io.IOException
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.TimeUnit
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import mockwebserver3.RecordedRequest
import mockwebserver3.SocketEffect
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit

class ClienteHttpTest {
    private val servidor = MockWebServer()
    private val jwt = DatosDePrueba.jwt(exp = DatosDePrueba.VENCE)
    private val restaurante = DatosDePrueba.RESTAURANTE_1
    private val rutaT05 = "/restaurants/$restaurante/tables/active"
    private val canje = CuerpoDeCanje(firebaseIdToken = DatosDePrueba.ID_TOKEN_SINTETICO)

    @Before
    fun arrancar() {
        servidor.start()
    }

    @After
    fun detener() {
        servidor.close()
    }

    private fun retrofit(proveedor: ProveedorDeJwt = ProveedorDeJwt { jwt }): Retrofit =
        ClienteHttp.crearRetrofit(servidor.url("/").toString(), proveedor)

    private fun api(retrofit: Retrofit = retrofit()): ApiTabbie =
        retrofit.create(ApiTabbie::class.java)

    private fun okHttpDe(retrofit: Retrofit): OkHttpClient {
        val cliente = retrofit.callFactory() as? OkHttpClient
        return checkNotNull(cliente) { "El callFactory tiene que ser el OkHttpClient del cliente" }
    }

    private fun tomarPeticion(): RecordedRequest {
        val peticion = servidor.takeRequest(1, TimeUnit.SECONDS)
        return checkNotNull(peticion) { "La réplica no recibió ninguna petición" }
    }

    private fun respuesta(codigo: Int, cuerpo: String): MockResponse = MockResponse.Builder()
        .code(codigo)
        .addHeader("Content-Type", "application/json")
        .body(cuerpo)
        .build()

    /** La réplica recibe la petición entera y cierra la conexión sin responder. */
    private fun corteDespuesDeRecibir(): MockResponse = MockResponse.Builder()
        .onResponseStart(SocketEffect.CloseSocket())
        .build()

    /** Lee los tiempos de espera que ve cada petición, sin esperar ninguno. */
    private fun apiQueAnotaTiempos(tiempos: MutableList<List<Int>>): ApiTabbie {
        val base = retrofit()
        val anotador = object : Interceptor {
            override fun intercept(chain: Interceptor.Chain): Response {
                tiempos.add(
                    listOf(
                        chain.connectTimeoutMillis(),
                        chain.readTimeoutMillis(),
                        chain.writeTimeoutMillis()
                    )
                )
                return chain.proceed(chain.request())
            }
        }
        val cliente = okHttpDe(base).newBuilder().addNetworkInterceptor(anotador).build()
        return base.newBuilder().client(cliente).build().create(ApiTabbie::class.java)
    }

    @Test
    fun `WS-c1 · el canje es POST a auth login con el ID token y sin Authorization`() = runTest {
        servidor.enqueue(respuesta(201, DatosDePrueba.respuestaDeCanje(jwt)))

        val respuesta = api().canjear(canje)

        val peticion = tomarPeticion()
        assertEquals("POST", peticion.method)
        assertEquals("/auth/login", peticion.url.encodedPath)
        assertNull("El canje no lleva Authorization", peticion.headers["Authorization"])
        assertEquals(
            buildJsonObject { put("firebaseIdToken", DatosDePrueba.ID_TOKEN_SINTETICO) },
            Json.parseToJsonElement(peticion.body?.utf8().orEmpty())
        )
        assertEquals(jwt, respuesta.accessToken)
        assertEquals("waiter", respuesta.user.role)
        assertEquals(restaurante, respuesta.user.restaurantId)
    }

    @Test
    fun `WS-c1 · T05 es GET a las mesas activas del restaurante con Bearer y el JWT`() = runTest {
        servidor.enqueue(respuesta(200, "[]"))

        api().mesasActivas(restaurante)

        val peticion = tomarPeticion()
        assertEquals("GET", peticion.method)
        assertEquals(rutaT05, peticion.url.encodedPath)
        assertEquals("Bearer $jwt", peticion.headers["Authorization"])
    }

    @Test
    fun `Cliente HTTP · sin JWT en la sesión T05 va sin Authorization`() = runTest {
        servidor.enqueue(respuesta(200, "[]"))

        api(retrofit { null }).mesasActivas(restaurante)

        val peticion = tomarPeticion()
        assertEquals(rutaT05, peticion.url.encodedPath)
        assertNull(peticion.headers["Authorization"])
    }

    @Test
    fun `Cliente HTTP · T05 con los campos sensibles de O4 se lee sin error`() = runTest {
        val cuerpo = DatosDePrueba.respuestaDeT05(
            DatosDePrueba.mesaDeT05(id = 21, numero = 1, sesionId = 11),
            DatosDePrueba.mesaDeT05(id = 22, numero = 2, sesionId = 12),
            DatosDePrueba.mesaDeT05(id = 23, numero = 3, sesionId = null)
        )
        servidor.enqueue(respuesta(200, cuerpo))

        val mesas = api().mesasActivas(restaurante)

        assertEquals(listOf(21, 22, 23), mesas.map { it.id })
        assertEquals(listOf(1, 2, 3), mesas.map { it.number })
        assertEquals(listOf(11, 12, null), mesas.map { it.activeSession?.id })
    }

    @Test
    fun `Cliente HTTP · un corte tras recibir T05 falla con IOException y no repite`() = runTest {
        servidor.enqueue(corteDespuesDeRecibir())
        // Si el cliente repitiera la petición, esta respuesta la haría pasar.
        servidor.enqueue(respuesta(200, "[]"))

        val error = runCatching { api().mesasActivas(restaurante) }.exceptionOrNull()

        assertTrue("Se esperaba una IOException y llegó: $error", error is IOException)
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `Cliente HTTP · un corte tras recibir el canje falla con IOException y no repite`() =
        runTest {
            servidor.enqueue(corteDespuesDeRecibir())
            // Si el cliente repitiera la petición, esta respuesta la haría pasar.
            servidor.enqueue(respuesta(201, DatosDePrueba.respuestaDeCanje(jwt)))

            val error = runCatching { api().canjear(canje) }.exceptionOrNull()

            assertTrue("Se esperaba una IOException y llegó: $error", error is IOException)
            assertEquals(1, servidor.requestCount)
        }

    @Test
    fun `Cliente HTTP · no reintenta al fallar la conexión y no tiene caché`() {
        val cliente = okHttpDe(retrofit())

        assertFalse(cliente.retryOnConnectionFailure)
        assertNull(cliente.cache)
    }

    @Test
    fun `Tiempo de espera · T05 es consulta y usa 4000 ms en conectar, leer y escribir`() =
        runTest {
            val tiempos: MutableList<List<Int>> = CopyOnWriteArrayList()
            servidor.enqueue(respuesta(200, "[]"))

            apiQueAnotaTiempos(tiempos).mesasActivas(restaurante)

            assertEquals(4.seconds, ClienteHttp.ESPERA_CONSULTA)
            val esperado = ClienteHttp.ESPERA_CONSULTA.inWholeMilliseconds.toInt()
            assertEquals(4_000, esperado)
            assertEquals(listOf(listOf(esperado, esperado, esperado)), tiempos)
        }

    @Test
    fun `Tiempo de espera · el canje es acción y usa 10000 ms en conectar, leer y escribir`() =
        runTest {
            val tiempos: MutableList<List<Int>> = CopyOnWriteArrayList()
            servidor.enqueue(respuesta(201, DatosDePrueba.respuestaDeCanje(jwt)))

            apiQueAnotaTiempos(tiempos).canjear(canje)

            assertEquals(10.seconds, ClienteHttp.ESPERA_ACCION)
            val esperado = ClienteHttp.ESPERA_ACCION.inWholeMilliseconds.toInt()
            assertEquals(10_000, esperado)
            assertEquals(listOf(listOf(esperado, esperado, esperado)), tiempos)
        }
}
