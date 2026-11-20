// Change tk-04-app-base (TK-04) · Repositorio del Salón, con la API real de ClienteHttp contra
// MockWebServer y un registro real con Clock fijo.
// Cubre: T05 con el restaurantId de la sesión (WS-c1, en parte; PA-2), las mesas en el orden de
// T05 sin las que no tienen sesión activa, la línea "mesas actualizadas" del registro, la lista
// vacía, el error HTTP, la respuesta ilegible, el corte sin repetir la petición y la consulta sin
// sesión, que no sale.
package com.tabbie.waiter.salon

import com.tabbie.waiter.DatosDePrueba
import com.tabbie.waiter.RegistroEnLista
import com.tabbie.waiter.comun.red.ApiTabbie
import com.tabbie.waiter.comun.red.ClienteHttp
import com.tabbie.waiter.sesion.SesionActiva
import com.tabbie.waiter.sesion.SesionEnMemoria
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import mockwebserver3.SocketEffect
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class RepositorioDeSalonTest {
    private val servidor = MockWebServer()
    private val sesionEnMemoria = SesionEnMemoria()
    private val registro = RegistroEnLista()
    private val jwt = DatosDePrueba.jwt(exp = DatosDePrueba.VENCE)

    // Un restaurante distinto del de los datos iniciales: la ruta solo puede salir de la sesión.
    private val restaurante = "5a1a0000-0000-4000-8000-0000000000aa"
    private val actualizadas = "2026-11-19T22:00:00Z mesas actualizadas origen=consulta"
    private val fallida = "2026-11-19T22:00:00Z consulta de mesas fallida origen=consulta"

    @Before
    fun arrancar() {
        servidor.start()
    }

    @After
    fun detener() {
        servidor.close()
    }

    private fun repositorio(): RepositorioDeSalon {
        val api = ClienteHttp
            .crearRetrofit(servidor.url("/").toString(), sesionEnMemoria)
            .create(ApiTabbie::class.java)
        return RepositorioDeSalon(api, sesionEnMemoria, registro.registro)
    }

    private fun conSesion() {
        sesionEnMemoria.guardar(
            SesionActiva(
                jwt = jwt,
                vence = DatosDePrueba.VENCE,
                restaurantId = restaurante,
                rol = "waiter"
            )
        )
    }

    private fun respuesta(codigo: Int, cuerpo: String): MockResponse = MockResponse.Builder()
        .code(codigo)
        .addHeader("Content-Type", "application/json")
        .body(cuerpo)
        .build()

    private fun mesa(id: Int, numero: Int, sesionId: Int?) = DatosDePrueba.mesaDeT05(
        id = id,
        numero = numero,
        sesionId = sesionId,
        restaurantId = restaurante
    )

    @Test
    fun `WS-c1 · consulta T05 del restaurante de la sesión y anota las mesas`() = runTest {
        conSesion()
        // La sesión de la mesa 1 es posterior a la de la mesa 2: el orden es el de T05, no el de los ids.
        servidor.enqueue(
            respuesta(200, DatosDePrueba.respuestaDeT05(mesa(21, 1, 12), mesa(22, 2, 11)))
        )

        val resultado = repositorio().consultarMesas()

        assertEquals(
            ResultadoMesas.Mesas(listOf(MesaActiva(1, 12), MesaActiva(2, 11))),
            resultado
        )
        assertEquals(listOf("$actualizadas cantidad=2 sesiones=[12,11]"), registro.lineas)
        val peticion = checkNotNull(servidor.takeRequest(1, TimeUnit.SECONDS))
        assertEquals("GET", peticion.method)
        assertEquals("/restaurants/$restaurante/tables/active", peticion.url.encodedPath)
        assertEquals("Bearer $jwt", peticion.headers["Authorization"])
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `Salón · una mesa sin sesión activa no entra en la lista`() = runTest {
        conSesion()
        val cuerpo = DatosDePrueba.respuestaDeT05(
            mesa(21, 1, 11),
            mesa(23, 3, null),
            mesa(22, 2, 12)
        )
        servidor.enqueue(respuesta(200, cuerpo))

        val resultado = repositorio().consultarMesas()

        assertEquals(
            ResultadoMesas.Mesas(listOf(MesaActiva(1, 11), MesaActiva(2, 12))),
            resultado
        )
        assertEquals(listOf("$actualizadas cantidad=2 sesiones=[11,12]"), registro.lineas)
    }

    @Test
    fun `Salón · vacío · T05 sin mesas da una lista vacía y cantidad 0`() = runTest {
        conSesion()
        servidor.enqueue(respuesta(200, "[]"))

        val resultado = repositorio().consultarMesas()

        assertEquals(ResultadoMesas.Mesas(emptyList()), resultado)
        assertEquals(listOf("$actualizadas cantidad=0 sesiones=[]"), registro.lineas)
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `Salón · error · T05 responde 500 y la consulta es Fallida`() = runTest {
        conSesion()
        servidor.enqueue(respuesta(500, """{"statusCode":500,"message":"Internal error"}"""))

        val resultado = repositorio().consultarMesas()

        assertEquals(ResultadoMesas.Fallida, resultado)
        assertEquals(listOf("$fallida motivo=respuesta-http codigo=500"), registro.lineas)
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `Salón · error · T05 responde algo ilegible y la consulta es Fallida`() = runTest {
        conSesion()
        servidor.enqueue(respuesta(200, "esto no es JSON"))

        val resultado = repositorio().consultarMesas()

        assertEquals(ResultadoMesas.Fallida, resultado)
        assertEquals(listOf("$fallida motivo=respuesta-invalida"), registro.lineas)
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `Salón · sin conexión · un corte tras recibir T05 no repite la petición`() = runTest {
        conSesion()
        servidor.enqueue(MockResponse.Builder().onResponseStart(SocketEffect.CloseSocket()).build())
        // Si la consulta se repitiera, esta respuesta la haría pasar.
        servidor.enqueue(respuesta(200, DatosDePrueba.respuestaDeT05(mesa(21, 1, 11))))

        val resultado = repositorio().consultarMesas()

        assertEquals(ResultadoMesas.SinConexion, resultado)
        assertEquals(listOf("$fallida motivo=sin-conexion"), registro.lineas)
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `Salón · sin sesión no consulta T05`() = runTest {
        val resultado = repositorio().consultarMesas()

        assertEquals(ResultadoMesas.SinSesion, resultado)
        assertEquals(listOf("$fallida motivo=sin-sesion"), registro.lineas)
        assertEquals(0, servidor.requestCount)
    }
}
