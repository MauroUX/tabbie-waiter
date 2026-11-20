// Datos de prueba comunes del change tk-04-app-base (TK-04): la hora de referencia, el JWT armado en tiempo de
// ejecución, las respuestas de T01 y T05 con la forma de docs/api/openapi.yaml y un registro de diagnóstico que
// junta sus líneas en una lista. Todo es sintético: correos en example.com, nombres inventados y credenciales de
// cobro que se reconocen como de mentira (PR-2, PR-3).
package com.tabbie.waiter

import com.tabbie.waiter.comun.diagnostico.RegistroEnLogcat
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.Base64
import java.util.concurrent.CopyOnWriteArrayList

object DatosDePrueba {
    val HORA_DE_REFERENCIA: Instant = Instant.parse("2026-11-19T22:00:00Z")
    val RELOJ: Clock = Clock.fixed(HORA_DE_REFERENCIA, ZoneOffset.UTC)

    /** Vencimiento del JWT de prueba: ocho horas después de la hora de referencia. */
    val VENCE: Instant = Instant.parse("2026-11-20T06:00:00Z")

    const val RESTAURANTE_1 = "11111111-1111-4111-8111-111111111111"
    const val EMAIL_MOZO = "waiterapp.mozo1.r1@example.com"
    const val NOMBRE_MOZO = "Mozo Uno Inventado"
    const val CONTRASENA_SINTETICA = "solo-para-pruebas-no-es-real"
    const val ID_TOKEN_SINTETICO = "id-token-sintetico-no-es-de-firebase"
    const val MP_TOKEN_FALSO = "FALSO-NO-ES-MERCADOPAGO-TOKEN-DE-PRUEBA"
    const val MP_REFRESH_FALSO = "FALSO-NO-ES-MERCADOPAGO-REFRESH-DE-PRUEBA"

    fun base64Url(texto: String): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(texto.toByteArray(Charsets.UTF_8))

    /** El payload de [jwt], sin codificar, para poder buscarlo en los registros. */
    fun payloadDelJwt(exp: Instant?, rol: String = "waiter"): String {
        val claims = buildList {
            add("\"userId\":7")
            add("\"role\":\"$rol\"")
            add("\"iat\":${HORA_DE_REFERENCIA.epochSecond}")
            if (exp != null) add("\"exp\":${exp.epochSecond}")
        }
        return claims.joinToString(separator = ",", prefix = "{", postfix = "}")
    }

    /** Un JWT con la forma del de T01 (HS256, con userId, role, iat y exp), sin una firma válida. */
    fun jwt(exp: Instant?, rol: String = "waiter"): String {
        val encabezado = base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}")
        val payload = base64Url(payloadDelJwt(exp, rol))
        val firma = base64Url("firma-sintetica-sin-valor")
        return "$encabezado.$payload.$firma"
    }

    /** Respuesta 201 de T01 (RespuestaDeLogin), con el email y el nombre del mozo que la app no tiene que anotar. */
    fun respuestaDeCanje(
        jwt: String,
        restaurantId: String = RESTAURANTE_1,
        rol: String = "waiter"
    ): String =
        """
        {
          "access_token": "$jwt",
          "user": {
            "id": 7,
            "email": "$EMAIL_MOZO",
            "name": "$NOMBRE_MOZO",
            "role": "$rol",
            "restaurantId": "$restaurantId"
          }
        }
        """.trimIndent()

    fun emailDeComensal(numeroDeMesa: Int) = "comensal.mesa$numeroDeMesa@example.com"

    fun nombreDeComensal(numeroDeMesa: Int) = "Comensal Inventado Mesa $numeroDeMesa"

    /**
     * Una mesa de T05 (esquema Table) con todo lo que trae la réplica por O4: el restaurante con sus credenciales de
     * cobro, y la sesión con sus usuarios y sus pedidos. Con [sesionId] nulo, la mesa llega sin sesión activa.
     */
    fun mesaDeT05(
        id: Int,
        numero: Int,
        sesionId: Int?,
        restaurantId: String = RESTAURANTE_1
    ): String {
        val restaurante =
            """
            {
              "id": "$restaurantId",
              "name": "Restaurante Inventado Uno",
              "address": null,
              "phone": null,
              "mercadoPagoToken": "$MP_TOKEN_FALSO",
              "mercadoPagoRefreshToken": "$MP_REFRESH_FALSO",
              "mercadoPagoUserId": "1000000001",
              "isActive": true,
              "specialtySubtitle": null,
              "imageUrl": null,
              "logoUrl": null,
              "paymentStyle": "after-order",
              "yellowTicketSeconds": 300,
              "redTicketSeconds": 600,
              "redPulseTicketSeconds": 900
            }
            """.trimIndent()
        val usuario =
            """
            {
              "id": ${100 + numero},
              "email": "${emailDeComensal(numero)}",
              "role": "user",
              "isGuest": false,
              "name": "${nombreDeComensal(numero)}",
              "restaurant": null
            }
            """.trimIndent()
        val sesion =
            if (sesionId == null) {
                "null"
            } else {
                """
                {
                  "id": $sesionId,
                  "tableId": $id,
                  "amountPaid": "0.00",
                  "tips": "0.00",
                  "total": "4500.00",
                  "requestingHelp": false,
                  "createdAt": "2026-11-19T21:30:00.000Z",
                  "closedAt": null,
                  "users": [$usuario],
                  "orders": [
                    {
                      "id": ${500 + numero},
                      "user": $usuario,
                      "items": [],
                      "type": "main_course",
                      "status": "confirmed",
                      "createdAt": "2026-11-19T21:35:00.000Z",
                      "confirmedAt": "2026-11-19T21:36:00.000Z",
                      "sentToKitchenAt": null,
                      "canceledAt": null,
                      "cancellationReason": null,
                      "isPaid": false,
                      "paidAt": null
                    }
                  ]
                }
                """.trimIndent()
            }
        return """
            {
              "id": $id,
              "number": $numero,
              "seats": 4,
              "qrCode": "qr-sintetico-mesa-$numero",
              "restaurant": $restaurante,
              "activeSessionId": ${sesionId ?: "null"},
              "activeSession": $sesion,
              "isBusy": ${sesionId != null}
            }
        """.trimIndent()
    }

    fun respuestaDeT05(vararg mesas: String): String =
        mesas.joinToString(separator = ",", prefix = "[", postfix = "]")
}

/** Un registro de diagnóstico real, con el reloj fijo de la hora de referencia, que junta sus líneas en una lista. */
class RegistroEnLista {
    val lineas: MutableList<String> = CopyOnWriteArrayList()
    val registro = RegistroEnLogcat(DatosDePrueba.RELOJ) { lineas.add(it) }
}
