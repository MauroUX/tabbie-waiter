# Tickets: walking skeleton, HU-01, HU-02 y HU-04

> La descomposición en tickets del [walking skeleton](../../architecture/walking-skeleton.md) y de las tres primeras historias del backlog: [HU-01](../historias/HU-01-iniciar-sesion.md), [HU-02](../historias/HU-02-mesas-activas.md) y [HU-04](../historias/HU-04-cocina-y-cancelacion.md). Cada ticket cumple la [Definition of Done](../definition-of-done.md) de su tipo.
>
> La base son el [backlog](../README.md), la [arquitectura](../../architecture/README.md) (walking skeleton, componentes, estructura, infraestructura, seguridad y modelo de datos), los [ADRs](../../adr/README.md) y el [documento de contexto](../../context/panel-mozos-actual.md).

**Referencias:** las mismas que en los ADRs. Un número de cuatro cifras remite a un ADR; "PRD", "contexto" y "backlog" remiten a esos tres documentos; los IDs (RF-n, RNF-n, M-n, Cn, Tnn, On, HU-nn) son los de cada documento. `WS-cN` es un criterio del walking skeleton, `SEG-cN` uno de [seguridad.md](../../architecture/seguridad.md), `ESC-n` un escenario del simulador ([componentes.md](../../architecture/componentes.md), sección 3) y `TK-NN` un ticket de esta carpeta.

## Cómo se leen los tickets

- **Archivos:** uno por ticket, `TK-NN-<nombre>.md`. El número sigue el orden en que se hacen.
- **Gestor:** por ahora los tickets viven acá. Cuando se decida el gestor (GitHub Issues o Jira), se crean ahí desde estos archivos.
- **Criterios:** un ticket no tiene criterios propios. Hereda los de las historias (`HU-nn.cN`, `HU-nn.hN`), del walking skeleton (`WS-cN`) y de seguridad (`SEG-cN`) por su ID, con enlace, y suma su Definition of Done. El scenario ejecutable vive en la spec del cambio de OpenSpec.
- **Herencia en parte:** un ticket de réplica, simulador o datos hereda **en parte** un criterio de la app cuando hace lo que ese criterio necesita del lado de la réplica. Su scenario comprueba esa parte por HTTP, y el criterio se cumple completo en el ticket de la app que lo hereda entero, que el ticket nombra.
- **Tamaño:** cada ticket se cierra con un PR. HU-01, HU-02 y HU-04 se parten en dos tickets cada una; el skeleton, en nueve.
- **El backend no se modifica:** ningún ticket cambia el código de `backend/` (0002).

## Tickets, en el orden en que se hacen

| # | ID | Título | Tipo | Origen | Depende de |
|---|---|---|---|---|---|
| 1 | [TK-01](TK-01-replica.md) | Réplica levantada, detrás de Toxiproxy, con el contrato comprobado | Backend | Walking skeleton | — |
| 2 | [TK-02](TK-02-datos-iniciales.md) | Datos iniciales sintéticos y cuentas de prueba | Datos | Walking skeleton | TK-01 |
| 3 | [TK-03](TK-03-simulador-mesas-y-pedidos.md) | Simulador: ocupar mesas, confirmar pedidos y pedir ayuda | Backend | Walking skeleton | TK-02 |
| 4 | [TK-04](TK-04-simulador-cobros.md) | Simulador: solicitudes de cobro, cobros de otra tablet y el otro restaurante | Backend | Walking skeleton | TK-03 |
| 5 | [TK-05](TK-05-app-base.md) | App: proyecto, variantes, inicio de sesión mínimo y registro de diagnóstico | Frontend | Walking skeleton | TK-01, TK-02 |
| 6 | [TK-06](TK-06-eventos-y-consulta-periodica.md) | App: eventos y consulta periódica | Frontend | Walking skeleton | TK-03, TK-04, TK-05 |
| 7 | [TK-07](TK-07-cortes-y-recuperacion.md) | App: aviso sin conexión y recuperación después de un corte | Frontend | Walking skeleton | TK-01, TK-04, TK-06 |
| 8 | [TK-08](TK-08-renovacion-del-jwt.md) | App: renovación del JWT con la conexión de eventos | Frontend | Walking skeleton | TK-01, TK-07 |
| 9 | [TK-09](TK-09-cliente-de-acciones.md) | App: cliente de las acciones que cambian datos, sin reintentos | Frontend | Walking skeleton | TK-03, TK-07, TK-08 |
| 10 | [TK-10](TK-10-inicio-de-sesion.md) | Inicio de sesión: pantalla, errores, rechazo y sesión guardada | Frontend | HU-01 | TK-04, TK-09 |
| 11 | [TK-11](TK-11-renovacion-de-la-sesion.md) | Renovación de la sesión que el mozo no nota | Frontend | HU-01 | TK-07, TK-08, TK-10 |
| 12 | [TK-12](TK-12-simulador-cancelar-pedido.md) | Simulador: cancelar un pedido como comensal | Backend | HU-02 y HU-04 | TK-03 |
| 13 | [TK-13](TK-13-ordenes.md) | Navegación principal y "Órdenes": pestañas y tarjetas | Frontend | HU-02 | TK-04, TK-10, TK-12 |
| 14 | [TK-14](TK-14-tarjeta-y-cronometro.md) | Datos de la tarjeta de la mesa y cronómetro de demora | Frontend | HU-02 | TK-03, TK-04, TK-13 |
| 15 | [TK-15](TK-15-mesa-con-pedidos-cobrados.md) | Carga de una mesa con pedidos cobrados | Datos | HU-04 | TK-02 |
| 16 | [TK-16](TK-16-mandar-a-cocina.md) | Mandar a cocina desde "Órdenes" | Frontend | HU-04 | TK-03, TK-09, TK-12, TK-13 |
| 17 | [TK-17](TK-17-cancelar-pedidos.md) | Cancelar pedidos sin tocar lo cobrado | Frontend | HU-04 | TK-04, TK-12, TK-15, TK-16 |

- **El orden** sigue el del backlog: el walking skeleton (TK-01 a TK-09), HU-01 (TK-10 y TK-11), HU-02 (TK-12 a TK-14) y HU-04 (TK-15 a TK-17). Dentro de cada grupo, un ticket va después de los que necesita.
- **TK-12 y TK-15** no dependen de las pantallas: se pueden hacer en cualquier momento después de TK-03 y de TK-02, antes de los tickets que los usan.
- **Por tipo:** 4 de backend, 2 de datos, 11 de frontend y ninguno de bug.

## Los tres tickets del Readme.md

| Sección 6 del Readme.md | Ticket |
|---|---|
| Base de datos | [TK-02](TK-02-datos-iniciales.md) · Datos iniciales sintéticos y cuentas de prueba |
| Backend | [TK-01](TK-01-replica.md) · Réplica levantada, detrás de Toxiproxy, con el contrato comprobado |
| Frontend | [TK-16](TK-16-mandar-a-cocina.md) · Mandar a cocina desde "Órdenes" |

## Cobertura de los criterios

Cada criterio de HU-01, HU-02, HU-04 y del walking skeleton está en al menos un ticket. "En parte" marca los tickets que hacen la parte de la réplica, el simulador o los datos.

### Walking skeleton

| Criterio | Ticket | En parte |
|---|---|---|
| WS-c1 | TK-06 | TK-01, TK-02, TK-05 |
| WS-c2 | TK-06 | TK-03 |
| WS-c3 | TK-06 | TK-04 |
| WS-c4 | TK-06 | TK-03, TK-04 |
| WS-c5 | TK-07 | — |
| WS-c6 | TK-07 | — |
| WS-c7 | TK-07 | — |
| WS-c8 | TK-07 | TK-04 |
| WS-c9 | TK-07 | — |
| WS-c10 | TK-08 | — |
| WS-c11 | TK-09 | — |

**Riesgos técnicos del skeleton** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 6):

| Riesgo | Ticket que lo despeja |
|---|---|
| La réplica no arranca sin las variables de MercadoPago ni de almacenamiento de archivos | TK-01 |
| Un stream caído sin heartbeat | TK-07 |
| La espera creciente de la reconexión no tiene tope | TK-07 |
| El JWT en la URL del stream | TK-06 (encabezado `Authorization`), TK-08 (reabrir con el vigente), TK-09 (SEG-c6) |
| Los reintentos automáticos del cliente HTTP | TK-09 |
| Unirse a la mesa y autenticar al comensal | TK-03 |
| La solicitud de MercadoPago escrita a mano | TK-04 |
| El reloj del emulador | TK-06 |

### HU-01

| Criterio | Ticket |
|---|---|
| HU-01.c1, HU-01.c2 | TK-10 |
| HU-01.c3, HU-01.c4 | TK-11 |
| HU-01.h1, HU-01.h2, HU-01.h3 | TK-10 |
| HU-01.h4 | TK-11 |
| HU-01.h5, HU-01.h6 | TK-10 |

### HU-02

| Criterio | Ticket | En parte |
|---|---|---|
| HU-02.c1, HU-02.c2, HU-02.c3 | TK-13 | — |
| HU-02.c4, HU-02.c5 | TK-14 | — |
| HU-02.h1, HU-02.h2 | TK-13 | — |
| HU-02.h3, HU-02.h4, HU-02.h5 | TK-14 | — |
| HU-02.h6, HU-02.h7 | TK-13 | — |
| HU-02.h8 | TK-13 | TK-12 |

### HU-04

| Criterio | Ticket | En parte |
|---|---|---|
| HU-04.c1 | TK-16 | — |
| HU-04.c2 | TK-17 | — |
| HU-04.c3 | TK-17 | TK-15 |
| HU-04.h1 | TK-16 | — |
| HU-04.h2 | TK-16 | TK-12 |
| HU-04.h3 | TK-17 | TK-12 |
| HU-04.h4 | TK-16 | — |
| HU-04.h5 | TK-16 (envío) y TK-17 (cancelación) | — |
| HU-04.h6 | TK-17 | TK-15 |
| HU-04.h7 | TK-17 | TK-04 |
| HU-04.h8 | TK-17 | — |

### Seguridad

| Criterio | Ticket |
|---|---|
| SEG-c1 | TK-03 |
| SEG-c2 | TK-04 |
| SEG-c3 | TK-03 |
| SEG-c4 | TK-03 |
| SEG-c5 | Fuera de esta descomposición |
| SEG-c6 | TK-09 |
| SEG-c7 | TK-05 |
| SEG-c8 | Fuera de esta descomposición |
| SEG-c9 | TK-09 (en parte, TK-08) |
| SEG-c10 | TK-01 |
| SEG-c11 | TK-02 |

## Fuera de esta descomposición

Lo que estos tickets no cubren porque lo piden otras historias o no lo pide ningún criterio de las tres historias ni del skeleton:

- **SEG-c5:** pide marcas de "Atendido" (HU-10) y cerrar sesión (HU-09).
- **SEG-c8:** pide que el mozo registre un cobro manual (HU-05), confirme y elimine solicitudes (HU-07) y cierre una mesa (HU-08).
- **ESC-3, ESC-6 y ESC-9 a ESC-11 del simulador:** los piden HU-03, HU-06, HU-07 y la medición de M-1 a M-3.
- **El entorno de demo en Railway y la publicación del APK** ([infraestructura.md](../../architecture/infraestructura.md), secciones 2.2 y 3).

## Decisiones pendientes

No se pueden decidir con los documentos, así que quedan sin decidir. Cada una dice de dónde sale y a qué tickets afecta.

**Del proceso:**

- **Gestor de tickets:** GitHub Issues o Jira. Hasta que se decida, los tickets viven en esta carpeta. Afecta a todos.
- **Configuración del proyecto:** `openspec/`, `AGENTS.md` y `CLAUDE.md` "llegan al configurar el proyecto" ([estructura.md](../../architecture/estructura.md)), pero ningún tipo de ticket lo cubre, y todos los tickets empiezan por un cambio de OpenSpec. Hace falta antes de TK-01. Cuando exista `AGENTS.md`, la [Definition of Done](../definition-of-done.md) pasa ahí.
- **Dónde viven las pruebas de integración de la réplica:** la DoD de Backend las pide desde fuera de `backend/`, y [estructura.md](../../architecture/estructura.md) no tiene una carpeta para ellas ni para las comprobaciones de O1 a O4 ([seguridad.md](../../architecture/seguridad.md), sección 4.2). Afecta a TK-01, TK-02, TK-03, TK-04, TK-12 y TK-15.

**De la réplica, los datos y el simulador:**

- **El JWT de mozo para el contrato de TK-01:** la prueba del contrato necesita un mozo con su cuenta, y las cuentas son de TK-02, que necesita el esquema que crea la réplica de TK-01. Falta decidir cómo obtiene esa prueba un JWT de mozo sin las cuentas de TK-02. Afecta a TK-01.
- **Carga de los datos iniciales:** "con el seeder que trae la copia (`src/seeder/`) o por fuera" ([componentes.md](../../architecture/componentes.md), "Decisiones pendientes"). Afecta a TK-02 y TK-15.
- **Cómo se autentica el comensal y con qué endpoint se une a la mesa** ([componentes.md](../../architecture/componentes.md); riesgo técnico del skeleton). Si el comensal usa una cuenta, TK-02 crea también las de los comensales. Afecta a TK-02 y TK-03.
- **Endpoint para cancelar como comensal (ESC-7)** ([componentes.md](../../architecture/componentes.md)). Afecta a TK-12, y por él a TK-13, TK-16 y TK-17.
- **Quién provoca los cortes y los fallos,** y cómo se hace fallar una sola petición de varias ([componentes.md](../../architecture/componentes.md); el backlog lo deja para el plan de pruebas). Afecta a TK-01, TK-07, TK-16 y TK-17.
- **El "cobro del comensal" de HU-04.h7:** el backlog dice que HU-04.h7 "se prueba con un cobro del comensal" ("Orden del backlog"), pero el comensal solo pide el cobro (ESC-5) y ningún escenario del simulador lo registra. TK-04 propone confirmar la solicitud con la cuenta del segundo mozo, como otra tablet; falta confirmar que es lo que pide el backlog. Afecta a TK-04 y TK-17.
- **SEG-c6 y el turno simulado:** SEG-c6 pide un turno con ESC-9, que no está en el alcance del simulador del skeleton. Falta decidir si TK-09 lo comprueba con un turno de ESC-1, ESC-2, ESC-4 y ESC-5, o si SEG-c6 espera a ESC-9. Afecta a TK-09.

**De la app:**

- **Intervalos de consulta y qué consulta usa el sondeo** ([ADRs](../../adr/README.md), "Decisiones pendientes"). Afecta a TK-06, TK-07 y TK-13.
- **El tiempo de espera de las consultas** y cómo se relaciona con los 5 s de RNF-4 ([componentes.md](../../architecture/componentes.md)); el skeleton fija 10 s solo para las acciones. Afecta a TK-06 y TK-07.
- **Reintentos de OkHttp en las consultas:** el mismo cliente que las acciones o uno con reintentos ([componentes.md](../../architecture/componentes.md)). Afecta a TK-05, TK-06 y TK-09.
- **JWT en el encabezado del stream** ([ADRs](../../adr/README.md)): lo comprueba TK-06; si funciona, un ADR nuevo reemplaza esa parte de 0004 y 0006. Afecta a TK-06 y TK-08.
- **Eventos de solicitud ilegibles** ([componentes.md](../../architecture/componentes.md)). Afecta a TK-06.
- **"Órdenes" antes de HU-02:** HU-01.c1, HU-01.c3, HU-01.h3, HU-01.h4 y HU-01.h6 se ven en "Órdenes", que construye HU-02 (TK-13), y el backlog ordena HU-01 antes. Falta decidir si se verifican sobre la lista sin diseño del skeleton o después de TK-13. Afecta a TK-10 y TK-11.
- **Qué pedidos manda "Mandar a cocina"** (HU-04.h4): los que el mozo veía o los que trae la revisión ([componentes.md](../../architecture/componentes.md)). Afecta a TK-16.
- **Varias peticiones por acción:** en serie o en paralelo, y si un fallo detiene las que faltan ([componentes.md](../../architecture/componentes.md)). Afecta a TK-16 y TK-17.
