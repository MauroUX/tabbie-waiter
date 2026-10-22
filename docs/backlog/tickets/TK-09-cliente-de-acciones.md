# TK-09 · App: cliente de las acciones que cambian datos, sin reintentos

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Cliente HTTP" en el alcance y el riesgo técnico "Los reintentos automáticos del cliente HTTP". Cierra el walking skeleton. |

## Objetivo

Dejar el cliente HTTP de las acciones que cambian datos sin ningún reintento, con el corte de los 10 s y el 401 sin repetición, probado contra la réplica sin pantalla.

## Criterios heredados

- [WS-c11](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Una acción que cambia datos y no responde no se repite.
- [SEG-c9](../../architecture/seguridad.md#43-criterios-nuevos) · Un 401 en una acción no se repite.
- [SEG-c6](../../architecture/seguridad.md#43-criterios-nuevos) · Los registros no tienen datos sensibles.

## Alcance

**Incluye:**

- **Cliente HTTP de las acciones** (0007): OkHttp con `retryOnConnectionFailure` desactivado y sin reintentos de la app. Da la acción por "sin respuesta" a los 10 s y por fallida si se cierra la conexión.
- **401 en una acción** (0004): pide la renovación a Sesión, no repite la acción y la devuelve como fallida.
- **Antes de dar una acción por terminada**, sea cual sea el resultado, pide a Salón y a Cobros que actualicen mesas y solicitudes.
- **Registro de diagnóstico:** cada petición de una acción enviada y cómo terminó, sin su cuerpo.
- **Una prueba sin pantalla** que pide al cliente un cobro manual (T11), como pide WS-c11; no hay acción con pantalla en este ticket.
- **La revisión de los registros** de SEG-c6 al cerrar el skeleton: el de diagnóstico y el del sistema de Android, después de un turno con renovaciones y cortes.

**No incluye:**

- Las acciones con pantalla y sus reglas de revisión previa y bloqueo: la primera es mandar a cocina, [TK-16](TK-16-mandar-a-cocina.md); después, [TK-17](TK-17-cancelar-pedidos.md) y las de HU-05, HU-07 y HU-08, fuera de esta descomposición.
- El 401 en una consulta: [TK-08](TK-08-renovacion-del-jwt.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `comun/red/`, con sus pruebas. La regla de no reintentar vive solo ahí.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Cliente HTTP; Sesión, para la renovación ante un 401; Salón y Cobros, para la actualización.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T11 (solo desde la prueba), T05 y T06 para la actualización, y T01 para la renovación.

## Requisitos de prueba del backlog

- **Un vencimiento corto, configurable, de la sesión:** SEG-c9 necesita un JWT vencido, con el perfil de pruebas de [TK-01](TK-01-replica.md).

## Dependencias

- [TK-08](TK-08-renovacion-del-jwt.md): la renovación que pide el 401.
- [TK-07](TK-07-cortes-y-recuperacion.md): los cortes que SEG-c6 pide en el turno, y Toxiproxy para retener la respuesta o cerrar la conexión en WS-c11.
- [TK-03](TK-03-simulador-mesas-y-pedidos.md): la mesa con saldo pendiente.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de WS-c11, SEG-c9 y SEG-c6.
2. Escribir las pruebas primero, y verlas fallar: WS-c11 con las dos formas (retener la respuesta y cerrar la conexión), consultando lo pagado directo a la réplica; SEG-c9 con un JWT vencido; SEG-c6 sobre los registros de un turno.
3. Escribir el cliente de las acciones sin reintentos y con el corte de los 10 s.
4. Escribir el 401 en una acción y la actualización antes de terminar.
5. Correr WS-c11 diez veces con cada forma, y SEG-c9.
6. Correr un turno con renovaciones y cortes, buscar en los registros todo lo que lista SEG-c6, y guardar el resultado.
7. Comprobar el "Hecho cuando" del skeleton ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 8): los once criterios y los riesgos técnicos despejados.
8. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app). Este ticket no tiene pantallas: los estados de pantalla y RNF-10 no aplican.
- **Propio del ticket:**
  - El efecto de WS-c11 se comprueba en la réplica, no en la app: lo pagado subió una sola vez.
  - Ninguna otra parte de la app arma su propio cliente para las acciones.
  - Los once criterios del skeleton pasan juntos contra la réplica, con los registros de cada corrida como evidencia.

## Riesgos y decisiones pendientes

- **Riesgo técnico del skeleton:** "Los reintentos automáticos del cliente HTTP: Por defecto, el cliente HTTP reenvía por su cuenta algunas peticiones cuando se corta la conexión, aunque cambien datos (0007). Un cobro se registraría dos veces sin que la app lo sepa".
- **0007, Consecuencias:** "Si una acción no responde, la app no sabe si se registró. El mozo decide si repetirla después de ver el estado actualizado".
- **Pendiente:** "Reintentos de OkHttp en las consultas: … No dice si las consultas usan el mismo cliente o uno con los reintentos de OkHttp" ([componentes.md](../../architecture/componentes.md)).
- **Pendiente:** SEG-c6 pide un turno simulado (ESC-9), que no está en el simulador del skeleton ([índice](README.md#decisiones-pendientes)).
