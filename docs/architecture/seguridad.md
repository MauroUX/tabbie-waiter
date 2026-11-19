# Seguridad: Tabbie Waiter App

> Las prácticas de seguridad de la app y de la réplica, los riesgos que se aceptan porque el backend no se modifica, y el criterio que prueba cada práctica.
>
> La base son las [decisiones de arquitectura](../adr/README.md), el [PRD](../prd/tabbie-waiter-mvp.md), el [documento de contexto](../context/panel-mozos-actual.md), el [backlog](../backlog/README.md), el [walking skeleton](walking-skeleton.md) y la [infraestructura](infraestructura.md).

**Referencias:** las mismas que en los ADRs. Un número de cuatro cifras remite a un ADR; "PRD", "contexto" y "backlog" remiten a esos tres documentos; los IDs (RF-n, RNF-n, M-n, Cn, Tnn, On, HU-nn) son los de cada documento. `WS-cN` es un criterio del [walking skeleton](walking-skeleton.md), `ESC-n` un escenario del simulador ([componentes.md](componentes.md), sección 3) y `SEG-cN` un criterio de este documento (sección 4.3).

## 1. Qué controla este proyecto

- **El servidor no es de este proyecto.** El backend de Tabbie no se modifica: la seguridad del servidor es la del backend real, con sus huecos O1 a O4. La réplica es propia, pero reproduce O1 a O4 a propósito, como comportamiento heredado que la app rodea (C3, C6, C7, C11; [0010](../adr/0010-replica-propia-desde-el-contrato.md), DP-50): no agrega guards que el backend no tiene, no filtra campos que el backend devuelve y no cambia endpoints.
- **Lo que sí controla:**
  - lo que hace la app: quién entra, qué restaurante usa, qué guarda, qué muestra, qué registra, cómo se conecta y cómo repite (o no) una llamada (sección 2.1);
  - cómo se opera la réplica: sus secretos, sus datos iniciales y las cuentas de prueba (sección 2.2).
- **Los huecos del servidor** quedan como riesgos aceptados (sección 3). O1 a O4 están "observados en el código, sin verificar en ejecución" (contexto, sección 7). Cada uno tiene su criterio de comprobación (SEG-c1 a SEG-c4), que comprueba que la réplica lo reproduce (DP-50), en lo que la réplica construye (DP-54); en el backend real siguen siendo lo observado en su código.

## 2. Prácticas

Cada práctica dice qué hace, por qué y de dónde sale. El criterio que la prueba está en la sección 4.1.

### 2.1 De la app

**PA-1 · Solo entra el rol `waiter`**

- **Qué:** después del canje en `POST /auth/login`, si el rol no es `waiter`, la app cierra la sesión de Firebase, descarta el JWT, muestra el mensaje de RF-2 y no guarda nada de esa sesión. Nunca muestra una pantalla de la operación.
- **Por qué:** el backend no restringe por rol todos los endpoints que usa el mozo (O2, O3), y el panel actual también admite `admin` y `backoffice` (contexto, sección 1). La app es la que decide quién opera.
- **Evidencia:** RF-2; 0004; C1; contexto, sección 1.

**PA-2 · Un único restaurante, el del inicio de sesión**

- **Qué:** la app toma `user.restaurantId` del canje y usa ese restaurante en todas las llamadas. Solo opera sobre mesas, sesiones, pedidos y solicitudes que llegaron en T05 y T06 de ese restaurante; nunca toma un restaurante de otra fuente.
- **Por qué:** los endpoints de cobros no verifican que la sesión sea del restaurante del usuario (O2), y el cierre de mesa no verifica nada (O3). Con el ID de una sesión ajena, el backend aceptaría la acción. El panel actual, además, mezcla el restaurante del usuario con el de la URL (contexto, sección 1).
- **Evidencia:** RNF-7; 0004; contexto, sección 1.

**PA-3 · En la tablet solo quedan la sesión, cifrada, y las marcas de "Atendido"**

- **Qué:**
  - DataStore guarda el JWT, su `exp`, el `restaurantId` y el rol, cifrados con una clave del Android Keystore;
  - DataStore guarda las marcas de "Atendido" por sesión de mesa;
  - el SDK de Firebase guarda su propia sesión en el almacenamiento privado de la app;
  - nada más: ni respuestas del backend, ni caché HTTP, ni base de datos local;
  - al cerrar sesión se borran la sesión de DataStore y la de Firebase; las marcas quedan, porque son de la mesa (RF-4).
- **Por qué:** las mesas activas llegan con emails de comensales y tokens de MercadoPago (O4). Lo que no se guarda no se puede leer de una tablet perdida o compartida.
- **Límite:** la sesión de Firebase queda en el almacenamiento privado de la app sin la clave del Keystore (0005, Consecuencias).
- **Evidencia:** RNF-8; 0005; C3, C7.

**PA-4 · Ninguna acción que cambia datos se repite sola**

- **Qué:**
  - ni la app ni el cliente HTTP repiten una acción: OkHttp se usa con `retryOnConnectionFailure` desactivado;
  - mientras una acción está en curso, no se puede volver a tocar;
  - si falla, no responde en 10 s o recibe un 401, la app actualiza mesas y solicitudes antes de dejar intentarla de nuevo, y el mozo decide.
- **Por qué:** `/pay` y `/add-payment` no son idempotentes, y el panel actual repite una vez toda acción fallida: puede registrar un cobro dos veces (contexto, sección 1). Un cobro duplicado es una falla de integridad del dinero de la mesa (M-2).
- **Evidencia:** RNF-6; 0004 ("401 en una llamada"); 0007; M-2.

**PA-5 · No muestra datos sensibles aunque el backend los mande**

- **Qué:** ninguna pantalla muestra emails de comensales ni credenciales del restaurante. Los comensales aparecen por su nombre.
- **Por qué:** T05 devuelve la fila completa del restaurante, con `mercadoPagoToken` y `mercadoPagoRefreshToken`, y los emails de los comensales, sin serialización que excluya campos (O4).
- **Evidencia:** RF-9; O4; C3.

**PA-6 · No escribe datos sensibles en los registros**

- **Qué:** ni el registro de diagnóstico (walking skeleton, sección 4) ni el registro del sistema de Android ni el de las peticiones HTTP contienen:
  - los cuerpos de las respuestas del backend;
  - el JWT, ni en el encabezado `Authorization` ni en la URL del stream de eventos. El stream lo recibe en el encabezado (0008), pero la URL del stream tampoco se registra;
  - el ID token de Firebase ni la contraseña del mozo;
  - emails o nombres de comensales, ni credenciales del restaurante.
- **Por qué:** los cuerpos traen lo de O4, y hasta que TK-05 compruebe 0008 la URL del stream puede llevar el JWT (RA-6). Un registro se copia, se adjunta a un reporte de error y se lee fuera de la tablet.
- **Evidencia:** RF-9, O4; 0004, 0006, 0008; walking skeleton, sección 4 ("Registro de diagnóstico").

**PA-7 · Solo HTTPS, salvo en la variante de réplica local**

- **Qué:** las variantes de demo y Tabbie solo hablan con el backend por HTTPS; el sistema bloquea el tráfico sin cifrar. La variante de réplica local permite HTTP sin cifrar solo hacia la máquina de desarrollo, porque Toxiproxy y la réplica local no tienen TLS. Firebase siempre va por HTTPS.
- **Por qué:** por la red viajan el ID token, el JWT (en el encabezado de todas las llamadas, también del stream, 0008) y las respuestas con lo de O4.
- **Evidencia:** 0003; infraestructura.md, sección 2.3.

**PA-8 · Renovación de la sesión**

- **Qué:**
  - renovar es volver a canjear: antes del `exp` del JWT o ante un 401, la app pide un ID token nuevo a Firebase y vuelve a llamar a `POST /auth/login`;
  - hay una sola renovación en curso a la vez;
  - si la renovación es rechazada (Firebase invalida al usuario, el canje falla o el rol ya no es `waiter`), la app lleva al inicio de sesión;
  - si falla por la red, se trata como un corte y conserva la sesión;
  - la conexión de eventos se reabre siempre con el JWT vigente.
- **Por qué:** el backend no tiene endpoint de renovación (C1). Volver a canjear hace que cada renovación pase de nuevo por Firebase y por el control de rol, así que una cuenta dada de baja o que dejó de ser de mozo pierde el acceso en la próxima renovación.
- **Evidencia:** RF-3, RNF-5; 0004; C1.

### 2.2 De la réplica y del repo

**PR-1 · Los secretos son variables de entorno y nunca entran al repo**

- **Qué:** las credenciales del proyecto de Firebase de Tabbie (`FIREBASE_*`) y el secreto del JWT (`JWT_SECRET`) se cargan como variables de entorno de cada entorno. El repo trae solo un archivo de ejemplo con los nombres, sin valores.
  - Ninguna credencial ni cuenta entra al repo: ni secretos, ni cuentas de servicio, ni contraseñas de las cuentas de prueba, ni tokens (0009; DP-01).
  - Un hook de pre-commit en `.claude/hooks/` bloquea `.env`, la cuenta de servicio de Firebase, `JWT_SECRET`, los tokens de MercadoPago, las contraseñas de las cuentas de prueba y los emails que no son del dominio de prueba (DP-07).
  - La CI corre gitleaks en cada PR ([infraestructura.md](infraestructura.md#6-integración-continua); DP-11).
- **Por qué:** con la cuenta de servicio de Firebase se administra el proyecto de Tabbie; con el secreto del JWT se firma un JWT de cualquier rol y cualquier restaurante para esa réplica.
- **Evidencia:** 0002 (Consecuencias), 0009; infraestructura.md, secciones 2.4 y 6.

**PR-2 · Los datos iniciales son sintéticos**

- **Qué:** los datos iniciales de la réplica son propios e inventados. Ningún dato de Tabbie entra a la réplica ni al repo: ni volcados de la base, ni nombres, emails o credenciales reales. Los campos de credenciales del restaurante (`mercadoPagoToken`, `mercadoPagoRefreshToken`) tienen valores de mentira, reconocibles como tales.
- **Por qué:** la réplica devuelve esos datos por los huecos O2 a O4, el repo es público para el evaluador y la demo corre en Internet.
- **Evidencia:** 0002 ("Réplica").

**PR-3 · Las cuentas de prueba usan un dominio reservado para ejemplos**

- **Qué:** todas las cuentas de prueba que este proyecto crea en el proyecto de Firebase de Tabbie, y todos los usuarios de los datos iniciales, tienen email en un dominio reservado para ejemplos, como `example.com`. Sus contraseñas son exclusivas de estas cuentas.
- **Por qué:** así se reconocen en el proyecto de Firebase de Tabbie como cuentas de prueba, y nadie las confunde con usuarios reales.
- **Evidencia:** 0002 (Consecuencias); backlog, "Comportamientos entre tablets".

## 3. Riesgos aceptados

RA-1 a RA-7 se aceptan porque el backend no se modifica (PRD, sección 9; 0002): este proyecto no puede cerrar un hueco del servidor, solo acotar lo que hace la app. RA-8 es de la plataforma de la réplica. Cada riesgo dice qué puede pasar, cuándo, qué hace la app para acotarlo y por qué se acepta.

### RA-1 · O1: el pedido de ayuda no se puede apagar

- **Qué puede pasar:** `PUT /table-sessions/:id/attend` falla siempre (HTTP 500) y ningún otro endpoint pone `requestingHelp` en `false`. El aviso queda encendido hasta que se cierra la mesa, y un segundo pedido de ayuda no se distingue del primero.
- **Cuándo:** cada vez que un comensal pide ayuda.
- **Qué hace la app:** no llama a `/attend`. "Atendido" es una marca local de cada tablet, por sesión de mesa; las otras tablets siguen mostrando el aviso (HU-10.c3), y un segundo pedido de la misma ocupación no se ve en la tablet que ya lo marcó (HU-10.h4).
- **Por qué se acepta:** afecta la atención, no los datos ni el dinero, e inicialmente hay una sola tablet por restaurante.
- **Comprobación:** SEG-c1, contra la réplica. Reproduce que `requestingHelp` no se apaga y que un segundo pedido de ayuda no se distingue del primero. No reproduce el 500 de `/attend`: la réplica no construye ese endpoint, porque la app no lo llama (C7; DP-54).

### RA-2 · O2: los endpoints de cobros no aplican roles ni restaurante

- **Qué puede pasar:** `POST /table-sessions/:id/pay`, `POST /table-sessions/:id/add-payment` y `GET /table-sessions/:id/payments` aceptan cualquier JWT válido, incluido el de un invitado, que cualquiera obtiene con `POST /auth/guest`, y no verifican que la sesión sea del restaurante del usuario. Alguien ajeno puede leer los cobros de cualquier mesa o registrar cobros falsos que bajan su saldo.
- **Cuándo:** en cualquier momento, con solo conocer el ID de una sesión de mesa.
- **Qué hace la app:** no usa ese hueco: solo opera sesiones de su restaurante que llegaron en T05 (PA-2). Muestra todos los cobros de cada mesa (RF-23), así que un cobro que el mozo no registró queda a la vista; un cobro manual ajeno aparece como "Pago manual", igual que uno propio, porque el backend no guarda quién lo registró (C8, C10).
- **Por qué se acepta:** solo se cierra en el backend. Queda documentado para el equipo de Tabbie.
- **Comprobación:** SEG-c2.

### RA-3 · O3: endpoints públicos en la cadena del mozo

- **Qué puede pasar:** sin ningún JWT, cualquiera puede cerrar cualquier sesión de mesa y liberar la mesa (`PATCH /table-sessions/close/:id`), leer los pedidos de una sesión con los emails de sus comensales (`GET /table-sessions/:id/orders`) y escuchar los eventos de una sesión (`GET /table-sessions/:id/subscribe`, que ignora el `token`).
- **Cuándo:** en cualquier momento, con solo conocer el ID de una sesión de mesa.
- **Qué hace la app:** envía su JWT igual en todas las llamadas; solo cierra sesiones que llegaron en T05 (RF-27), y antes de cerrar revisa que la mesa siga activa; si ya no lo está, avisa y la quita de la lista (HU-08.h4). No usa los otros dos endpoints.
- **Por qué se acepta:** solo se cierra en el backend. Queda documentado para el equipo de Tabbie.
- **Comprobación:** SEG-c3, contra la réplica. Reproduce el cierre de una sesión sin JWT. No reproduce la lectura de los pedidos ni la escucha de los eventos de una sesión: la réplica no construye esos endpoints, porque la app no los usa (DP-54).

### RA-4 · O4: datos sensibles en las respuestas

- **Qué puede pasar:** T05 trae los emails de los comensales y, cuando un usuario de la mesa tiene restaurante, la fila completa del restaurante con `mercadoPagoToken` y `mercadoPagoRefreshToken`. Esos datos llegan a la memoria de la tablet y viajan por la red.
- **Cuándo:** en cada consulta de mesas activas, cada menos de 30 s mientras la app está abierta (0006).
- **Qué hace la app:** no los muestra (PA-5), no los guarda (PA-3), no los registra (PA-6) y solo los recibe por HTTPS fuera de la réplica local (PA-7).
- **Por qué se acepta:** la app no puede pedirle al backend que no los mande, y lo que hace con ellos queda acotado a la memoria del proceso.
- **Comprobación:** SEG-c4.

### RA-5 · Dos tablets que actúan casi al mismo tiempo

Antes de cada acción, la app actualiza el estado que la acción necesita y, si la acción ya no corresponde, avisa y no actúa (0007). Entre esa revisión y la acción queda un margen, y el backend no controla lo que pasa en él. Cuando otra tablet, o un cobro del comensal, actúa en ese margen:

| Carrera | Qué puede pasar | Por qué el backend no lo frena | Qué hace la app |
|---|---|---|---|
| Confirmar la misma solicitud en dos tablets | Un cobro duplicado | Confirmar no revisa que la solicitud siga existiendo (0007) | Revisa que la solicitud siga en T06 antes de confirmar (HU-07.h2) |
| Superar el saldo con un cobro manual | Lo pagado queda por encima del total de los pedidos | El cobro manual solo se controla contra el total de la mesa, no contra el saldo (C8) | Actualiza el saldo antes de registrar y no registra un monto sin propina que lo supere (HU-05.h1, HU-05.h8) |
| Cancelar un pedido que acaba de recibir un cobro | Un pedido cancelado con un cobro que no se revierte, y un total recalculado sin él | Cancelar no revierte `isPaid`, `quantityPaid` ni `amountPaid` (C6) | Actualiza los cobros del pedido antes de cancelar y no cancela lo que tiene algo cobrado (HU-12.c2, HU-12.h3) |
| Cerrar una mesa dos veces | Se reescribe `closedAt` y se libera la mesa aunque ya tenga otra sesión activa | El cierre no controla si la sesión ya estaba cerrada (C13) | Actualiza las mesas antes de cerrar y no cierra una sesión que ya no está activa (HU-08.h4) |

- **Cuándo:** solo con dos o más tablets del mismo restaurante sobre la misma mesa o solicitud, o con un cobro del comensal que llega en el mismo instante. El margen va desde la revisión previa hasta que la petición llega al backend.
- **Por qué se acepta:** el backend no se modifica, e inicialmente hay una sola tablet por restaurante (PRD, sección 9; backlog, "Riesgos aceptados").

### RA-6 · El JWT viaja en la URL del stream de eventos

- **Qué puede pasar:** la URL de `/sse/waiters?token=<jwt>` puede quedar en registros de acceso de servidores o proxies intermedios, o en registros de la app si alguien la escribe. Quien la lea tiene un JWT de mozo válido hasta su vencimiento (16 h por defecto).
- **Cuándo:** cada vez que la app abre o reabre la conexión de eventos: al iniciar sesión, al renovar y después de cada corte (0006).
- **Qué hace la app:** no registra la URL del stream (PA-6), la manda solo por HTTPS fuera de la réplica local (PA-7), y renueva el JWT antes de que venza (PA-8).
- **Por qué se acepta:** así lo pedían 0004 y 0006, como lo hace el panel actual (contexto, sección 5).
- **Decidido:** el stream recibe el JWT en el encabezado `Authorization: Bearer`, porque el backend lo lee antes que el query param (contexto, sección 0; [0008](../adr/0008-jwt-del-stream-en-el-encabezado.md); DP-28). Este riesgo se cierra cuando [TK-05](../backlog/tickets/TK-05-eventos-y-consulta-periodica.md) lo comprueba contra la réplica; está en los riesgos técnicos del [walking skeleton](walking-skeleton.md) (sección 6, "El JWT en la URL del stream").

### RA-7 · Las cuentas de prueba existen en el proyecto de Firebase de Tabbie

- **Qué puede pasar:** las cuentas de prueba existen en el proyecto de Firebase de Tabbie (0002). Sus credenciales no se publican: se entregan con el formulario de entrega ([0009](../adr/0009-publicacion-del-repo-y-credenciales.md); DP-35). Quien las reciba puede iniciar sesión con ellas en ese proyecto. Si una inicia sesión contra el backend real, `POST /auth/login` le crea un usuario de comensal (T01).
- **Cuándo:** mientras las cuentas existan en el proyecto de Firebase de Tabbie. Son las cinco `waiterapp.<papel>@example.com` de los datos iniciales y la cuenta sin email `waiterapp-dp58-sin-email`, que crea la prueba local de DP-58; la lista está en [infraestructura.md](infraestructura.md#21-local-desarrollo-y-pruebas), sección 2.1 (TK-02).
- **Qué hace la app:** ese usuario no tiene el rol `waiter` en el backend real, así que la app lo rechaza y no llega a la operación (PA-1, HU-01.c2). Las cuentas se reconocen por su dominio reservado (PR-3) y sus contraseñas no se usan en otro lado.
- **Por qué se acepta:** la réplica valida contra el mismo proyecto de Firebase para que la app pase al backend real cambiando solo la URL base, que es la intención de 0002 y 0010, y el evaluador necesita entrar sin preparar nada. Con estas cuentas se obtiene, en el backend real, lo mismo que cualquiera obtiene iniciando sesión como comensal con una cuenta propia (C1, T01). Además, el proyecto es de desarrollo: lo confirmó su dueño el 2026-11-14, porque la app de Tabbie todavía no se liberó (0009; DP-02).

### RA-8 · La réplica y las pruebas corren sobre Node 20, sin soporte

- **Qué puede pasar:** Node 20 dejó de recibir parches de seguridad el 2026-04-30, y [0003](../adr/0003-stack.md) lo fija para la réplica, sus pruebas y el simulador. Una vulnerabilidad de Node que se publique después no se corrige en la imagen `node:20`.
- **Cuándo:** mientras la réplica corra sobre Node 20: en el entorno local y en la demo.
- **Qué lo acota:** la réplica es una herramienta de desarrollo y de demo, no el backend real. Tiene solo datos sintéticos, credenciales de cobro de mentira y una base desechable (PR-2, PR-3); en la demo, Railway termina TLS delante de ella. La imagen está fijada por versión y digest (`node:20.20.2-bookworm-slim`), así que lo que corre es siempre lo mismo que se probó. La app no corre sobre Node.
- **Por qué se acepta:** cambiar de versión de Node es cambiar 0003 y pide un ADR nuevo, con las imágenes, los `engines` y los lock de la réplica, de sus pruebas y del simulador. No entra en TK-01, que construye la base sobre el stack decidido. El ADR que migra a una versión con soporte cierra este riesgo.

## 4. Bajada a criterios

### 4.1 De cada práctica a su criterio

Si el criterio ya existe en una historia o en el walking skeleton, se cita por su ID. Si no existe, está en la sección 4.3, con el ID `SEG-cN`, para que los tickets lo hereden.

| Práctica | Criterios que la prueban |
|---|---|
| PA-1 · Solo entra el rol `waiter` | HU-01.c2, HU-01.h5 |
| PA-2 · Un único restaurante | HU-01.h6, HU-02.h7, HU-03.h7, SEG-c8 |
| PA-3 · En la tablet solo la sesión, cifrada, y las marcas | HU-01.h3, HU-10.h2, HU-10.h7, HU-09.h2, SEG-c5 |
| PA-4 · Ninguna acción se repite sola | WS-c11, HU-04.h1, HU-04.h5, HU-05.h5, HU-05.h6, HU-07.h1, HU-08.h2, HU-08.h3, SEG-c9 |
| PA-5 · No muestra datos sensibles | HU-02.h5, HU-06.h6, HU-11.h7 |
| PA-6 · No escribe datos sensibles en los registros | SEG-c6 |
| PA-7 · Solo HTTPS, salvo en la réplica local | SEG-c7 |
| PA-8 · Renovación de la sesión | HU-01.c3, HU-01.c4, HU-01.h4, WS-c10, SEG-c9 |
| PR-1 · Secretos fuera del repo | SEG-c10 |
| PR-2 · Datos iniciales sintéticos | SEG-c11 |
| PR-3 · Cuentas de prueba con dominio reservado | SEG-c11 |

### 4.2 De cada riesgo a su comprobación

| Riesgo | Comprobación del riesgo | Criterios de lo que hace la app |
|---|---|---|
| RA-1 · O1 | SEG-c1 | HU-10.c3, HU-10.h1, HU-10.h4 |
| RA-2 · O2 | SEG-c2 | SEG-c8 |
| RA-3 · O3 | SEG-c3 | HU-08.h4 |
| RA-4 · O4 | SEG-c4 | HU-02.h5, HU-06.h6, HU-11.h7, SEG-c5, SEG-c6 |
| RA-5 · Carreras entre tablets | — (no se cierra en la app) | HU-07.h2, HU-05.h1, HU-05.h8, HU-12.h3, HU-08.h4 |
| RA-6 · JWT en la URL del stream | TK-05, con el JWT en el encabezado (0008) | SEG-c6, SEG-c7, WS-c10 |
| RA-7 · Cuentas de prueba en Firebase de Tabbie | — (decisión de 0002 y 0009) | HU-01.c2, SEG-c11 |
| RA-8 · Node 20 sin soporte | — (se cierra con un ADR que reemplace la versión de 0003) | — |

**Cómo se comprueban O1 a O4:**

- Se corren contra la réplica local, desde la máquina de desarrollo, con un cliente HTTP y el simulador; no con la app. Usan los endpoints de la réplica, sus variables de entorno y los datos iniciales: la réplica no tiene endpoints solo de prueba (DP-48).
- **Un criterio pasa cuando la réplica se comporta como dice la observación.** O1 a O4 se reproducen a propósito (DP-50): así la app se prueba contra los mismos huecos que tiene el backend real.
- Si un hueco no se reproduce, se corrige la réplica, no la observación del contexto.
- **Evidencia:** las peticiones y respuestas de cada corrida, guardadas. Solo contienen datos sintéticos (PR-2).
- **Cuándo:** en los tickets que construyen los endpoints de cada hueco (TK-08 y TK-13), y después en cada PR que toca la réplica, porque viven en `replica/tests/` y corren en la CI (DP-14).

### 4.3 Criterios nuevos

**SEG-c1 · O1: la ayuda no se apaga** (O1; RA-1)

- **Dado** que el simulador pidió ayuda en una mesa del restaurante 1 (ESC-4)
- **Cuando**, desde la máquina, se consultan las mesas activas (T05) con el JWT del primer mozo del restaurante 1
- **Entonces** esa sesión trae `requestingHelp` en `true`
- **Y** si el simulador vuelve a pedir ayuda en la misma sesión, T05 devuelve esa sesión igual que antes: nada distingue el segundo pedido del primero

**SEG-c2 · O2: los cobros aceptan cualquier JWT, de cualquier restaurante** (O2; RA-2)

- **Dado** que una mesa del restaurante 1 tiene saldo pendiente y una solicitud de cobro presencial (ESC-5)
- **Y** se obtuvo un JWT de invitado con `POST /auth/guest`
- **Cuando**, desde la máquina y con el JWT de invitado, se llama a `GET /table-sessions/:id/payments`, a `POST /table-sessions/:id/add-payment` por $1 y a `POST /table-sessions/:id/pay` con la solicitud
- **Entonces** la réplica responde con éxito a las tres
- **Y** lo pagado de la mesa, consultado con el JWT del primer mozo del restaurante 1, subió con los dos cobros
- **Y** con el JWT del mozo del restaurante 2, `GET /table-sessions/:id/payments` y `POST /table-sessions/:id/add-payment` sobre la misma sesión también responden con éxito

**SEG-c3 · O3: cerrar una sesión sin JWT** (O3; RA-3)

- **Dado** que el simulador ocupó una mesa del restaurante 1 (ESC-1)
- **Cuando**, desde la máquina y sin JWT, se llama a `PATCH /table-sessions/close/:id` de esa sesión
- **Entonces** la réplica cierra la sesión: T05, consultado con el JWT del primer mozo del restaurante 1, deja de traer esa mesa

**SEG-c4 · O4: emails y credenciales del restaurante en las mesas activas** (O4; RA-4)

- **Dado** que los datos iniciales le dan al restaurante 1 valores de mentira de `mercadoPagoToken` y `mercadoPagoRefreshToken` (PR-2)
- **Y** el simulador ocupa una mesa del restaurante 1 y confirma un pedido con un usuario que tiene asignado el restaurante 1, y otra mesa con un comensal sin restaurante
- **Cuando**, desde la máquina, se llama a T05 con el JWT del primer mozo del restaurante 1
- **Entonces** la respuesta trae, en `users[].restaurant` y en `orders[].user.restaurant` de la primera mesa, la fila del restaurante 1 con los dos tokens
- **Y** trae los emails de los comensales de las dos mesas

**SEG-c5 · En la tablet solo queda la sesión, cifrada, y las marcas** (RNF-8, 0005; PA-3)

- **Dado** que, en un emulador con una compilación de depuración de la variante de réplica local, el mozo operó un turno con el simulador (ESC-9), con al menos una marca de "Atendido"
- **Cuando** se copia el almacenamiento privado de la app desde la máquina
- **Entonces** solo están los archivos de DataStore de la sesión y de las marcas, y los del SDK de Firebase
- **Y** el JWT, el `restaurantId` y el rol no aparecen en texto claro en el archivo de la sesión
- **Y** ningún archivo contiene emails ni nombres de comensales, los tokens de mentira de MercadoPago ni respuestas del backend: no hay base local ni caché HTTP
- **Y** después de cerrar sesión, ya no están la sesión de DataStore ni la de Firebase, y las marcas siguen

**SEG-c6 · Los registros no tienen datos sensibles** (RF-9, O4, 0004, 0006; PA-6, RA-6)

- **Dado** que el mozo operó un turno con el simulador (ESC-9) contra la réplica local, con un vencimiento corto del JWT, así hubo al menos una renovación y una reapertura de la conexión de eventos, y al menos un corte con Toxiproxy
- **Cuando** se buscan, en el registro de diagnóstico y en el registro del sistema de Android de esa corrida:
  - cada JWT que emitió la réplica, y el texto `token=`;
  - los emails de los datos iniciales y la contraseña de la cuenta de prueba;
  - los tokens de mentira de MercadoPago;
  - cualquier cuerpo de respuesta del backend
- **Entonces** no aparece ninguno

**SEG-c7 · Solo HTTPS fuera de la réplica local** (0003; PA-7, RA-6)

- **Dado** una compilación de la variante de demo con una URL base `http://` que apunta a la réplica local
- **Cuando** el mozo intenta iniciar sesión con una cuenta de prueba
- **Entonces** la app no llega a la réplica: el sistema bloquea el tráfico sin cifrar, y la app muestra que no hay conexión
- **Y** con la variante de réplica local, una URL base `http://` que apunta a un host que no es la máquina de desarrollo también se bloquea

**SEG-c8 · El mozo no opera otro restaurante** (RNF-7, O2; PA-2, RA-2)

- **Dado** que los dos restaurantes tienen mesas ocupadas, pedidos confirmados y solicitudes de cobro (ESC-8, y ESC-5 en el restaurante 2)
- **Y** se guardó el estado del restaurante 2, consultado desde la máquina con el JWT de su mozo: mesas activas, pedidos, solicitudes y cobros de cada sesión
- **Cuando** el primer mozo del restaurante 1 opera con la app: manda a cocina, cancela, registra un cobro manual, confirma y elimina solicitudes y cierra una mesa
- **Entonces** el estado del restaurante 2, consultado de nuevo, es igual al guardado

**SEG-c9 · Un 401 en una acción no se repite** (RNF-6, 0004, 0007; PA-4, PA-8)

- **Dado** que la réplica corre con un vencimiento corto del JWT de los mozos, una mesa del restaurante 1 tiene saldo pendiente, y el JWT con que inició sesión la prueba ya venció
- **Cuando** una prueba de la app, sin pantalla, pide al cliente HTTP un cobro manual de $100 en esa mesa (T11) con ese JWT vencido
- **Entonces** la réplica responde 401 y lo pagado de la mesa no cambia
- **Y** el cliente HTTP mandó una sola petición, pidió la renovación y no repitió el cobro con el JWT nuevo
- **Y** la acción termina como fallida, después de que la app actualizó mesas y solicitudes
- **Y** una consulta de mesas (T05) con el mismo JWT vencido se repite una sola vez, con el JWT nuevo, y responde con éxito

**SEG-c10 · Los secretos no están en el repo** (0002; PR-1)

- **Dado** el repo con todo su historial, en todas sus ramas
- **Cuando** se lo revisa con un detector de secretos y se buscan los valores de `JWT_SECRET`, de las variables `FIREBASE_*` y de las contraseñas de MySQL y Redis de cada entorno
- **Entonces** no aparece ningún valor de esos secretos
- **Y** sus nombres aparecen solo en el archivo de ejemplo, sin valores

**SEG-c11 · Datos iniciales sintéticos y cuentas de prueba reconocibles** (0002; PR-2, PR-3, RA-7)

- **Dado** los datos iniciales del repo y las cuentas de prueba que crea el script de `replica/firebase/` a partir de ellos (DP-37)
- **Cuando** se carga una réplica vacía solo con los datos iniciales del repo, y se listan sus usuarios, restaurantes y credenciales de cobro, y las cuentas de prueba de Firebase
- **Entonces** todos los emails, de los datos iniciales y de las cuentas de prueba, son del dominio reservado para ejemplos
- **Y** los valores de `mercadoPagoToken` y `mercadoPagoRefreshToken` son de mentira, reconocibles como tales
- **Y** la carga no usó ningún volcado ni archivo fuera del repo
