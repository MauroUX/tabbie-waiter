# TK-07 · App: aviso sin conexión y recuperación después de un corte

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Eventos" (la reconexión), "Consulta periódica" (el sondeo) y "Cortes" en el alcance, y los riesgos técnicos "Un stream caído sin heartbeat" y "La espera creciente de la reconexión no tiene tope" |

## Objetivo

Detectar los cortes de comunicación con la réplica, avisarlos según RNF-4 y recuperar solo, al volver la comunicación, las mesas, las solicitudes, los cobros y la conexión de eventos.

## Criterios heredados

- [WS-c5](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Aviso de que no hay conexión.
- [WS-c6](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Un corte corto no muestra el aviso.
- [WS-c7](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Recuperación después de un corte.
- [WS-c8](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Lo emitido durante un corte aparece después.
- [WS-c9](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app se reconecta sola después de un reinicio de la réplica.

## Alcance

**Incluye:**

- **Monitor de conexión:** un sondeo liviano cada 5 s o menos, con una consulta que ya existe (0006). Marca "sin conexión" cuando falla una consulta o cuando pasan más de 5 s sin respuesta, y al recuperarse pide la actualización de mesas, solicitudes y cobros.
- **El aviso de que no hay conexión, sin diseño:** aparece entre los 5 y los 7 s del corte y no aparece con un corte de 3 s.
- **Eventos, la reconexión:** ante un error, cierra la conexión y la reabre con espera creciente (0006). Para no pasar los 5 s de RNF-4, usa una de las dos salidas del skeleton: un tope de la espera, o reabrir apenas el sondeo detecta que volvió la comunicación. Cuando el sondeo detecta un corte, trata la conexión como caída aunque no haya dado error.
- **Recuperación:** al volver la comunicación, en 5 s o menos, actualiza mesas, solicitudes y cobros, reabre la conexión de eventos y quita el aviso, sin que nadie toque la app.
- **Registro de diagnóstico:** la aparición y la desaparición del aviso, y los cambios que llegan "por la actualización al reconectar".
- **La medición** con las dos formas de corte de Toxiproxy y con el reinicio de la réplica, con las repeticiones del skeleton.

**No incluye:**

- El aviso con diseño, en la navegación principal: [TK-13](TK-13-ordenes.md) (HU-02.h6).
- La renovación que falla por la red, que también cuenta como corte: [TK-11](TK-11-renovacion-de-la-sesion.md) (HU-01.h4).
- La reapertura con el JWT renovado: [TK-08](TK-08-renovacion-del-jwt.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `comun/red/` (Monitor de conexión), `comun/eventos/`, `salon/` y `cobros/`, con sus pruebas.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Monitor de conexión, Eventos, Cliente HTTP (le informa al Monitor cuándo una consulta falla), Salón y Cobros.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): el sondeo usa una de T05, T06 o T07; la recuperación, las tres; la reconexión, el stream de T16 y T17.

## Requisitos de prueba del backlog

Ninguno de la lista del backlog. Usa los cortes de Toxiproxy de [TK-01](TK-01-replica.md).

## Dependencias

- [TK-06](TK-06-eventos-y-consulta-periodica.md): la conexión de eventos y la consulta periódica.
- [TK-01](TK-01-replica.md): las dos formas de corte de Toxiproxy.
- [TK-04](TK-04-simulador-cobros.md): la solicitud y el cobro que WS-c8 genera durante el corte.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de WS-c5 a WS-c9.
2. Escribir las pruebas primero, y verlas fallar: cada criterio con las dos formas de corte, y WS-c9 con la réplica detenida 60 s.
3. Escribir el Monitor de conexión y el aviso sin diseño.
4. Escribir la reconexión de Eventos con la salida elegida, y la regla de tratar como caída la conexión cuando el sondeo detecta un corte.
5. Escribir la recuperación: la actualización de mesas, solicitudes y cobros y la reapertura de eventos.
6. Medir con las repeticiones del skeleton y guardar los registros de cada corrida como evidencia.
7. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app). El aviso es sin diseño: RNF-10 aplica desde [TK-13](TK-13-ordenes.md).
- **Propio del ticket:**
  - Cada criterio pasa en todas sus repeticiones y con las dos formas de corte.
  - Ninguna acción que cambia datos se dispara al reconectar: la recuperación solo consulta.

## Riesgos y decisiones pendientes

- **Riesgo técnico del skeleton:** "Un stream caído sin heartbeat: … la app podría creer que la conexión sigue viva y perder eventos sin enterarse".
- **Riesgo técnico del skeleton:** "La espera creciente de la reconexión no tiene tope: … Después de un reinicio de 60 s, la próxima espera puede pasar los 5 s de RNF-4".
- **Pendiente:** qué consulta usa el sondeo y los intervalos ([ADRs](../../adr/README.md), "Decisiones pendientes").
- **Pendiente:** el tiempo de espera de las consultas y "cómo se relaciona con los 5 s de RNF-4" ([componentes.md](../../architecture/componentes.md)).
- **Pendiente:** quién provoca los cortes: el simulador por la API de Toxiproxy o aparte ([componentes.md](../../architecture/componentes.md)).
