# Walking skeleton: Tabbie Waiter App

> La épica facilitadora que conecta de punta a punta la app, la réplica del backend y el simulador de comensales: inicio de sesión, eventos en tiempo real, consulta periódica, aviso sin conexión, reconexión y recuperación después de un corte. Las historias del backlog usan esta base y no la construyen (backlog, "Reglas para el corte").
>
> La base son las [decisiones de arquitectura](../adr/README.md), la [vista general](README.md), los [componentes](componentes.md), el [PRD](../prd/tabbie-waiter-mvp.md), el [documento de contexto](../context/panel-mozos-actual.md) y el [backlog](../backlog/README.md).

**Referencias:** las mismas que en los ADRs. Un número de cuatro cifras remite a un ADR; "PRD", "contexto" y "backlog" remiten a esos tres documentos; los IDs (RF-n, RNF-n, M-n, Cn, Tnn, On, HU-nn) son los de cada documento. Los escenarios del simulador (ESC-n) son los de [componentes.md](componentes.md), sección 3.

**No es una historia del backlog.** No tiene usuario ni un valor que el mozo observe por sí solo. Va antes de HU-01 en el orden del backlog, y sus puntos no cuentan en la estimación de las historias (backlog, "Cómo se lee el backlog").

## 1. Objetivo

Dejar probado, contra la réplica y con cortes provocados, que la app recibe y mantiene al día el estado del salón en los tiempos de RNF-1, RNF-2 y RNF-4, y que nunca repite sola una acción que cambia datos (RNF-6). Una vez hecho esto, cada historia se ocupa solo de su pantalla y de sus reglas.

## 2. Alcance

- **Arranque e inicio de sesión:**
  - la app arranca contra la réplica, con la URL base apuntando a Toxiproxy (0003);
  - inicia sesión con una cuenta de prueba de mozo: email y contraseña en Firebase y canje por el JWT del backend (0004). Es lo mínimo de HU-01, sin sus huecos;
  - renueva el JWT volviendo a canjear, solo en lo que afecta a la conexión de eventos (0004). El comportamiento que ve el mozo al renovar, o cuando la renovación falla, es de HU-01;
  - muestra las mesas activas de su restaurante en una lista sin diseño. Es lo mínimo de HU-02.
- **Eventos:** una sola conexión a `/sse/waiters` para los tres eventos (0006), con su reconexión.
- **Consulta periódica:** de mesas, solicitudes y cobros (T05, T06 y T07), cada menos de 30 s, y un sondeo cada 5 s o menos para detectar los cortes (0006).
- **Cortes (RNF-4):** el aviso de que no hay conexión, sin diseño, y la recuperación después de un corte: al volver la comunicación, la app actualiza mesas, solicitudes y cobros sin que el mozo haga nada.
- **Cliente HTTP:** no reintenta las acciones que cambian datos, ni por cuenta de la app ni por los reintentos automáticos del cliente (RNF-6, 0007). Da una acción por "sin respuesta" a los **10 s**.
- **Registro de diagnóstico:** la app anota cada cambio de su estado, para poder medir (sección 4).
- **Réplica:** arranca con sus datos iniciales: dos restaurantes, dos mozos en el primero y uno en el segundo (0002; backlog, "Comportamientos entre tablets").
- **Simulador:** el escenario mínimo que genera los cambios que miden los criterios:
  - ocupar una mesa (ESC-1), confirmar un pedido (ESC-2), pedir ayuda (ESC-4) y pedir un cobro presencial (ESC-5);
  - registrar un cobro con la cuenta del segundo mozo del restaurante, como si fuera otra tablet;
  - crear una solicitud de MercadoPago escribiéndola directo en Redis, con el formato que usa la copia (`mp-<userId>-<sessionId>-<timestamp>`, contexto, sección 3.3). Así no se toca el código de la réplica (0002).

## 3. Fuera del alcance

Todo lo que es de una historia:

- **Pantallas completas:** "Órdenes", "Pagos", la impresora virtual, la navegación principal con sus indicadores y el diseño del inicio de sesión.
- **Acciones del mozo:** mandar a cocina, cancelar, cobrar, confirmar o eliminar una solicitud, cerrar una mesa y "Atendido". El skeleton prueba el cliente HTTP de las acciones sin pantalla (WS-c11).
- **Avisos que ve el mozo:** el aviso y el sonido de pedido confirmado, el contador que parpadea y el indicador de solicitudes. El único aviso del skeleton es el de que no hay conexión, sin diseño.
- **Cobros:** cómo se listan, se agrupan y se muestran.
- **Huecos de HU-01:** credenciales incorrectas, rechazo de quien no es mozo, sesión después de un reinicio y renovación que falla.

## 4. Cómo se mide

- **Un solo reloj:** las mediciones se hacen en un emulador que corre en la misma máquina que la réplica, el simulador y Toxiproxy, así todos usan el reloj de esa máquina. La tablet física no se usa para medir el skeleton; queda para las pruebas manuales de las historias.
- **Desde cuándo:**
  - **acción del comensal o de otra tablet:** la hora en que el simulador manda la petición, según su registro del turno (componentes.md, sección 3);
  - **corte:** la hora en que se corta o se restablece la comunicación desde la API de Toxiproxy;
  - **reinicio de la réplica:** la hora en que la réplica anota en su salida que terminó de arrancar.
- **Hasta cuándo:** la hora en que el cambio entra en el estado de la app, según el registro de diagnóstico.
- **Registro de diagnóstico:**
  - Anota, por cada cambio del estado, la hora, qué cambió (mesa, pedido, solicitud, cobro o conexión, por su ID y con cantidades) y de dónde vino: un evento, la consulta periódica o la actualización al reconectar.
  - También anota la apertura y el cierre de la conexión de eventos, con la respuesta de la réplica y el vencimiento del JWT con que se abrió, y la aparición y desaparición del aviso de que no hay conexión.
  - No anota el JWT, la URL del stream, emails, nombres de comensales ni tokens de MercadoPago (O4; ADRs, "Decisiones pendientes").
  - Se lee desde la máquina, sin pantalla.
- **Estado, no pantalla:** los criterios del skeleton verifican el estado de la app. Las historias verifican lo que ve el mozo en sus pantallas (sección 7).
- **Repeticiones:** cada criterio con un tiempo se repite la cantidad de veces que indica, y pasa solo si todas las repeticiones cumplen; no se promedia.
- **Cortes con Toxiproxy (0002, 0003):** entre la app y la réplica. El simulador y Firebase no pasan por Toxiproxy. Hay dos formas de corte, las dos que nombra RNF-4:
  - **sin red:** Toxiproxy rechaza las conexiones nuevas y cierra las abiertas;
  - **el sistema no responde:** Toxiproxy deja las conexiones abiertas, pero no pasa datos.

## 5. Criterios de aceptación

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

**WS-c8 · Lo emitido durante un corte aparece después** (RNF-4, 0006; contexto, sección 5)

- **Dado** que Toxiproxy cortó la comunicación
- **Cuando**, durante el corte, el simulador confirma un pedido, pide un cobro presencial y registra un cobro con la cuenta del segundo mozo, y después Toxiproxy restablece la comunicación
- **Entonces** el pedido, la solicitud y el cobro están en el estado de la app en 5 s o menos desde que se restableció
- **Y** el registro indica que llegaron por la actualización al reconectar
- Se repite 5 veces con cada forma de corte.

**WS-c9 · La app se reconecta sola después de un reinicio de la réplica** (RNF-1, RNF-4, 0006; contexto, sección 5)

- **Dado** que la app inició sesión y tiene la conexión de eventos abierta
- **Cuando** la réplica se detiene, queda detenida 60 s y vuelve a arrancar
- **Entonces** la app muestra el aviso de que no hay conexión mientras la réplica está detenida
- **Y** en 5 s o menos desde que la réplica terminó de arrancar, el registro anota mesas, solicitudes y cobros actualizados, la conexión de eventos abierta y el aviso quitado
- **Y** un pedido que el simulador confirma después llega por evento en 2 s o menos
- Se repite 3 veces.

**WS-c10 · Al renovar el JWT, la conexión de eventos sigue con el nuevo** (0004, 0006; C1)

- **Dado** que la réplica corre con un vencimiento corto del JWT de los mozos, de 3 minutos
- **Cuando** la app renueva el JWT antes de que venza
- **Entonces** el registro anota que la conexión de eventos se reabrió con el JWT nuevo, por su vencimiento
- **Y** un pedido que el simulador confirma en ese momento llega por evento en 2 s o menos
- **Y** si, después de que venció el primer JWT, Toxiproxy corta la conexión de eventos, la app la reabre sin que la réplica responda 401, y el próximo pedido confirmado llega por evento en 2 s o menos
- Se repite durante 3 renovaciones seguidas.

**WS-c11 · Una acción que cambia datos y no responde no se repite** (RNF-6, 0007; M-2)

- **Dado** que una mesa del restaurante 1 tiene saldo pendiente
- **Cuando** una prueba de la app, sin pantalla, pide al cliente HTTP un cobro manual de $100 en esa mesa (T11), y Toxiproxy deja llegar la petición a la réplica y después:
  - retiene la respuesta, o
  - cierra la conexión sin devolver la respuesta
- **Entonces** lo pagado de la mesa, consultado desde la máquina directo a la réplica, subió $100 una sola vez
- **Y** el registro anota una sola petición enviada, y la acción terminada como "sin respuesta" a los 10 s (si se retuvo la respuesta) o como fallida (si se cerró la conexión)
- **Y** antes de dar la acción por terminada, la app actualizó mesas y solicitudes
- Se repite 10 veces con cada forma.

## 6. Riesgos técnicos

El skeleton los despeja primero, antes de medir los criterios. Cada uno dice qué criterio lo cubre.

| Riesgo | Por qué importa | Cómo se despeja | Criterio |
|---|---|---|---|
| **La réplica no arranca sin las variables de MercadoPago ni de almacenamiento de archivos** | La copia no se modifica (0002), y trae módulos que el flujo del mozo no usa, como MercadoPago y la subida de archivos (componentes.md, sección 2). Si piden sus variables al arrancar, la réplica no levanta. | Arrancar la réplica con esas variables vacías o con valores de mentira, y confirmar que ningún endpoint de la cadena del mozo ni del simulador las usa. | WS-c1 |
| **Un stream caído sin heartbeat** | Sin heartbeat, un stream que dejó de recibir datos no da error (contexto, sección 5). Con el corte "el sistema no responde", la app podría creer que la conexión sigue viva y perder eventos sin enterarse. | Probar que, cuando el sondeo detecta un corte, la conexión de eventos se trata como caída y se reabre al volver la comunicación, aunque no haya dado error. | WS-c5, WS-c7 |
| **La espera creciente de la reconexión no tiene tope** | 0006 pide reabrir con espera creciente, pero sin un tope. Después de un reinicio de 60 s, la próxima espera puede pasar los 5 s de RNF-4. | Fijar un tope de la espera, o reabrir la conexión apenas el sondeo detecta que volvió la comunicación, sin esperar al próximo intento. | WS-c9 |
| **El JWT en la URL del stream** | La réplica rechaza un JWT vencido con 401 antes de abrir el stream (C1). Si la app reabre con el JWT viejo, queda sin eventos o reintenta en vano. Además, la URL lleva el token y puede terminar en un registro. | Reabrir siempre con el JWT vigente, también después de un corte. El registro de diagnóstico no anota la URL del stream. Comprobar contra la réplica si el stream acepta el JWT en el encabezado `Authorization`, que el backend también lee (contexto, sección 0; ADRs, "Decisiones pendientes"). | WS-c10 |
| **Los reintentos automáticos del cliente HTTP** | Por defecto, el cliente HTTP reenvía por su cuenta algunas peticiones cuando se corta la conexión, aunque cambien datos (0007). Un cobro se registraría dos veces sin que la app lo sepa. | Desactivarlos en el cliente de las acciones y comprobar el efecto en la réplica, no en la app. | WS-c11 |
| **Unirse a la mesa y autenticar al comensal** | El contexto no nombra el endpoint con que el comensal se une a la mesa, y el pedido de ayuda revisa que el comensal pertenezca a la sesión de mesa (componentes.md, "Decisiones pendientes"). Tampoco está decidido si el comensal se autentica con una cuenta o como invitado. Sin esto no hay ESC-1 ni ESC-4. | Probar contra la copia el endpoint que usa su código para unirse a la mesa y decidir cómo se autentica el comensal. | WS-c4 |
| **La solicitud de MercadoPago escrita a mano** | Se escribe directo en Redis, con un formato que la copia genera en su código, y vence a los 60 s (contexto, sección 3.3). Si el formato no coincide, la réplica no la devuelve en T06. | Comparar la solicitud escrita con una generada por la copia, y medir dentro de los 60 s. | WS-c4 |
| **El reloj del emulador** | La medición de 2 s supone que el emulador y la máquina usan el mismo reloj. | Comparar la hora del emulador con la de la máquina antes de medir. | WS-c2, WS-c3 |

## 7. Lo que las historias verifican sobre esta base

Los criterios del skeleton verifican el estado de la app. Las historias verifican lo mismo en sus pantallas, sin volver a construir el canal, la consulta periódica ni la recuperación:

| Criterio del skeleton | Criterios de las historias que lo muestran en pantalla |
|---|---|
| WS-c2 | HU-03.h1 |
| WS-c3 | HU-06.h1 |
| WS-c4 | HU-02.h1, HU-10.h5, HU-06.h2 |
| WS-c5, WS-c7 | HU-02.h6, HU-01.h4 |
| WS-c8 | HU-03.h6, HU-06.h5 |
| WS-c11 | HU-04.h1, HU-05.h5, HU-07.h1, HU-08.h3 |

## 8. Hecho cuando

- Los once criterios pasan contra la réplica en el entorno local que describe [infraestructura.md](infraestructura.md), con el registro de diagnóstico de cada corrida como evidencia.
- Los riesgos técnicos de la sección 6 están despejados.
- El backlog puede empezar por HU-01 sin construir nada de lo que lista el alcance.
