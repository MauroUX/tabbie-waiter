# TK-07 · App: cliente de las acciones, sin reintentos, con MockWebServer

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Cliente HTTP" en el alcance, y el riesgo técnico "Los reintentos automáticos del cliente HTTP" |
| **Wireframe** | Ninguno: este ticket no tiene pantallas. |

## Objetivo

Que ninguna acción que cambia datos se repita sola, ni por la app ni por el cliente HTTP, y que una acción que no responde termine como "sin respuesta" a los 10 s, después de actualizar mesas y solicitudes. Con este ticket se cierra el walking skeleton.

## Criterios heredados

- [WS-c11](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Una acción que cambia datos y no responde no se repite. Se prueba con MockWebServer: "lo pagado … subió $100 una sola vez" se comprueba como "MockWebServer recibió una sola petición de T11" ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 4).

## Alcance

**Incluye:**

- **Cliente HTTP de las acciones** (0007): OkHttp con `retryOnConnectionFailure` desactivado y sin reintentos de la app; es el mismo cliente que usan las consultas (DP-27). Da la acción por "sin respuesta" a los 10 s (DP-26) y por fallida si se cierra la conexión.
- **Antes de dar una acción por terminada**, sea cual sea el resultado, pide a Salón y a Cobros que actualicen mesas y solicitudes.
- **Registro de diagnóstico:** cada petición de una acción enviada y cómo terminó, sin su cuerpo.
- **Una prueba sin pantalla** que pide al cliente un cobro manual (T11), como pide WS-c11, contra MockWebServer, con las dos formas: recibe la petición y no responde, o la recibe y se desconecta. No hay acción con pantalla en este ticket.
- **El "Hecho cuando" del skeleton** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 8): comprobar que pasan los ocho criterios de la sección 5.1 y que los riesgos de la sección 6.1 están despejados.

**No incluye:**

- Las acciones con pantalla y sus reglas de revisión previa y bloqueo: la primera es mandar a cocina, [TK-12](TK-12-mandar-a-cocina.md); después, [TK-15](TK-15-confirmar-o-eliminar-solicitud.md) y [TK-16](TK-16-cerrar-mesa.md).
- El 401 en una acción o en una consulta (SEG-c9) y la revisión de los registros de un turno (SEG-c6): van en la ampliación, con la renovación.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `comun/red/`, con sus pruebas. La regla de no reintentar vive solo ahí.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Cliente HTTP; Salón y Cobros, para la actualización.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T11 (solo desde la prueba), y T05 y T06 para la actualización. En la prueba, MockWebServer responde con la forma de esas filas.

## Requisitos de prueba del backlog

Ninguno de la lista del backlog.

## Dependencias

- [TK-04](TK-04-app-base.md): el Cliente HTTP base.
- [TK-05](TK-05-eventos-y-consulta-periodica.md) y [TK-06](TK-06-aviso-y-reconexion.md): para comprobar el "Hecho cuando" del skeleton.

## Pasos

1. Crear el cambio de OpenSpec, con el scenario de WS-c11.
2. Escribir las pruebas primero, y verlas fallar: WS-c11 con las dos formas, contando en MockWebServer las peticiones que recibió.
3. Escribir el cliente de las acciones sin reintentos y con el corte de los 10 s.
4. Escribir la actualización antes de terminar.
5. Correr WS-c11 diez veces con cada forma.
6. Comprobar el "Hecho cuando" del skeleton.
7. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app). Este ticket no tiene pantallas: los estados de pantalla y RNF-10 no aplican.
- **Propio del ticket:**
  - El efecto de WS-c11 se comprueba en el servidor, no en la app: MockWebServer recibió una sola petición.
  - Ninguna otra parte de la app arma su propio cliente para las acciones.
  - Los ocho criterios del skeleton delgado pasan, con los registros de cada corrida como evidencia.

## Riesgos y decisiones

- **Riesgo técnico del skeleton** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 6.1): "Los reintentos automáticos del cliente HTTP: Por defecto, el cliente HTTP reenvía por su cuenta algunas peticiones cuando se corta la conexión, aunque cambien datos (0007). Un cobro se registraría dos veces sin que la app lo sepa".
- **0007, Consecuencias:** "Si una acción no responde, la app no sabe si se registró. El mozo decide si repetirla después de ver el estado actualizado".
- **Decidido (DP-04):** WS-c11 se prueba con MockWebServer, no con Toxiproxy.
- **Decidido (DP-26 y DP-27):** 10 s de espera para las acciones, y un solo cliente sin reintentos automáticos ([componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14)).
