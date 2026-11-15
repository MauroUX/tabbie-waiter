# TK-05 · App: eventos y consulta periódica

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Eventos" y "Consulta periódica" en el alcance, y los riesgos técnicos "El JWT del stream" y "El reloj del emulador" |
| **Wireframe** | Ninguno: este ticket no tiene pantallas. |

## Objetivo

Que la app reciba por eventos los pedidos confirmados y las solicitudes de cobro presencial en 2 s o menos, y que mantenga al día mesas, solicitudes y cobros con la consulta periódica.

## Criterios heredados

- [WS-c1](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app arranca contra la réplica.
- [WS-c2](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Un pedido confirmado llega por evento.
- [WS-c3](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Una solicitud de cobro presencial llega por evento.

## Alcance

**Incluye:**

- **Eventos:** una sola conexión a `/sse/waiters` con el JWT vigente en el encabezado `Authorization: Bearer` (0008), para los tres eventos (0006). Lee `order-confirmed-notification` en dos pasos, `data` y después `data.body`, sin cerrarse ante un evento que no puede leer (C4). Pasa los de pedidos a Salón y los de solicitudes a Cobros. Un evento de solicitud que no puede leer sigue la regla de RF-12: no se muestra nada y Cobros vuelve a consultar las solicitudes (DP-29).
- **Salón:** consulta T05 periódicamente, cada 5 s, y cuando Eventos se lo pide. Esa consulta es la que [TK-06](TK-06-aviso-y-reconexion.md) usa como sondeo (DP-25).
- **Cobros:** consulta T06 periódicamente, cada 15 s; agrega la solicitud de `in-person-payment-request` y quita la de `in-person-payment-request-deleted`; consulta T07 periódicamente, cada 15 s, una vez por mesa activa (DP-25).
- **Cliente HTTP de las consultas:** el mismo cliente que las acciones, sin reintentos automáticos (DP-27), con un tiempo de espera de 4 s (DP-26).
- **Registro de diagnóstico:** anota la apertura y el cierre de la conexión de eventos, con la respuesta de la réplica y el vencimiento del JWT con que se abrió, y de cada cambio dice si vino de un evento o de la consulta periódica.
- **La medición** de WS-c2 y WS-c3 con las repeticiones del skeleton (sección 4), en un emulador en la misma máquina que la réplica y el simulador.
- **La comprobación** de que el stream acepta el JWT en el encabezado `Authorization` y rechaza con 401 uno vencido (0008).

**No incluye:**

- El sondeo, el aviso sin conexión, la reconexión y la actualización al reconectar: [TK-06](TK-06-aviso-y-reconexion.md).
- Lo que ve el mozo con cada evento: la lista de "Órdenes" ([TK-09](TK-09-ordenes.md)) y las solicitudes de "Pagos" ([TK-14](TK-14-pagos-solicitudes.md)). El aviso y el sonido de pedido confirmado son de HU-03, en la ampliación.
- WS-c4, los cambios que no emiten evento con ESC-4, el segundo mozo y MercadoPago: va en la ampliación (DP-04). En el lote 1, la consulta periódica la comprueba HU-02.h1 en [TK-09](TK-09-ordenes.md).
- La reapertura de la conexión con el JWT renovado: va en la ampliación.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `comun/eventos/`, `comun/red/`, `salon/` y `cobros/`, con sus pruebas.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Eventos, Cliente HTTP, Salón y Cobros, en lo que hace al estado; no sus pantallas.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): el stream de T16 y T17, con `in-person-payment-request-deleted`; T05, T06 y T07.

## Requisitos de prueba del backlog

Ninguno de la lista del backlog. Usa ESC-1, ESC-2 y ESC-5 de [TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md).

## Dependencias

- [TK-04](TK-04-app-base.md): el proyecto, la sesión mínima y el registro de diagnóstico.
- [TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md): ESC-1, ESC-2 y ESC-5, con el registro del turno.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de WS-c1, WS-c2 y WS-c3.
2. Escribir las pruebas primero, y verlas fallar: cada criterio contra la réplica, leyendo el registro de diagnóstico de la app y el registro del turno del simulador.
3. Comparar la hora del emulador con la de la máquina antes de medir.
4. Escribir Eventos con su conexión única, el JWT en el encabezado y la lectura en dos pasos.
5. Escribir la consulta periódica en Salón y en Cobros, con los intervalos de DP-25, y la actualización que pide un evento.
6. Completar el registro de diagnóstico con la conexión de eventos y el origen de cada cambio.
7. Comprobar contra la réplica que el stream acepta el JWT en el encabezado `Authorization` (0008). Si lo acepta, cerrar RA-6 en [seguridad.md](../../architecture/seguridad.md); si no, un ADR nuevo reemplaza a 0008.
8. Medir con las repeticiones del skeleton y guardar los registros de cada corrida como evidencia.
9. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app). Este ticket no tiene pantallas nuevas: los estados de pantalla y RNF-10 no aplican.
- **Propio del ticket:**
  - Cada criterio con un tiempo pasa en todas sus repeticiones, sin promediar ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 4).
  - Los registros de cada corrida quedan como evidencia.
  - El resultado de la prueba del encabezado `Authorization` queda escrito en [seguridad.md](../../architecture/seguridad.md) (RA-6) y, si contradice 0008, en un ADR nuevo.

## Riesgos y decisiones

- **Riesgos técnicos del skeleton** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 6.1): "El reloj del emulador: la medición de 2 s supone que el emulador y la máquina usan el mismo reloj"; "El JWT del stream: … se comprueba contra la réplica al abrir la conexión de eventos".
- **Decidido (DP-28):** el stream recibe el JWT en el encabezado ([0008](../../adr/0008-jwt-del-stream-en-el-encabezado.md)), y RA-6 de `seguridad.md` se cierra cuando este ticket lo comprueba.
- **Decidido (DP-25, DP-26, DP-27 y DP-29):** los intervalos, los tiempos de espera, el cliente único sin reintentos y la regla de los eventos de solicitud ilegibles ([componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14)).
