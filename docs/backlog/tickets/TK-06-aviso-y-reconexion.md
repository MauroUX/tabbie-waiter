# TK-06 · App: aviso sin conexión y reconexión, con MockWebServer

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Cortes (RNF-4)" en el alcance, y los riesgos técnicos "Un stream caído sin heartbeat" y "La espera creciente de la reconexión no tiene tope" |
| **Wireframe** | Ninguno: el aviso del skeleton es sin diseño. El aviso con diseño es de "Órdenes" ([TK-09](TK-09-ordenes.md)). |

## Objetivo

Que la app avise cuando pasa más de 5 s sin comunicarse, no avise por un corte corto, y se recupere sola al volver la comunicación, probado como lógica de la app con MockWebServer en lugar de la réplica (DP-04).

## Criterios heredados

- [WS-c5](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Aviso de que no hay conexión.
- [WS-c6](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Un corte corto no muestra el aviso.
- [WS-c7](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Recuperación después de un corte.
- [WS-c9](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app se reconecta sola después de un reinicio de la réplica.

Los cuatro se prueban con MockWebServer, como dice [walking-skeleton.md](../../architecture/walking-skeleton.md), sección 4 ("Cortes con MockWebServer").

## Alcance

**Incluye:**

- **Monitor de conexión:** el sondeo cada 5 s con las mesas activas (T05), que es también la consulta periódica de las mesas de [TK-05](TK-05-eventos-y-consulta-periodica.md) (0006, DP-25). Marca "sin conexión" cuando falla una consulta o cuando pasan más de 5 s sin respuesta, con el tiempo de espera de 4 s de las consultas (DP-26), y al recuperarse pide la actualización de mesas, solicitudes y cobros.
- **El aviso de que no hay conexión, sin diseño:** aparece entre los 5 y los 7 s del corte y no aparece con un corte de 3 s.
- **Eventos, la reconexión:** ante un error, cierra la conexión y la reabre con espera creciente (0006). Para no pasar los 5 s de RNF-4, usa una de las dos salidas del skeleton: un tope de la espera, o reabrir apenas el sondeo detecta que volvió la comunicación. Cuando el sondeo detecta un corte, trata la conexión como caída aunque no haya dado error.
- **Recuperación:** al volver la comunicación, en 5 s o menos, actualiza mesas, solicitudes y cobros, reabre la conexión de eventos y quita el aviso, sin que nadie toque la app.
- **Registro de diagnóstico:** la aparición y la desaparición del aviso, y los cambios que llegan "por la actualización al reconectar".
- **Las pruebas con MockWebServer:** las dos formas de corte (sin red y el sistema no responde) y el reinicio de WS-c9, con MockWebServer detenido y vuelto a levantar en el mismo puerto.

**No incluye:**

- El aviso con diseño, en la navegación principal: [TK-09](TK-09-ordenes.md) (HU-02.h6).
- Los cortes de punta a punta con Toxiproxy (WS-c8): van en la ampliación (DP-04).
- La renovación que falla por la red, que también cuenta como corte: va en la ampliación.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `comun/red/` (Monitor de conexión), `comun/eventos/`, `salon/` y `cobros/`, con sus pruebas.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Monitor de conexión, Eventos, Cliente HTTP (le informa al Monitor cuándo una consulta falla), Salón y Cobros.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): el sondeo usa T05; la recuperación, T05, T06 y T07; la reconexión, el stream de T16 y T17. En las pruebas, MockWebServer responde con la forma de esas filas.

## Requisitos de prueba del backlog

Ninguno de la lista del backlog. Los cortes se provocan en MockWebServer, desde la prueba.

## Dependencias

- [TK-05](TK-05-eventos-y-consulta-periodica.md): la conexión de eventos y la consulta periódica.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de WS-c5, WS-c6, WS-c7 y WS-c9.
2. Escribir las pruebas primero, y verlas fallar: cada criterio con las dos formas de corte en MockWebServer, y WS-c9 con MockWebServer detenido 60 s.
3. Escribir el Monitor de conexión y el aviso sin diseño.
4. Escribir la reconexión de Eventos con la salida elegida, y la regla de tratar como caída la conexión cuando el sondeo detecta un corte.
5. Escribir la recuperación: la actualización de mesas, solicitudes y cobros y la reapertura de eventos.
6. Correr las repeticiones del skeleton y guardar los registros de cada corrida como evidencia.
7. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app). El aviso es sin diseño: RNF-10 aplica desde [TK-09](TK-09-ordenes.md).
- **Propio del ticket:**
  - Cada criterio pasa en todas sus repeticiones y con las dos formas de corte.
  - Ninguna acción que cambia datos se dispara al reconectar: la recuperación solo consulta.

## Riesgos y decisiones

- **Riesgos técnicos del skeleton** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 6.1): "Un stream caído sin heartbeat: … la app podría creer que la conexión sigue viva y perder eventos sin enterarse"; "La espera creciente de la reconexión no tiene tope: … Después de un reinicio de 60 s, la próxima espera puede pasar los 5 s de RNF-4".
- **Decidido (DP-04):** la reconexión y el aviso se prueban como lógica de la app con MockWebServer, no con cortes reales. Los cortes de punta a punta con Toxiproxy van en la ampliación.
- **Decidido (DP-25 y DP-26):** el sondeo cada 5 s con T05 y el tiempo de espera de 4 s de las consultas ([componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14)).
