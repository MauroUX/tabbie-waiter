# TK-08 · App: renovación del JWT con la conexión de eventos

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "renueva el JWT volviendo a canjear, solo en lo que afecta a la conexión de eventos" en el alcance, y el riesgo técnico "El JWT en la URL del stream" |

## Objetivo

Renovar el JWT antes de que venza, volviendo a canjear, y mantener la conexión de eventos siempre abierta con el JWT vigente, también después de un corte.

## Criterios heredados

- [WS-c10](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Al renovar el JWT, la conexión de eventos sigue con el nuevo.
- [SEG-c9](../../architecture/seguridad.md#43-criterios-nuevos) · Un 401 en una acción no se repite. **En parte:** que una consulta de mesas con el JWT vencido se repite una sola vez, con el JWT nuevo. El criterio completo es de [TK-09](TK-09-cliente-de-acciones.md).

## Alcance

**Incluye:**

- **Sesión, la renovación** (0004): antes del `exp` del JWT, pide un ID token nuevo a Firebase y vuelve a llamar a T01. Hay una sola renovación en curso a la vez. Le pasa el JWT nuevo a Eventos.
- **Eventos:** reabre la conexión con el JWT nuevo y, después de un corte, siempre con el vigente, así la réplica no responde 401.
- **Cliente HTTP, el 401 en una consulta:** pide la renovación a Sesión y repite la consulta una vez con el JWT nuevo (0004).
- **Registro de diagnóstico:** la reapertura por vencimiento, con el vencimiento del JWT nuevo y sin el JWT.
- **La medición** con un vencimiento de 3 minutos, durante tres renovaciones seguidas.

**No incluye:**

- Lo que ve el mozo al renovar, la renovación rechazada y la que falla por la red: [TK-11](TK-11-renovacion-de-la-sesion.md) (HU-01.c3, HU-01.c4 y HU-01.h4).
- El 401 en una acción que cambia datos, que no se repite: [TK-09](TK-09-cliente-de-acciones.md) (SEG-c9).
- La sesión guardada en DataStore: [TK-10](TK-10-inicio-de-sesion.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `sesion/`, `comun/eventos/` y `comun/red/`. El Cliente HTTP le pide la renovación a Sesión por una interfaz que define `comun/` y que implementa `sesion/` ([estructura.md](../../architecture/estructura.md), "Dependencias permitidas").
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Sesión, Eventos y Cliente HTTP.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T19 (ID token nuevo), T01 (canje), el stream de T16 y T17, y T05 para el 401 en una consulta.

## Requisitos de prueba del backlog

- **Un vencimiento corto, configurable, de la sesión:** el perfil de pruebas de [TK-01](TK-01-replica.md), con `JWT_EXPIRATION_WAITERS` en 3 minutos.

## Dependencias

- [TK-07](TK-07-cortes-y-recuperacion.md): la reconexión, que WS-c10 ejercita cortando la conexión de eventos después de que venció el primer JWT.
- [TK-01](TK-01-replica.md): el perfil de pruebas.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de WS-c10 y de la parte de SEG-c9.
2. Escribir las pruebas primero, y verlas fallar: WS-c10 con la réplica en el perfil de pruebas, y el 401 en una consulta con un JWT vencido.
3. Escribir la renovación en Sesión, con una sola renovación a la vez.
4. Conectar Sesión con Eventos para reabrir con el JWT nuevo, y asegurar que toda reapertura usa el vigente.
5. Escribir en el Cliente HTTP el 401 en una consulta.
6. Medir durante tres renovaciones seguidas y guardar los registros como evidencia.
7. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app). Este ticket no tiene pantallas: los estados de pantalla y RNF-10 no aplican.
- **Propio del ticket:**
  - Ni el registro de diagnóstico ni el del sistema contienen el JWT ni la URL del stream (PA-6).
  - Dos 401 que llegan juntos disparan una sola renovación.

## Riesgos y decisiones pendientes

- **Riesgo técnico del skeleton:** "El JWT en la URL del stream: La réplica rechaza un JWT vencido con 401 antes de abrir el stream (C1). Si la app reabre con el JWT viejo, queda sin eventos o reintenta en vano".
- **RA-6** ([seguridad.md](../../architecture/seguridad.md)): "El JWT viaja en la URL del stream de eventos".
- **Pendiente:** si el stream acepta el JWT en el encabezado `Authorization`; lo comprueba [TK-06](TK-06-eventos-y-consulta-periodica.md) ([ADRs](../../adr/README.md), "Decisiones pendientes").
