# Walking skeleton: Tabbie Waiter App

> La épica facilitadora que conecta de punta a punta la app, la réplica del backend y el simulador de comensales: inicio de sesión, eventos en tiempo real, consulta periódica, aviso sin conexión, reconexión y recuperación después de un corte. Es el skeleton delgado que decidió la revisión de la Entrega 1 (DP-04). Las historias del backlog usan esta base y no la construyen (backlog, "Reglas para el corte").
>
> La base son las [decisiones de arquitectura](../adr/README.md), la [vista general](README.md), los [componentes](componentes.md), el [PRD](../prd/tabbie-waiter-mvp.md), el [documento de contexto](../context/panel-mozos-actual.md) y el [backlog](../backlog/README.md).

**Referencias:** las mismas que en los ADRs. Un número de cuatro cifras remite a un ADR; "PRD", "contexto" y "backlog" remiten a esos tres documentos; los IDs (RF-n, RNF-n, M-n, Cn, Tnn, On, HU-nn) son los de cada documento. Los escenarios del simulador (ESC-n) son los de [componentes.md](componentes.md), sección 3.

**No es una historia del backlog.** No tiene usuario ni un valor que el mozo observe por sí solo. Va antes del lote 1 del backlog (backlog, "Orden del backlog"), y sus puntos no cuentan en la estimación de las historias (backlog, "Cómo se lee el backlog").

## 1. Objetivo

Dejar probado, contra la réplica, que la app recibe y mantiene al día el estado del salón en los tiempos de RNF-1 y RNF-2, que avisa y se recupera de un corte como pide RNF-4, y que nunca repite sola una acción que cambia datos (RNF-6). La reconexión, el aviso y el cliente sin reintentos se prueban como lógica de la app, con MockWebServer (DP-04). Una vez hecho esto, cada historia se ocupa solo de su pantalla y de sus reglas.

## 2. Alcance

- **Arranque e inicio de sesión:**
  - la app arranca contra la réplica local;
  - inicia sesión con una cuenta de prueba de mozo: email y contraseña en Firebase y canje por el JWT del backend (0004). Es lo mínimo de HU-01, sin sus huecos;
  - muestra las mesas activas de su restaurante en una lista sin diseño. Es lo mínimo de HU-02.
- **Eventos:** una sola conexión a `/sse/waiters` para los tres eventos (0006), con el JWT en el encabezado `Authorization: Bearer` (0008) y su reconexión.
- **Consulta periódica:** de mesas, solicitudes y cobros (T05, T06 y T07), cada menos de 30 s, y un sondeo cada 5 s o menos para detectar los cortes (0006). Los valores: el sondeo corre cada 5 s con las mesas activas (T05) y hace también de consulta periódica de las mesas; las solicitudes y los cobros se consultan cada 15 s y siempre al reconectar (DP-25).
- **Cortes (RNF-4):** el aviso de que no hay conexión, sin diseño, y la recuperación después de un corte: al volver la comunicación, la app actualiza mesas, solicitudes y cobros sin que el mozo haga nada. Se prueban como lógica de la app, con MockWebServer en lugar de la réplica, no con cortes reales (DP-04; sección 4).
- **Cliente HTTP:** no reintenta las acciones que cambian datos, ni por cuenta de la app ni por los reintentos automáticos del cliente (RNF-6, 0007). Es un solo cliente, sin reintentos automáticos, también para las consultas: la próxima consulta periódica es el reintento (DP-27). Da una acción por "sin respuesta" a los **10 s**, y una consulta a los **4 s**, así un corte se detecta antes de los 5 s de RNF-4 (DP-26). También se prueba con MockWebServer.
- **Registro de diagnóstico:** la app anota cada cambio de su estado, para poder medir (sección 4).
- **Réplica:** arranca con sus datos iniciales, SQL propio en `replica/datos-iniciales/` que carga un servicio de Compose cuando terminaron las migraciones de la réplica (0002, DP-16, DP-51). El skeleton usa el restaurante 1 y su primer mozo.
- **Simulador:** el escenario mínimo que genera los cambios que miden los criterios: ocupar una mesa (ESC-1), confirmar un pedido (ESC-2) y pedir un cobro presencial (ESC-5), con el comensal como invitado (`POST /auth/guest`, DP-17) y unido a la mesa con `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber` (DP-18).

## 3. Fuera del alcance

### Lo que es de una historia

- **Pantallas completas:** "Órdenes", "Pagos", la impresora virtual, la navegación principal con sus indicadores y el diseño del inicio de sesión.
- **Acciones del mozo:** mandar a cocina, cancelar, cobrar, confirmar o eliminar una solicitud, cerrar una mesa y "Atendido". El skeleton prueba el cliente HTTP de las acciones sin pantalla (WS-c11).
- **Avisos que ve el mozo:** el aviso y el sonido de pedido confirmado, el contador que parpadea y el indicador de solicitudes. El único aviso del skeleton es el de que no hay conexión, sin diseño.
- **Cobros:** cómo se listan, se agrupan y se muestran.
- **Huecos de HU-01:** credenciales incorrectas, rechazo de quien no es mozo, sesión después de un reinicio y renovación que falla.

### Lo que pasa a la ampliación (DP-04)

La revisión de la Entrega 1 pidió un skeleton más delgado, para ver antes una pantalla funcionando. Esto pasa a la ampliación del backlog (backlog, "Orden del backlog"), junto con los criterios que lo necesitan (sección 5.2):

| Qué | Por qué puede esperar | Criterios |
|---|---|---|
| **Los cortes de punta a punta con Toxiproxy** | La reconexión, el aviso y la recuperación ya se prueban en el skeleton como lógica de la app, con MockWebServer. Los cortes reales entre la app y la réplica confirman lo mismo con todas las piezas, y los pide M-2. | WS-c8 |
| **La renovación del JWT** | El JWT de mozo dura 16 h por defecto (`JWT_EXPIRATION_WAITERS`; contexto, C1), así que un turno no la necesita. Va primero en la ampliación, con la renovación de HU-01. | WS-c10 |
| **El segundo mozo** | Solo hace falta para los cobros "de otra tablet" y para las pruebas con dos tablets. | WS-c4, WS-c8 |
| **El otro restaurante** | Solo hace falta para el aislamiento por restaurante (RNF-7), que verifican las historias. | — |
| **ESC-4, pedir ayuda** | El pedido de ayuda llega por la consulta periódica, que el skeleton ya prueba con ESC-1. | WS-c4 |
| **MercadoPago** | Las solicitudes de MercadoPago no emiten evento y llegan por la consulta periódica; las historias que las muestran van en la ampliación (HU-13). | WS-c4 |

## 4. Cómo se mide

- **Dos formas de prueba:**
  - **contra la réplica:** WS-c1, WS-c2 y WS-c3, con la app en un emulador y el simulador, sin Toxiproxy;
  - **con MockWebServer:** WS-c5, WS-c6, WS-c7, WS-c9 y WS-c11, en pruebas de la app donde MockWebServer hace de réplica (DP-04). Así la reconexión y el cliente se prueban como lógica de la app, sin cortes reales.
- **Un solo reloj:** las mediciones contra la réplica se hacen en un emulador que corre en la misma máquina que la réplica y el simulador, así todos usan el reloj de esa máquina. Las pruebas con MockWebServer usan el reloj del proceso de la prueba. La tablet física no se usa para medir el skeleton; queda para las pruebas manuales de las historias.
- **Desde cuándo:**
  - **acción del comensal:** la hora en que el simulador manda la petición, según su registro del turno (componentes.md, sección 3);
  - **corte:** la hora en que la prueba corta o restablece la comunicación en MockWebServer;
  - **reinicio de la réplica (WS-c9):** la hora en que MockWebServer vuelve a aceptar conexiones en el mismo puerto.
- **Hasta cuándo:** la hora en que el cambio entra en el estado de la app, según el registro de diagnóstico.
- **Registro de diagnóstico:**
  - Anota, por cada cambio del estado, la hora, qué cambió (mesa, pedido, solicitud, cobro o conexión, por su ID y con cantidades) y de dónde vino: un evento, la consulta periódica o la actualización al reconectar.
  - También anota la apertura y el cierre de la conexión de eventos, con la respuesta de la réplica y el vencimiento del JWT con que se abrió, y la aparición y desaparición del aviso de que no hay conexión.
  - No anota el JWT, la URL del stream, emails, nombres de comensales ni tokens de MercadoPago (O4; PA-6 de [seguridad.md](seguridad.md#21-de-la-app)).
  - Se lee desde la máquina, sin pantalla.
- **Estado, no pantalla:** los criterios del skeleton verifican el estado de la app. Las historias verifican lo que ve el mozo en sus pantallas (sección 7).
- **Repeticiones:** cada criterio con un tiempo se repite la cantidad de veces que indica, y pasa solo si todas las repeticiones cumplen; no se promedia.
- **Cortes con MockWebServer (DP-04):** los criterios conservan su texto, que nombra a Toxiproxy y a la réplica. En el skeleton delgado se leen así:
  - **"Toxiproxy corta la comunicación"** es la prueba cortando MockWebServer, con las dos formas que nombra RNF-4:
    - **sin red:** MockWebServer rechaza las conexiones nuevas y cierra las abiertas;
    - **el sistema no responde:** MockWebServer acepta las conexiones, pero no devuelve datos.
  - **"La réplica se detiene y vuelve a arrancar"** (WS-c9) es MockWebServer detenido y vuelto a levantar en el mismo puerto. El pedido que "el simulador confirma después" es un evento que MockWebServer emite.
  - **WS-c11:** "retiene la respuesta" es MockWebServer que recibe la petición y no responde; "cierra la conexión sin devolver la respuesta" es MockWebServer que la recibe y se desconecta. "Lo pagado … subió $100 una sola vez" se comprueba como "MockWebServer recibió una sola petición de T11".
- **Cortes con Toxiproxy (0002, 0003), en la ampliación:** WS-c8 corta de verdad entre la app y la réplica. El simulador y Firebase no pasan por Toxiproxy. Las dos formas de corte son las mismas: **sin red**, Toxiproxy rechaza las conexiones nuevas y cierra las abiertas; **el sistema no responde**, Toxiproxy deja las conexiones abiertas, pero no pasa datos. El script de la prueba los activa por la API de Toxiproxy; el simulador no la controla (DP-20).

## 5. Criterios de aceptación

| Criterio | Lugar |
|---|---|
| WS-c1 · La app arranca contra la réplica | Skeleton, contra la réplica |
| WS-c2 · Un pedido confirmado llega por evento | Skeleton, contra la réplica |
| WS-c3 · Una solicitud de cobro presencial llega por evento | Skeleton, contra la réplica |
| WS-c4 · Los cambios que no emiten evento llegan por la consulta periódica | Ampliación: usa ESC-4, el segundo mozo y MercadoPago |
| WS-c5 · Aviso de que no hay conexión | Skeleton, con MockWebServer |
| WS-c6 · Un corte corto no muestra el aviso | Skeleton, con MockWebServer |
| WS-c7 · Recuperación después de un corte | Skeleton, con MockWebServer |
| WS-c8 · Lo emitido durante un corte aparece después | Ampliación: corte real con Toxiproxy y el segundo mozo |
| WS-c9 · La app se reconecta sola después de un reinicio de la réplica | Skeleton, con MockWebServer |
| WS-c10 · Al renovar el JWT, la conexión de eventos sigue con el nuevo | Ampliación: renovación del JWT |
| WS-c11 · Una acción que cambia datos y no responde no se repite | Skeleton, con MockWebServer |

**La consulta periódica en el lote 1:** con WS-c4 en la ampliación, el skeleton deja la consulta periódica sin un criterio propio. La comprueba HU-02.h1 en el lote 1, sobre "Órdenes", con ESC-1.

### 5.1 Criterios del skeleton

**WS-c1 · La app arranca contra la réplica** (0002, 0004, 0006; HU-01 y HU-02, lo mínimo)

- **Dado** que la réplica corre con sus datos iniciales, y el restaurante 1 tiene dos mesas ocupadas
- **Cuando** la app arranca e inicia sesión con la cuenta de prueba del primer mozo del restaurante 1
- **Entonces** la app muestra en su lista sin diseño las dos mesas que devuelve la réplica para el restaurante 1
- **Y** el registro anota la conexión de eventos abierta y la primera consulta de mesas, solicitudes y cobros

**WS-c2 · Un pedido confirmado llega por evento** (RNF-1, 0006)

- **Dado** que la app inició sesión y hay comunicación
- **Cuando** el simulador confirma un pedido en una mesa del restaurante 1 (ESC-2)
- **Entonces** el pedido está en el estado de la app en 2 s o menos desde que el simulador mandó la confirmación
- **Y** el registro indica que llegó por un evento, no por la consulta periódica
- Se repite 20 veces.

**WS-c3 · Una solicitud de cobro presencial llega por evento** (RNF-1, 0006)

- **Dado** que la app inició sesión y hay comunicación
- **Cuando** el simulador pide un cobro presencial en una mesa del restaurante 1 (ESC-5)
- **Entonces** la solicitud está en el estado de la app en 2 s o menos desde que el simulador la pidió
- **Y** el registro indica que llegó por un evento
- Se repite 20 veces.

**WS-c5 · Aviso de que no hay conexión** (RNF-4, 0006)

- **Dado** que la app inició sesión y hay comunicación
- **Cuando** Toxiproxy corta la comunicación, de cualquiera de las dos formas (sección 4)
- **Entonces** el aviso de que no hay conexión aparece no antes de los 5 s ni después de los 7 s desde el corte
- Se repite 5 veces con cada forma de corte.

**WS-c6 · Un corte corto no muestra el aviso** (RNF-4)

- **Dado** que la app inició sesión y hay comunicación
- **Cuando** Toxiproxy corta la comunicación durante 3 s, de cualquiera de las dos formas, y la restablece
- **Entonces** el aviso de que no hay conexión no aparece
- Se repite 5 veces con cada forma de corte.

**WS-c7 · Recuperación después de un corte** (RNF-4, 0006)

- **Dado** que la app muestra el aviso de que no hay conexión, después de un corte de 20 s de cualquiera de las dos formas
- **Cuando** Toxiproxy restablece la comunicación
- **Entonces** en 5 s o menos desde que se restableció, el registro anota mesas, solicitudes y cobros actualizados, la conexión de eventos abierta y el aviso quitado
- **Y** nadie tocó la app
- Se repite 5 veces con cada forma de corte.

**WS-c9 · La app se reconecta sola después de un reinicio de la réplica** (RNF-1, RNF-4, 0006; contexto, sección 5)

- **Dado** que la app inició sesión y tiene la conexión de eventos abierta
- **Cuando** la réplica se detiene, queda detenida 60 s y vuelve a arrancar
- **Entonces** la app muestra el aviso de que no hay conexión mientras la réplica está detenida
- **Y** en 5 s o menos desde que la réplica terminó de arrancar, el registro anota mesas, solicitudes y cobros actualizados, la conexión de eventos abierta y el aviso quitado
- **Y** un pedido que el simulador confirma después llega por evento en 2 s o menos
- Se repite 3 veces.

**WS-c11 · Una acción que cambia datos y no responde no se repite** (RNF-6, 0007; M-2)

- **Dado** que una mesa del restaurante 1 tiene saldo pendiente
- **Cuando** una prueba de la app, sin pantalla, pide al cliente HTTP un cobro manual de $100 en esa mesa (T11), y Toxiproxy deja llegar la petición a la réplica y después:
  - retiene la respuesta, o
  - cierra la conexión sin devolver la respuesta
- **Entonces** lo pagado de la mesa, consultado desde la máquina directo a la réplica, subió $100 una sola vez
- **Y** el registro anota una sola petición enviada, y la acción terminada como "sin respuesta" a los 10 s (si se retuvo la respuesta) o como fallida (si se cerró la conexión)
- **Y** antes de dar la acción por terminada, la app actualizó mesas y solicitudes
- Se repite 10 veces con cada forma.

### 5.2 Criterios que pasan a la ampliación

Conservan su texto y su ID. Se cumplen en la ampliación, con la renovación (backlog, "Orden del backlog").

**WS-c4 · Los cambios que no emiten evento llegan por la consulta periódica** (RNF-2, 0006; contexto, sección 5)

- **Dado** que la app inició sesión y hay comunicación
- **Cuando** el simulador hace uno de estos cambios:
  - ocupa una mesa libre (ESC-1);
  - pide ayuda en una mesa (ESC-4);
  - registra un cobro manual con la cuenta del segundo mozo del restaurante 1;
  - crea una solicitud de MercadoPago, escrita directo en Redis
- **Entonces** el cambio está en el estado de la app en 30 s o menos desde que el simulador lo hizo
- **Y** el registro indica que llegó por la consulta periódica
- Cada cambio se repite 10 veces, en distintos momentos del intervalo de la consulta periódica.

**WS-c8 · Lo emitido durante un corte aparece después** (RNF-4, 0006; contexto, sección 5)

- **Dado** que Toxiproxy cortó la comunicación
- **Cuando**, durante el corte, el simulador confirma un pedido, pide un cobro presencial y registra un cobro con la cuenta del segundo mozo, y después Toxiproxy restablece la comunicación
- **Entonces** el pedido, la solicitud y el cobro están en el estado de la app en 5 s o menos desde que se restableció
- **Y** el registro indica que llegaron por la actualización al reconectar
- Se repite 5 veces con cada forma de corte.

**WS-c10 · Al renovar el JWT, la conexión de eventos sigue con el nuevo** (0004, 0006; C1)

- **Dado** que la réplica corre con un vencimiento corto del JWT de los mozos, de 3 minutos
- **Cuando** la app renueva el JWT antes de que venza
- **Entonces** el registro anota que la conexión de eventos se reabrió con el JWT nuevo, por su vencimiento
- **Y** un pedido que el simulador confirma en ese momento llega por evento en 2 s o menos
- **Y** si, después de que venció el primer JWT, Toxiproxy corta la conexión de eventos, la app la reabre sin que la réplica responda 401, y el próximo pedido confirmado llega por evento en 2 s o menos
- Se repite durante 3 renovaciones seguidas.

## 6. Riesgos técnicos

### 6.1 Los que despeja el skeleton

El skeleton los despeja primero, antes de medir los criterios. Cada uno dice qué criterio lo cubre.

| Riesgo | Por qué importa | Cómo se despeja | Criterio |
|---|---|---|---|
| **Un stream caído sin heartbeat** | Sin heartbeat, un stream que dejó de recibir datos no da error (contexto, sección 5). Con el corte "el sistema no responde", la app podría creer que la conexión sigue viva y perder eventos sin enterarse. | Probar con MockWebServer que, cuando el sondeo detecta un corte, la conexión de eventos se trata como caída y se reabre al volver la comunicación, aunque no haya dado error. | WS-c5, WS-c7 |
| **La espera creciente de la reconexión no tiene tope** | 0006 pide reabrir con espera creciente, pero sin un tope. Después de un reinicio de 60 s, la próxima espera puede pasar los 5 s de RNF-4. | Fijar un tope de la espera, o reabrir la conexión apenas el sondeo detecta que volvió la comunicación, sin esperar al próximo intento. | WS-c9 |
| **El JWT del stream** | La URL con el token puede terminar en un registro. | El JWT va en el encabezado `Authorization`, que el backend lee antes que el query param ([0008](../adr/0008-jwt-del-stream-en-el-encabezado.md); DP-28), y se comprueba contra la réplica al abrir la conexión de eventos. El registro de diagnóstico no anota la URL del stream. Reabrir con el JWT renovado es de la ampliación (sección 6.2). | WS-c1 |
| **Los reintentos automáticos del cliente HTTP** | Por defecto, el cliente HTTP reenvía por su cuenta algunas peticiones cuando se corta la conexión, aunque cambien datos (0007). Un cobro se registraría dos veces sin que la app lo sepa. | Desactivarlos en el cliente de las acciones y comprobar el efecto en el servidor, no en la app: MockWebServer cuenta las peticiones que recibió. | WS-c11 |
| **Unirse a la mesa y autenticar al comensal** | El contexto no nombra el endpoint con que el comensal se une a la mesa. Sin esto no hay ESC-1. | El comensal entra como invitado, con `POST /auth/guest` (DP-17), y se une con `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber` (DP-18) ([componentes.md](componentes.md#decisiones-tomadas-2026-11-14)). La réplica los construye como los describe el contexto (DP-48), y TK-03 prueba que, con ese invitado, ESC-1 ocupa la mesa. | WS-c1 |
| **El reloj del emulador** | La medición de 2 s supone que el emulador y la máquina usan el mismo reloj. | Comparar la hora del emulador con la de la máquina antes de medir. | WS-c2, WS-c3 |

El riesgo "La réplica no arranca sin las variables de MercadoPago ni de almacenamiento de archivos" lo cerró DP-48: la réplica propia no tiene esos módulos ([0010](../adr/0010-replica-propia-desde-el-contrato.md)).

### 6.2 Los que pasan a la ampliación

| Riesgo | Por qué importa | Cómo se despeja | Criterio |
|---|---|---|---|
| **Reabrir la conexión de eventos con el JWT vigente** | La réplica rechaza un JWT vencido con 401 antes de abrir el stream (C1). Si la app reabre con el JWT viejo, queda sin eventos o reintenta en vano. | Reabrir siempre con el JWT vigente, también después de un corte. | WS-c10 |
| **El pedido de ayuda del invitado** | El pedido de ayuda revisa que el comensal pertenezca a la sesión de mesa. | Probar contra la réplica que, con el invitado unido a la mesa, ESC-4 pide ayuda. | WS-c4 |
| **La solicitud de MercadoPago escrita a mano** | Se escribe directo en Redis, con la clave y el `requestId` que documenta el contexto, y vence a los 60 s (contexto, sección 3.3). Si el formato no coincide con el que lee la réplica, no la devuelve en T06. En las pruebas no se usa la API de MercadoPago (DP-23). | Comprobar que T06 de la réplica devuelve la solicitud escrita con el formato del contexto, y medir dentro de los 60 s. | WS-c4 |

## 7. Lo que las historias verifican sobre esta base

Los criterios del skeleton verifican el estado de la app. Las historias verifican lo mismo en sus pantallas, sin volver a construir el canal, la consulta periódica ni la recuperación:

| Criterio del skeleton | Criterios de las historias que lo muestran en pantalla |
|---|---|
| WS-c2 | HU-03.h1 (ampliación) |
| WS-c3 | HU-06.h1 |
| WS-c4 (ampliación) | HU-02.h1, HU-10.h5, HU-13.h1 (antes HU-06.h2) |
| WS-c5, WS-c7 | HU-02.h6, HU-01.h4 (ampliación) |
| WS-c8 (ampliación) | HU-03.h6, HU-06.h5 |
| WS-c11 | HU-04.h1, HU-05.h5, HU-07.h1, HU-08.h3 |

HU-02.h1 es además la que comprueba, en el lote 1, la consulta periódica que WS-c4 deja para la ampliación (sección 5).

## 8. Hecho cuando

- Los ocho criterios de la sección 5.1 pasan: WS-c1, WS-c2 y WS-c3 contra la réplica en el entorno local que describe [infraestructura.md](infraestructura.md), y los demás con MockWebServer, con el registro de diagnóstico de cada corrida como evidencia.
- Los riesgos técnicos de la sección 6.1 están despejados.
- El lote 1 puede empezar por HU-02 sin construir nada de lo que lista el alcance.
- Los criterios de la sección 5.2 y los riesgos de la sección 6.2 se cumplen en la ampliación.
