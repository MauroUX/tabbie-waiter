# Tickets: walking skeleton delgado y lote 1

> La descomposición en tickets del [walking skeleton](../../architecture/walking-skeleton.md) delgado (DP-04) y de las historias del lote 1 del backlog (DP-03): [HU-02](../historias/HU-02-mesas-activas.md), [HU-01](../historias/HU-01-iniciar-sesion.md) sin la renovación, [HU-04](../historias/HU-04-cocina-y-cancelacion.md), [HU-06](../historias/HU-06-solicitudes-y-cobros.md), [HU-07](../historias/HU-07-confirmar-o-eliminar-solicitud.md) y [HU-08](../historias/HU-08-cerrar-mesa.md). Cada ticket cumple la [Definition of Done](../definition-of-done.md) de su tipo.
>
> La base son el [backlog](../README.md), la [arquitectura](../../architecture/README.md) (walking skeleton, componentes, estructura, infraestructura, seguridad y modelo de datos), los [ADRs](../../adr/README.md) y el [documento de contexto](../../context/panel-mozos-actual.md).

**Referencias:** las mismas que en los ADRs. Un número de cuatro cifras remite a un ADR; "PRD", "contexto" y "backlog" remiten a esos tres documentos; los IDs (RF-n, RNF-n, M-n, Cn, Tnn, On, HU-nn) son los de cada documento. `WS-cN` es un criterio del walking skeleton, `SEG-cN` uno de [seguridad.md](../../architecture/seguridad.md), `ESC-n` un escenario del simulador ([componentes.md](../../architecture/componentes.md), sección 3) y `TK-NN` un ticket de esta carpeta.

## Cómo se leen los tickets

- **Archivos:** uno por ticket, `TK-NN-<nombre>.md`. El número sigue el orden en que se hacen.
- **Gestor:** GitHub Issues, con `gh` (DP-05). Desde el 2026-11-17 hay un issue por ticket, enlazado en la columna "Issue" de la tabla de abajo. El issue enlaza el archivo y no copia su contenido: el archivo sigue siendo la fuente.
- **Criterios:** un ticket no tiene criterios propios. Hereda los de las historias (`HU-nn.cN`, `HU-nn.hN`), del walking skeleton (`WS-cN`) y de seguridad (`SEG-cN`) por su ID, con enlace, y suma su Definition of Done. El cambio de OpenSpec de cada ticket copia el texto de los criterios que hereda, para que el agente los tenga sin abrir otros archivos (DP-08). El scenario ejecutable vive en la spec de ese cambio.
- **Herencia en parte:** un ticket de réplica, simulador o datos hereda **en parte** un criterio de la app cuando hace lo que ese criterio necesita del lado de la réplica. Su scenario comprueba esa parte por HTTP, y el criterio se cumple completo en el ticket de la app que lo hereda entero, que el ticket nombra.
- **Wireframes:** cada ticket de frontend con pantalla enlaza el wireframe de baja fidelidad de su pantalla, en `docs/design/` (DP-10): `ordenes.png`, `inicio-de-sesion.png` y `pagos.png`. Todavía no existen. Los tickets de frontend del skeleton no tienen wireframe, porque sus pantallas son sin diseño.
- **Tamaño:** cada ticket se cierra con un PR. El skeleton se parte en siete tickets; HU-02, en tres (uno de simulador y dos de pantalla); HU-06, HU-07 y HU-08 comparten un ticket de simulador, y cada una tiene el suyo de pantalla.
- **El backend de Tabbie no se modifica:** la réplica es propia, en `replica/`, construida desde el contrato del contexto ([0010](../../adr/0010-replica-propia-desde-el-contrato.md)). Cada endpoint que hace falta entra en un ticket de Backend (DP-53), y ningún ticket cambia una ruta, un cuerpo o un evento del contexto si no lo dice.
- **Renumeración:** en la revisión de la Entrega 1 se rehízo la descomposición para el lote 1 y se renumeró desde TK-01. Los tickets de la ampliación se borraron y se vuelven a escribir cuando arranque; la versión anterior queda en el historial de git.

## Antes del primer ticket

El **setup del proyecto** (DP-06) no es un ticket, pero va antes de TK-01, en la rama `feature/entrega-2-mc` y antes de cualquier código:

- `AGENTS.md` con la [Definition of Done](../definition-of-done.md), y `CLAUDE.md`;
- `openspec/`, `.gitignore` y `.gitattributes`;
- el hook de pre-commit de `.claude/hooks/` (DP-07);
- la CI de `.github/workflows/`, que corre desde el primer PR de código (DP-11).

## Tickets, en el orden en que se hacen

| # | ID | Título | Tipo | Origen | Depende de | Issue |
|---|---|---|---|---|---|---|
| 1 | [TK-01](TK-01-replica.md) | Réplica base: proyecto, migraciones, inicio de sesión, mesas activas y stream | Backend | Walking skeleton | Setup | [#2](https://github.com/MauroUX/tabbie-waiter/issues/2) |
| 2 | [TK-02](TK-02-datos-iniciales.md) | Datos iniciales sintéticos y cuentas de prueba | Datos | Walking skeleton | TK-01 | [#3](https://github.com/MauroUX/tabbie-waiter/issues/3) |
| 3 | [TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md) | Simulador: ocupar mesas, confirmar pedidos y pedir cobros | Backend | Walking skeleton | TK-02 | [#4](https://github.com/MauroUX/tabbie-waiter/issues/4) |
| 4 | [TK-04](TK-04-app-base.md) | App: proyecto, variantes, inicio de sesión mínimo y registro de diagnóstico | Frontend | Walking skeleton | TK-01, TK-02 | [#5](https://github.com/MauroUX/tabbie-waiter/issues/5) |
| 5 | [TK-05](TK-05-eventos-y-consulta-periodica.md) | App: eventos y consulta periódica | Frontend | Walking skeleton | TK-03, TK-04 | [#6](https://github.com/MauroUX/tabbie-waiter/issues/6) |
| 6 | [TK-06](TK-06-aviso-y-reconexion.md) | App: aviso sin conexión y reconexión, con MockWebServer | Frontend | Walking skeleton | TK-05 | [#7](https://github.com/MauroUX/tabbie-waiter/issues/7) |
| 7 | [TK-07](TK-07-cliente-de-acciones.md) | App: cliente de las acciones, sin reintentos, con MockWebServer | Frontend | Walking skeleton | TK-04, TK-05, TK-06 | [#8](https://github.com/MauroUX/tabbie-waiter/issues/8) |
| 8 | [TK-08](TK-08-simulador-ordenes.md) | Simulador: lo que piden "Órdenes" y el inicio de sesión | Backend | HU-02, HU-01, HU-04 | TK-03 | [#9](https://github.com/MauroUX/tabbie-waiter/issues/9) |
| 9 | [TK-09](TK-09-ordenes.md) | Navegación principal y "Órdenes": pestañas y tarjetas | Frontend | HU-02 | TK-05, TK-06, TK-08 | [#10](https://github.com/MauroUX/tabbie-waiter/issues/10) |
| 10 | [TK-10](TK-10-tarjeta-y-cronometro.md) | Datos de la tarjeta y cronómetro de demora | Frontend | HU-02 | TK-08, TK-09 | [#11](https://github.com/MauroUX/tabbie-waiter/issues/11) |
| 11 | [TK-11](TK-11-inicio-de-sesion.md) | Inicio de sesión: pantalla, errores, rechazo y sesión guardada | Frontend | HU-01 | TK-08, TK-09 | [#12](https://github.com/MauroUX/tabbie-waiter/issues/12) |
| 12 | [TK-12](TK-12-mandar-a-cocina.md) | Mandar a cocina desde "Órdenes" | Frontend | HU-04 | TK-07, TK-08, TK-09 | [#13](https://github.com/MauroUX/tabbie-waiter/issues/13) |
| 13 | [TK-13](TK-13-simulador-pagos.md) | Simulador: lo que piden "Pagos" | Backend | HU-06, HU-07, HU-08 | TK-03 | [#14](https://github.com/MauroUX/tabbie-waiter/issues/14) |
| 14 | [TK-14](TK-14-pagos-solicitudes.md) | "Pagos": solicitudes de cobro presencial e indicador | Frontend | HU-06 | TK-05, TK-08, TK-09, TK-13 | [#15](https://github.com/MauroUX/tabbie-waiter/issues/15) |
| 15 | [TK-15](TK-15-confirmar-o-eliminar-solicitud.md) | Confirmar o eliminar una solicitud de cobro | Frontend | HU-07 | TK-07, TK-12, TK-13, TK-14 | [#16](https://github.com/MauroUX/tabbie-waiter/issues/16) |
| 16 | [TK-16](TK-16-cerrar-mesa.md) | Cerrar una mesa | Frontend | HU-08 | TK-07, TK-08, TK-12, TK-13, TK-14 | [#17](https://github.com/MauroUX/tabbie-waiter/issues/17) |

- **El orden** es el de DP-30: el skeleton delgado (TK-01 a TK-07), "Órdenes" (HU-02: TK-08 a TK-10), el resto de HU-01 (TK-11), mandar a cocina (TK-12), las solicitudes (HU-06: TK-13 y TK-14), HU-07 (TK-15) y HU-08 (TK-16). Dentro de cada grupo, un ticket va después de los que necesita.
- **"Órdenes" antes:** la primera pantalla con diseño es TK-09; en la descomposición anterior era TK-13.
- **TK-08 y TK-13** no dependen de las pantallas: se pueden hacer en cualquier momento después de TK-03, antes de los tickets que los usan.
- **Por tipo:** 4 de backend, 1 de datos, 11 de frontend y ninguno de bug.

## Los tres tickets del Readme.md

| Sección 6 del Readme.md | Ticket |
|---|---|
| Base de datos | [TK-02](TK-02-datos-iniciales.md) · Datos iniciales sintéticos y cuentas de prueba |
| Backend | [TK-01](TK-01-replica.md) · Réplica base: proyecto, migraciones, inicio de sesión, mesas activas y stream |
| Frontend | [TK-12](TK-12-mandar-a-cocina.md) · Mandar a cocina desde "Órdenes" |

## Cobertura de los criterios

Cada criterio del lote 1 y del walking skeleton delgado está en al menos un ticket. "En parte" marca los tickets que hacen la parte de la réplica, el simulador o los datos.

### Walking skeleton

| Criterio | Ticket | En parte |
|---|---|---|
| WS-c1 | TK-05 | TK-01, TK-02, TK-03, TK-04 |
| WS-c2 | TK-05 | TK-03 |
| WS-c3 | TK-05 | TK-03 |
| WS-c5 | TK-06 | — |
| WS-c6 | TK-06 | — |
| WS-c7 | TK-06 | — |
| WS-c9 | TK-06 | — |
| WS-c11 | TK-07 | — |

WS-c4, WS-c8 y WS-c10 pasaron a la ampliación ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 5.2).

**Riesgos técnicos del skeleton** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 6.1):

| Riesgo | Ticket que lo despeja |
|---|---|
| Un stream caído sin heartbeat | TK-06 |
| La espera creciente de la reconexión no tiene tope | TK-06 |
| El JWT del stream | TK-05 |
| Los reintentos automáticos del cliente HTTP | TK-07 |
| Unirse a la mesa y autenticar al comensal | TK-03 |
| El reloj del emulador | TK-05 |

El riesgo "La réplica no arranca sin las variables de MercadoPago ni de almacenamiento de archivos" lo cerró DP-48: la réplica propia no tiene esos módulos.

### HU-02

| Criterio | Ticket | En parte |
|---|---|---|
| HU-02.c1, HU-02.c2, HU-02.c3 | TK-09 | — |
| HU-02.c4 | TK-10 | TK-08 |
| HU-02.c5 | TK-10 | — |
| HU-02.h1, HU-02.h2 | TK-09 | — |
| HU-02.h3 | TK-10 | — |
| HU-02.h4 | TK-10 | TK-08 |
| HU-02.h5 | TK-10 | — |
| HU-02.h6 | TK-09 | — |
| HU-02.h7, HU-02.h8 | TK-09 | TK-08 |

### HU-01 (lote 1)

| Criterio | Ticket | En parte |
|---|---|---|
| HU-01.c1, HU-01.c2 | TK-11 | — |
| HU-01.h1, HU-01.h2, HU-01.h3, HU-01.h5 | TK-11 | — |
| HU-01.h6 | TK-11 | TK-08 |

HU-01.c3, HU-01.c4 y HU-01.h4 van en la ampliación, con la renovación.

### HU-04

| Criterio | Ticket | En parte |
|---|---|---|
| HU-04.c1 | TK-12 | — |
| HU-04.h1 | TK-12 | — |
| HU-04.h2 | TK-12 | TK-08 |
| HU-04.h4 | TK-12 | — |
| HU-04.h5 | TK-12 (el envío; la cancelación, con HU-12 en la ampliación) | — |

### HU-06

| Criterio | Ticket | En parte |
|---|---|---|
| HU-06.c1, HU-06.c2 | TK-14 | — |
| HU-06.h1 | TK-14 | — |
| HU-06.h3 | TK-14 | TK-13 |
| HU-06.h4 | TK-14 | TK-13 (y el cobro de TK-08) |
| HU-06.h5, HU-06.h6 | TK-14 | — |
| HU-06.h7 | TK-14 | TK-13 |

### HU-07

| Criterio | Ticket | En parte |
|---|---|---|
| HU-07.c1, HU-07.c3 | TK-15 | — |
| HU-07.c2 | TK-15 (lo pagado; "el ítem marcado como pagado", con HU-13 en la ampliación) | — |
| HU-07.h1, HU-07.h2, HU-07.h4 | TK-15 | — |
| HU-07.h5 | TK-15 | TK-13 |

HU-07.c4 y HU-07.h3 pasaron a HU-13 (HU-13.c3 y HU-13.h3), en la ampliación (DP-38).

### HU-08

| Criterio | Ticket |
|---|---|
| HU-08.c1, HU-08.c2, HU-08.c3, HU-08.c4 | TK-16 |
| HU-08.h1, HU-08.h2, HU-08.h3, HU-08.h4, HU-08.h5, HU-08.h6, HU-08.h7 | TK-16 |

### Seguridad

| Criterio | Ticket |
|---|---|
| SEG-c1 | TK-08 |
| SEG-c2 | TK-13 |
| SEG-c3 | TK-08 |
| SEG-c4 | TK-08 |
| SEG-c5 | Fuera de esta descomposición |
| SEG-c6 | Fuera de esta descomposición |
| SEG-c7 | TK-04 |
| SEG-c8 | Fuera de esta descomposición |
| SEG-c9 | Fuera de esta descomposición |
| SEG-c10 | TK-01 |
| SEG-c11 | TK-02 |

## Fuera de esta descomposición

Todo lo de la ampliación del backlog (backlog, "Orden del backlog"). Sus tickets se escriben cuando arranque la ampliación:

- **La renovación:** HU-01.c3, HU-01.c4 y HU-01.h4, y WS-c10, con la baja y el alta de una cuenta de prueba para HU-01.c4 y el perfil con un vencimiento corto del JWT.
- **Lo que sale del walking skeleton** (DP-04): WS-c4 y WS-c8; Toxiproxy en `compose.yaml` y en el camino de la app, con los cortes de punta a punta (DP-41); ESC-4 en la consulta periódica y la solicitud de MercadoPago medida por WS-c4.
- **Las historias de la ampliación:** HU-12 (cancelar pedidos), HU-03, HU-13 (cobros y MercadoPago, con HU-13.c3 y HU-13.h3, antes HU-07.c4 y HU-07.h3), HU-05, HU-10, HU-09 y HU-11. La solicitud de MercadoPago escrita en Redis (DP-23) se escribe con HU-13 (DP-38).
- **Seguridad:**
  - **SEG-c5:** pide marcas de "Atendido" (HU-10) y cerrar sesión (HU-09).
  - **SEG-c6:** pide un turno con renovaciones y cortes con Toxiproxy; con DP-22, se comprueba con un turno de ESC-1, ESC-2, ESC-4 y ESC-5, y se repite con ESC-9 cuando exista.
  - **SEG-c8:** pide que el mozo cancele (HU-12) y registre un cobro manual (HU-05).
  - **SEG-c9:** pide un JWT vencido y la renovación.
- **El simulador y las métricas:** ESC-3, ESC-9 a ESC-11, la confirmación de una solicitud desde otra tablet (HU-12.h3) y la medición de M-1 a M-3.
- **El entorno de demo en Railway y la publicación del APK** ([infraestructura.md](../../architecture/infraestructura.md), secciones 2.2 y 3), al final de la ampliación.

## Decisiones tomadas (2026-11-14)

Fuente de cada una: decisión del humano después de la revisión de la Entrega 1. Valen tal cual; cada una dice a qué tickets de esta descomposición afecta.

**Del proceso:**

- **DP-05 · Gestor de tickets:** GitHub Issues, con `gh`: primero solo lectura y después escritura controlada. Los issues se crean desde esta carpeta más adelante. Afecta a todos.
- **DP-06 · Configuración del proyecto:** `AGENTS.md` con la [Definition of Done](../definition-of-done.md), `CLAUDE.md`, `openspec/`, `.gitignore`, `.gitattributes` y el hook se hacen en un setup antes de TK-01, en la rama `feature/entrega-2-mc` y antes de cualquier código. Afecta a todos (ver "Antes del primer ticket").
- **DP-07 · Hook de pre-commit:** en `.claude/hooks/`, bloquea `.env`, la cuenta de servicio de Firebase, `JWT_SECRET`, los tokens de MercadoPago, las contraseñas de las cuentas de prueba y los emails que no son del dominio de prueba. Afecta a todos.
- **DP-08 · Criterios en el cambio de OpenSpec:** el ticket sigue heredando los criterios por ID, y el cambio de OpenSpec de cada ticket copia el texto de los criterios que hereda. Afecta a todos.
- **DP-09 · OpenAPI** (reemplazada por DP-52)**:** se escribe a mano en `docs/api/openapi.yaml`, desde el código de la copia, con los campos sensibles marcados `x-sensitive: true`. Lo validan las pruebas de contrato de la réplica, y no se toca `backend/`. Afecta a TK-01.
- **DP-10 · Wireframes:** de baja fidelidad, en `docs/design/`, y se enlazan desde los tickets de frontend. Afecta a TK-09, TK-10, TK-11, TK-12, TK-14, TK-15 y TK-16.
- **DP-11 · CI:** GitHub Actions desde el primer PR de código, con ktlint, tests de la app, tests de la réplica y gitleaks ([infraestructura.md](../../architecture/infraestructura.md#6-integración-continua)). Afecta a todos.
- **DP-12 · Revisión adversarial:** en cada PR, antes del merge, el humano lanza el subagente `adversarial-reviewer` contra los criterios del ticket, y el informe queda como comentario del PR ([Definition of Done](../definition-of-done.md#para-todos)). Afecta a todos.
- **DP-14 · Pruebas de la réplica:** viven en `replica/tests/`, en TypeScript con Jest y Supertest, por HTTP contra la réplica levantada con Docker Compose, con MySQL y Redis reales. Ahí van también las comprobaciones de O1 a O4. Afecta a TK-01, TK-02, TK-03, TK-08 y TK-13.

**De la réplica, los datos y el simulador:**

- **DP-15 · El JWT de mozo para el contrato de TK-01:** la prueba inserta un mozo en MySQL y firma su JWT con el `JWT_SECRET` de la réplica, porque la réplica, como el backend (contexto, sección 0), solo verifica la firma y busca el `userId`. El canje con Firebase se prueba en TK-02. Afecta a TK-01 y TK-02.
- **DP-16 · Carga de los datos iniciales** (ajustada por DP-48)**:** SQL propio en `replica/datos-iniciales/`, que carga un servicio de Compose que corre una sola vez, espera a que terminen las migraciones de la réplica (DP-51) y ejecuta el SQL. La réplica no tiene seeder ([componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14)). Afecta a TK-02.
- **DP-17 · Cómo se autentica el comensal:** como invitado, con `POST /auth/guest` y un `guestId` generado (rol `user`, sin Firebase). TK-02 no crea cuentas de comensales. Afecta a TK-02 y TK-03.
- **DP-18 · Unirse a la mesa:** con `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber`. Afecta a TK-03.
- **DP-19 · Cancelar como comensal (ESC-7):** con `PUT /orders/:id/cancel`, con `JwtAuthGuard` y sin restricción de rol. Afecta a TK-08, y por él a TK-09 y TK-12.
- **DP-20 · Quién provoca los cortes y los fallos:** el fallo de una sola petición de varias (HU-04.h2, HU-04.h3 y HU-04.h4) se prueba en la app con MockWebServer; los cortes completos se provocan con Toxiproxy desde el script de la prueba, por su API. El simulador no controla Toxiproxy. Afecta a TK-12; los cortes con Toxiproxy van en la ampliación.
- **DP-21 · El cobro "desde otro lugar" de HU-04.h7 (hoy HU-12.h3):** lo registra el simulador con la cuenta del segundo mozo, como otra tablet. No afecta a estos tickets: HU-12 va en la ampliación. Los cobros de otra tablet de TK-08 usan la misma cuenta.
- **DP-22 · SEG-c6 y el turno simulado:** se comprueba con un turno de ESC-1, ESC-2, ESC-4 y ESC-5, y se repite con ESC-9 cuando exista. No afecta a estos tickets: SEG-c6 va en la ampliación.
- **DP-23 · MercadoPago en las pruebas:** la solicitud se escribe directo en Redis y el cobro se inserta como fila en MySQL con el método de MercadoPago. No se usa la API de MercadoPago. Afecta a TK-13.
- **DP-24 · Medición de M-2 y M-3:** lee MySQL con consultas de solo lectura. No afecta a estos tickets: la medición es de ESC-11, en la ampliación.

**De la app:**

- **DP-25 · Intervalos de consulta y sondeo:** el sondeo corre cada 5 s con las mesas activas (T05) y hace también de consulta periódica de las mesas; las solicitudes (T06) y los cobros (T07) se consultan cada 15 s y siempre al reconectar. Afecta a TK-05, TK-06, TK-09 y TK-14.
- **DP-26 · Tiempo de espera:** 4 s para las consultas, así un corte se detecta antes de los 5 s de RNF-4, y 10 s para las acciones. Afecta a TK-05, TK-06 y TK-07.
- **DP-27 · Reintentos de OkHttp:** un solo cliente HTTP, sin reintentos automáticos, para las consultas y las acciones; la próxima consulta periódica es el reintento. Afecta a TK-04, TK-05 y TK-07.
- **DP-28 · JWT en el encabezado del stream:** `Authorization: Bearer`, porque `jwt.strategy.ts` lo lee antes que el query param; TK-05 lo comprueba contra la réplica ([0008](../../adr/0008-jwt-del-stream-en-el-encabezado.md)). Afecta a TK-05.
- **DP-29 · Eventos de solicitud ilegibles:** siguen la regla de RF-12: no se muestra nada y se vuelven a consultar las solicitudes. Afecta a TK-05 y TK-14.
- **DP-31 · Qué pedidos manda "Mandar a cocina" (HU-04.h4):** los que el mozo veía al tocar el botón y que, en la revisión previa, siguen `confirmed`; los que llegaron durante el envío quedan en "Pendientes" con su aviso. Afecta a TK-12.
- **DP-32 · Varias peticiones por acción:** en serie, y siguen aunque una falle; al final, la app actualiza la mesa y avisa cuáles no salieron, sin reintentos (RNF-6). Afecta a TK-12.
- **DP-34 · Limpieza de las marcas de "Atendido":** en cada actualización de las mesas, se borran las marcas de las sesiones de mesa que ya no están activas. No afecta a estos tickets: las marcas son de HU-10, en la ampliación.

**Del alcance** (backlog, "Orden del backlog"):

- **DP-03 · Lote 1 y ampliación**, **DP-04 · Walking skeleton delgado** y **DP-30 · "Órdenes" antes que el resto de HU-01:** definen qué tickets tiene esta descomposición y en qué orden.

## Decisiones tomadas después de la descomposición (2026-11-14)

Eran las decisiones pendientes de esta descomposición. Fuente de cada una: decisión que el humano delegó en la IA, que eligió la opción recomendada.

- **DP-36 · Comensales con email para SEG-c3 y SEG-c4** (ajustada por DP-54: SEG-c3 ya no usa una cuenta de comensal, y la de comensal sin restaurante solo la usa SEG-c4)**:** TK-02 crea una cuenta de comensal, con rol `user` y sin restaurante, y le da el rol `user` a la cuenta que no es de mozo, que tiene el restaurante 1. TK-08 las usa solo para SEG-c3 y SEG-c4; para todo lo demás el comensal sigue siendo invitado (DP-17). Así no se reescribe ningún criterio. Afecta a TK-02 y TK-08.
- **DP-37 · SEG-c11 sin la lista del `Readme.md`:** el "Dado" de SEG-c11 compara los datos iniciales con las cuentas que crea el script de `replica/firebase/` a partir de ellos, porque el `Readme.md` ya no lista las cuentas (DP-35). Es el único cambio de texto de un criterio, y lo pide una decisión anterior. Afecta a TK-02.
- **DP-38 · MercadoPago fuera del lote 1:** HU-07.c4 y HU-07.h3 pasan a HU-13 (HU-13.c3 y HU-13.h3), con el resto de MercadoPago. En el lote 1, "Pagos" muestra y cuenta solo las solicitudes presenciales. De HU-07.c2, el lote 1 comprueba que lo pagado sube y que la solicitud deja de verse; "el ítem queda marcado como pagado" se comprueba con HU-13, que muestra los cobros, como HU-04.h5 con HU-12. Afecta a TK-13, TK-14 y TK-15.
- **DP-39 · "Cerrar mesa" en el lote 1:** va al pie de la tarjeta de la mesa en "Pagos", debajo de las solicitudes. Cuando llega HU-13, los cobros se suman encima y queda "al pie de los cobros", como dice el backlog. Afecta a TK-16.
- **DP-40 · HU-07 antes que HU-08:** se sigue el orden del flujo, cobrar y después cerrar, y el "Orden del backlog" se corrige para que coincida. La confirmación de HU-07 deja una mesa que pagó el total para HU-08.c2. Afecta a TK-15 y TK-16.
- **DP-41 · Toxiproxy fuera del camino de la app en el lote 1:** `compose.yaml` no tiene Toxiproxy, y la variante local apunta directo a la réplica. Toxiproxy se suma con los cortes de punta a punta, en la ampliación, y desde entonces la app pasa siempre por él ([infraestructura.md](../../architecture/infraestructura.md), sección 2.1). Afecta a TK-01 y TK-04.
- **DP-42 · `docs/api/openapi.yaml` lo escribe TK-01** (en parte reemplazada por DP-52: ya no se escribe a mano, y cada ticket de Backend genera la entrada de lo que construye)**:** con una entrada por cada fila de la columna "Waiter App" del inventario, mientras escribe las pruebas del contrato, que validan las respuestas contra él. TK-01 copia tres endpoints en la sección 4 del `Readme.md`. Afecta a TK-01.
- **DP-43 · CI sin credenciales de Firebase:** las pruebas de la réplica corren en la CI con `USE_FIREBASE` desactivada y JWT firmados con un `JWT_SECRET` de prueba (como DP-15). Las que necesitan el proyecto de Firebase de Tabbie se marcan como locales y su evidencia va en el PR ([infraestructura.md](../../architecture/infraestructura.md#6-integración-continua)). Afecta a TK-01 y TK-02.
- **DP-44 · Lo que el PRD dejaba para las historias:** la sección "Pendiente para las historias" del PRD pasa a "Definido en el backlog", con el lugar de cada definición. No afecta a los tickets.
- **DP-46 · Cómo se comprueba que `backend/` no cambió** (obsoleta por DP-48: no hay copia)**:** al importar la copia, con `git diff --no-index` contra un export de `c18b0f7`; después, contra la etiqueta `backend-base` del commit que la importa, en local y en la CI. Fuente: decisión del humano durante el setup. Afecta a TK-01.
- **DP-47 · Dónde vive la ficha de la copia** (obsoleta por DP-48: no hay copia, ni ficha, ni parada del humano)**:** en `docs/architecture/backend-upstream.md`, fuera de `backend/`, que queda idéntico al original sin excepciones. La importación de la copia en TK-01 es una parada del humano: `settings.json` bloquea que el agente escriba en `backend/`, y copiar por la terminal sería esquivar ese bloqueo. Fuente: decisión del humano durante el setup. Afecta a TK-01.

## Decisiones tomadas (2026-11-17)

Fuente de cada una: decisión del humano en la revisión de la réplica. Las baja a un ADR [0010](../../adr/0010-replica-propia-desde-el-contrato.md), que reemplaza en parte a 0002.

- **DP-48 · Réplica propia, sin oráculo:** la réplica es un proyecto NestJS propio en `replica/` (`replica/src/`, con las pruebas en `replica/tests/`), con el stack de 0003, construido desde el contrato y el comportamiento del contexto. Las pruebas de contrato van primero y corren solo contra la réplica, y el código de Tabbie no se lee. No tiene que ser 100 % igual a Tabbie: las diferencias aparecen al conectar con el backend real y se ajustan entonces; "cambiar solo la URL" pasa a ser una intención, con ese riesgo aceptado. Los requisitos de prueba se resuelven con variables de entorno, datos y el simulador, sin endpoints solo de prueba. DP-46 y DP-47 quedan obsoletas. Siguen igual DP-02, DP-14, DP-15, DP-16 (que ahora espera las migraciones), DP-17 a DP-19 y DP-43. Afecta a TK-01, TK-02, TK-03, TK-08 y TK-13.
- **DP-49 · Alcance del contrato:** las filas de la columna "Waiter App" del inventario (T01, T05 a T09, T11 a T14), los tres eventos de `/sse/waiters` y los endpoints del comensal que necesita el simulador para originarlos y para sus escenarios. Las rutas, los cuerpos y los eventos son los del contexto. No se construyen T02 a T04, T10, T15 ni T18, salvo `POST /auth/guest`, que es la ruta de T02. La excepción que construía T04, T10 y T18 en TK-08 para SEG-c1 y SEG-c3 la reemplaza DP-54: DP-49 rige sin excepción. Afecta a TK-01, TK-03, TK-08 y TK-13.
- **DP-50 · O1 a O4 se reproducen a propósito:** son comportamiento heredado que la app rodea (C3, C6, C7, C11), y la réplica deja provocarlos de punta a punta. Cada uno tiene su scenario y su prueba de contrato, con ese motivo escrito, y SEG-c1 a SEG-c4 los comprueban contra la réplica. Si uno no se reproduce, se corrige la réplica. Afecta a TK-01, TK-03, TK-08 y TK-13.
- **DP-51 · Migraciones propias:** migraciones de TypeORM desde [modelo-de-datos.md](../../architecture/modelo-de-datos.md), solo con las 13 tablas del inventario, cada una con cómo se deshace ([Definition of Done](../definition-of-done.md#backend-réplica-y-simulador)). `synchronize` desactivado: no hay `DB_SYNC`. Afecta a TK-01 y TK-02.
- **DP-52 · OpenAPI generado:** `docs/api/openapi.yaml` se genera desde el código con `@nestjs/swagger` y se contrasta con las specs de `openspec/`. Las pruebas de contrato validan las respuestas contra él, y la CI falla si el generado difiere del commiteado. Los campos sensibles siguen marcados `x-sensitive: true`; cómo se logra con el generador lo resuelve TK-01. Reemplaza a DP-09 y a la escritura a mano de DP-42; sigue en pie que la sección 4 del `Readme.md` copie tres endpoints, cuando existan. Afecta a TK-01, TK-03, TK-08 y TK-13.
- **DP-53 · Reparto:** TK-01 deja la réplica base (el proyecto, las migraciones, T01 con Firebase y los guards, T05 y el stream `/sse/waiters` con el JWT en el encabezado, 0008). Cada endpoint restante entra en el ticket de Backend de su grupo que lo necesita primero, según la tabla de abajo. Afecta a TK-01, TK-03, TK-08, TK-12 y TK-13.

**Reparto de los endpoints y eventos (DP-53):** cada uno, en un solo ticket.

| Endpoint o evento | Ticket | Por qué |
|---|---|---|
| T01 `POST /auth/login`, con Firebase y los guards | TK-01 | La base |
| T05 `GET /restaurants/:id/tables/active` | TK-01 | La base; reproduce O4 |
| `GET /sse/waiters`, el stream de T16 y T17 | TK-01 | La base (0008) |
| `POST /auth/guest` (la ruta de T02) | TK-03 | ESC-1 (DP-17) |
| `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber` | TK-03 | ESC-1 (DP-18) |
| `POST /orders` | TK-03 | ESC-2 necesita un pedido para confirmarlo |
| `PUT /orders/:id/confirm` y `order-confirmed-notification` (T16) | TK-03 | ESC-2 lo origina (WS-c2) |
| `POST /payments/in-person-request` e `in-person-payment-request` (T17) | TK-03 | ESC-5 lo origina (WS-c3) |
| T06 `GET /payments/in-person-requests` | TK-03 | Las comprobaciones de TK-03 |
| T07 `GET /table-sessions/:id/payments` | TK-03 | TK-05 lo consulta contra la réplica; reproduce O2 |
| T08 `PUT /orders/:id/send-to-kitchen` | TK-08 | Las comprobaciones de C5; después, TK-12 |
| T09 `PUT /orders/:id/cancel` (también la del comensal) | TK-08 | ESC-7 (DP-19) |
| T11 `POST /table-sessions/:id/add-payment` | TK-08 | Los cobros de otra tablet; reproduce O2 |
| T14 `PATCH /table-sessions/close/:id` | TK-08 | SEG-c3 lo necesita antes que TK-13; reproduce O3 |
| `PUT /table-sessions/:id/request-help` | TK-08 | ESC-4 y O1 (DP-50) |
| T12 `POST /table-sessions/:id/pay` | TK-13 | SEG-c2; después, TK-15; reproduce O2 |
| T13 `DELETE /payments/in-person-requests/:requestId` e `in-person-payment-request-deleted` | TK-13 | La eliminación desde otra tablet; después, TK-15 |

Ningún ticket de Frontend usa contra la réplica un endpoint antes de que lo construya un ticket de Backend del que depende. TK-05 escucha `in-person-payment-request-deleted` antes de TK-13, pero sus criterios no lo piden contra la réplica.

**Huecos del contrato:** el contexto no fija el cuerpo de `POST /orders`, `/join` y `request-help` (ni si `PUT /orders/:id/confirm` lleva uno), las respuestas de `/auth/guest`, `/join`, `POST /orders`, `confirm` e `in-person-request`, el payload completo de `order-confirmed-notification` (solo que se lee `data` y después `data.body`, con `confirmedAt`), los códigos de los rechazos de negocio (mandar a cocina un pedido cancelado, cerrar una sesión ya cerrada) ni cómo `request-help` comprueba que el comensal sea de la sesión. Los resuelve con el humano el ticket que construye cada uno, sin leer el código de Tabbie.

## Decisiones tomadas (2026-11-18)

Fuente: decisión del humano en la segunda revisión de la réplica. La baja a [0010](../../adr/0010-replica-propia-desde-el-contrato.md) y a [seguridad.md](../../architecture/seguridad.md#43-criterios-nuevos).

- **DP-54 · Recortar SEG-c1 y SEG-c3:** T04 (`GET /table-sessions/:id/orders`), T10 (`PUT /table-sessions/:id/attend`) y T18 (`GET /table-sessions/:id/subscribe`) no se construyen, y DP-49 vuelve a regir sin excepción. SEG-c1 y SEG-c3 se recortan a lo que la app usa: SEG-c1 comprueba con T05 que la ayuda no se apaga, y SEG-c3, que T14 cierra una sesión sin JWT. El texto nuevo de los dos criterios lo aprobó el humano. Los tres endpoints siguen documentados en el contexto como huecos de Tabbie, y la descripción de O1 y O3 en la [sección 3 de seguridad.md](../../architecture/seguridad.md#3-riesgos-aceptados) no cambia; su línea "Comprobación" dice qué parte de cada hueco se reproduce. La réplica diverge a propósito en `/attend`: en Tabbie responde 500, y en la réplica no existe, porque la app no lo llama (C7). Ajusta DP-36: SEG-c3 ya no usa una cuenta de comensal, y la de comensal sin restaurante solo la usa SEG-c4. Afecta a TK-02 y TK-08.

## Decisiones pendientes

Ninguna. Las que quedaban se cerraron con DP-36 a DP-44.
