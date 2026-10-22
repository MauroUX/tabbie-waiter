# TK-06 · App: eventos y consulta periódica

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Eventos" y "Consulta periódica" en el alcance, y los riesgos técnicos "El JWT en la URL del stream" y "El reloj del emulador" |

## Objetivo

Mantener al día en el estado de la app las mesas, las solicitudes y los cobros, con una sola conexión a `/sse/waiters` y la consulta periódica, dentro de los tiempos de RNF-1 y RNF-2.

## Criterios heredados

- [WS-c1](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app arranca contra la réplica.
- [WS-c2](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Un pedido confirmado llega por evento.
- [WS-c3](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Una solicitud de cobro presencial llega por evento.
- [WS-c4](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Los cambios que no emiten evento llegan por la consulta periódica.

## Alcance

**Incluye:**

- **Eventos:** una sola conexión a `/sse/waiters` con el JWT vigente, para los tres eventos (0006). Lee `order-confirmed-notification` en dos pasos, `data` y después `data.body`, sin cerrarse ante un evento que no puede leer (C4). Pasa los de pedidos a Salón y los de solicitudes a Cobros.
- **Salón:** consulta T05 periódicamente, cada menos de 30 s, y cuando Eventos se lo pide.
- **Cobros:** consulta T06 periódicamente, cada menos de 30 s; agrega la solicitud de `in-person-payment-request` y quita la de `in-person-payment-request-deleted`; consulta T07 periódicamente, una vez por mesa activa.
- **Registro de diagnóstico:** anota la apertura y el cierre de la conexión de eventos, con la respuesta de la réplica y el vencimiento del JWT con que se abrió, y de cada cambio dice si vino de un evento o de la consulta periódica.
- **La medición** de WS-c2, WS-c3 y WS-c4 con las repeticiones del skeleton (sección 4), en un emulador en la misma máquina que la réplica y el simulador.
- **La comprobación** de si el stream acepta el JWT en el encabezado `Authorization`.

**No incluye:**

- La reconexión, el sondeo, el aviso sin conexión y la actualización al reconectar: [TK-07](TK-07-cortes-y-recuperacion.md).
- La reapertura de la conexión con el JWT renovado: [TK-08](TK-08-renovacion-del-jwt.md).
- Lo que ve el mozo con cada evento (el aviso y el sonido de pedido confirmado, el indicador de solicitudes) y la regla de RF-12 en pantalla: HU-03 y HU-06, fuera de esta descomposición.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `comun/eventos/`, `salon/` y `cobros/`, con sus pruebas.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Eventos, Salón y Cobros, en lo que hace al estado; no sus pantallas.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T05, T06 y T07; los eventos T16, T17 e `in-person-payment-request-deleted` (sin fila).

## Requisitos de prueba del backlog

- **Datos iniciales con dos restaurantes, y dos mozos en el primero:** el segundo mozo registra el cobro de WS-c4, por medio de [TK-04](TK-04-simulador-cobros.md).

## Dependencias

- [TK-05](TK-05-app-base.md): el proyecto, la sesión y el registro.
- [TK-03](TK-03-simulador-mesas-y-pedidos.md) y [TK-04](TK-04-simulador-cobros.md): los escenarios que generan los cambios que se miden.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de WS-c1 a WS-c4.
2. Escribir las pruebas primero, y verlas fallar: cada criterio contra la réplica, leyendo el registro de diagnóstico de la app y el registro del turno del simulador.
3. Comparar la hora del emulador con la de la máquina antes de medir.
4. Escribir Eventos con su conexión única y la lectura en dos pasos.
5. Escribir la consulta periódica en Salón y en Cobros, con los intervalos que se decidan, y la actualización que pide un evento.
6. Completar el registro de diagnóstico con la conexión de eventos y el origen de cada cambio.
7. Comprobar contra la réplica si el stream acepta el JWT en el encabezado `Authorization`, y dejar el resultado en las "Decisiones pendientes" de los ADRs.
8. Medir con las repeticiones del skeleton y guardar los registros de cada corrida como evidencia.
9. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app). Este ticket no tiene pantallas nuevas: los estados de pantalla y RNF-10 no aplican.
- **Propio del ticket:**
  - Cada criterio con un tiempo pasa en todas sus repeticiones, sin promediar ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 4).
  - Los registros de cada corrida quedan como evidencia.
  - El resultado de la prueba del encabezado `Authorization` queda escrito en los ADRs.

## Riesgos y decisiones pendientes

- **Riesgo técnico del skeleton:** "El reloj del emulador: la medición de 2 s supone que el emulador y la máquina usan el mismo reloj".
- **Riesgo técnico del skeleton:** "El JWT en la URL del stream: … Comprobar contra la réplica si el stream acepta el JWT en el encabezado `Authorization`". Si funciona, "un ADR nuevo reemplaza esa parte de 0004 y 0006, y RA-6 de `seguridad.md` se cierra" ([ADRs](../../adr/README.md), "Decisiones pendientes").
- **Pendiente:** "Intervalos de consulta (0006): 0006 fija los límites …, pero no los valores ni qué consulta usa el sondeo" ([ADRs](../../adr/README.md)).
- **Pendiente:** "Cuándo una acción 'no responde': falta el tiempo de espera de las acciones y de las consultas" ([componentes.md](../../architecture/componentes.md)). El skeleton fija 10 s solo para las acciones.
- **Pendiente:** "Eventos de solicitud ilegibles: RF-12 dice qué hacer con un aviso de pedido que no se puede leer. No hay una regla para un `in-person-payment-request` o un `in-person-payment-request-deleted` ilegible" ([componentes.md](../../architecture/componentes.md)).
- **Pendiente:** "Reintentos de OkHttp en las consultas" ([componentes.md](../../architecture/componentes.md)).
