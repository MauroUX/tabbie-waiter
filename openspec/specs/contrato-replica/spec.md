# contrato-replica Specification

## Purpose

El contrato HTTP y de eventos que atiende la réplica, tomado del contexto (`docs/context/panel-mozos-actual.md`) sin cambiar rutas, cuerpos ni eventos (DP-49). Cada entrada dice de qué fila sale y qué deja abierto el contexto; la app se apoya en él para pasar al backend real cambiando solo la URL base (0010).

**Huecos.** Lo que el contexto no fija lo decide el humano y queda como DP en `docs/backlog/tickets/README.md`; cada entrada cita la suya. Ningún test se escribe sobre un hueco abierto.

## Requirements

### Requirement: Contrato T01 · `POST /auth/login`

Fuente: contexto, C1, T01, sección 0 ("Convenciones del backend"), 3.3 (`access_token`) y 3.1 (#1); `modelo-de-datos.md`, 2.2 y sección 4; `infraestructura.md`, sección 5 (`USE_FIREBASE`, `JWT_*`); DP-43.

La réplica SHALL atender `POST /auth/login` **sin guards** (público), con el body `{firebaseIdToken}`.

- Con `USE_FIREBASE` activada, SHALL verificar el ID token con Firebase Admin, buscar el `user` por el `email` del token y, si no existe, insertarlo con rol `user` y sin restaurante. SHALL responder con un JWT propio en `access_token`, firmado con `JWT_SECRET`, que vence a los `JWT_EXPIRATION_WAITERS` (16 h por defecto) si el rol es `waiter` y a los `JWT_EXPIRATION` en los demás casos, y con `user.role` y `user.restaurantId`; un usuario sin restaurante recibe `restaurantId: "-1"`.
- No hay endpoint de renovación (C1).
- **Éxito (DP-55):** 201.
- **Cuerpo de la respuesta (DP-56):** `{"access_token": "<jwt>", "user": {"id", "email", "name", "role", "restaurantId"}}`, con `restaurantId` string y `"-1"` sin restaurante.
- **JWT propio (DP-57):** HS256 con `JWT_SECRET`, claims `{userId, role, iat, exp}`.
- **Errores (DP-58):** un body sin `firebaseIdToken`, un ID token inválido o vencido, o un ID token sin `email` responden 401, con un mensaje que nombra el motivo y sin JWT. El caso del ID token sin `email` necesita un ID token válido de una cuenta de Firebase, así que se prueba en TK-02, que crea las cuentas (DP-15).
- **Sin Firebase (DP-59):** con `USE_FIREBASE` desactivada responde 503, con el mensaje "Firebase desactivado (USE_FIREBASE)" y sin JWT.

#### Scenario: T01 es público

- **WHEN** se llama `POST /auth/login` sin encabezado `Authorization`, con un body `{firebaseIdToken}` cualquiera
- **THEN** la respuesta no es 401 por falta de JWT propio: con `USE_FIREBASE` desactivada es 503 (DP-59)

#### Scenario: T01 con `USE_FIREBASE` desactivada

- **GIVEN** la réplica arrancada con `USE_FIREBASE` desactivada y sin ninguna variable `FIREBASE_*`
- **WHEN** se llama `POST /auth/login` con un body `{firebaseIdToken}`
- **THEN** la réplica responde 503 con el mensaje "Firebase desactivado (USE_FIREBASE)", sin emitir ningún JWT (DP-59)
- **AND** la respuesta valida contra la entrada de T01 en `docs/api/openapi.yaml`

#### Scenario: T01 rechaza un ID token inválido (local, con Firebase)

- **GIVEN** la réplica arrancada con `USE_FIREBASE` activada y las credenciales del archivo local de variables
- **WHEN** se llama `POST /auth/login` con un `firebaseIdToken` que no es un ID token de Firebase
- **THEN** la réplica responde 401, sin emitir ningún JWT y sin insertar ninguna fila en `user` (DP-58)
- Esta prueba se marca **local**: no corre en la CI (DP-43), y su evidencia va en el PR.

#### Scenario: T01 rechaza un body sin `firebaseIdToken` (local, con Firebase)

- **GIVEN** la réplica arrancada con `USE_FIREBASE` activada y las credenciales del archivo local de variables
- **WHEN** se llama `POST /auth/login` con un body sin `firebaseIdToken`
- **THEN** la réplica responde 401 con un mensaje que nombra el campo, sin emitir ningún JWT y sin insertar ninguna fila en `user` (DP-58)
- Esta prueba se marca **local**: no corre en la CI (DP-43), y su evidencia va en el PR.

### Requirement: Contrato de los guards (`JwtAuthGuard` y `RolesGuard`)

Fuente: contexto, sección 0 ("Convenciones del backend"), sección 2 (columna "Guards y roles"), sección 5 y C1; DP-15.

- `JwtAuthGuard` SHALL tomar el JWT del encabezado `Authorization: Bearer` y, si no está, del query param `?token=`; SHALL verificar la firma con `JWT_SECRET` y el vencimiento, y cargar `user` con su `restaurant` por el `userId` del token. Sin JWT, con un JWT vencido o con una firma inválida, SHALL responder 401.
- Un JWT bien firmado cuyo `userId` no está en `user` responde 401 (DP-57).
- `RolesGuard` SHALL aplicar `@Roles(...)` solo en las rutas que lo nombran en `@UseGuards`; un `@Roles` sin `RolesGuard` no restringe (O2, a propósito, DP-50). Con un rol que no está en la lista, SHALL rechazar.
- Cuando `RolesGuard` rechaza un rol, responde 403 (DP-61).

#### Scenario: JWT por encabezado o por query param

- **GIVEN** un mozo insertado en MySQL con su restaurante, y un JWT firmado con el `JWT_SECRET` de la réplica para su `userId` (DP-15)
- **WHEN** se llama una ruta con "J" (T05) con el JWT en `Authorization: Bearer`, y otra vez con el JWT solo en `?token=`
- **THEN** las dos llamadas pasan el guard

#### Scenario: Sin JWT, vencido o con otra firma

- **WHEN** se llama una ruta con "J" (T05 y el stream) sin JWT, con un JWT vencido, o con un JWT firmado con otro secreto
- **AND** otra vez con un JWT bien firmado de un `userId` que no está en `user`
- **THEN** la réplica responde 401 en cada caso (DP-57)

### Requirement: Contrato T05 · `GET /restaurants/:id/tables/active`

Fuente: contexto, C3, T05, 3.1 (#4), sección 4 ("Mesa y sesión"), sección 6 y O4; `modelo-de-datos.md`, 2.1 a 2.12 y sección 4.

La réplica SHALL atender `GET /restaurants/:id/tables/active` con **J + R**, roles `admin`, `backoffice` y `waiter`, y el chequeo de restaurante: SHALL rechazar solo si el usuario tiene un restaurante y es distinto de `:id`.

SHALL devolver las mesas ocupadas del restaurante `:id`: las que tienen `isBusy = true` y `activeSessionId` apuntando a una `table_session` con `closedAt` nulo. Cada una SHALL traer:

- el restaurante de la mesa (`table.restaurant`), con los umbrales `yellowTicketSeconds`, `redTicketSeconds` y `redPulseTicketSeconds`;
- la sesión activa, con `createdAt`, `total`, `amountPaid`, `tips` y `requestingHelp`;
- los usuarios de la sesión (`table_session_users_user`), cada uno con su `restaurant` (eager);
- los pedidos de la sesión, **sin** los `pending` y **con** los `canceled`, cada uno con su `user` (con su `restaurant`) y el árbol de ítems: `items` → `product` y `selectedOptions` → `productOption` y `values`.

Los `decimal` SHALL llegar como string (`"1250.00"`) y `mercadoPagoUserId` también; las fechas, en UTC (`modelo-de-datos.md`, sección 4).

**O4, reproducido a propósito (DP-50):** las filas de `restaurant` que llegan dentro de `users[]`, de `orders[].user` y de la mesa SHALL venir completas, con `mercadoPagoToken` y `mercadoPagoRefreshToken`, y los usuarios SHALL venir con su `email`, sin ninguna serialización que los excluya. En `docs/api/openapi.yaml` esos campos SHALL llevar `x-sensitive: true`. La comprobación de O4 como hueco de seguridad (SEG-c4) es de TK-13.

- **Forma del JSON (DP-60):** un arreglo de mesas ocupadas por `number` ascendente. Cada mesa trae sus columnas, `restaurant` y `activeSession` con sus columnas, `users[]` y `orders[]` por `createdAt` ascendente; cada pedido trae `user` e `items[]`, y cada ítem `product` y `selectedOptions[]` con `productOption` y `values[]`. Una mesa sin pedidos trae `orders: []`; sin mesas ocupadas, `[]`.
- **Rechazos (DP-61):** 403 si el restaurante no coincide o si el rol no está en la lista.

#### Scenario: T05 devuelve las mesas ocupadas del restaurante del mozo

- **GIVEN** un restaurante con una mesa ocupada (sesión activa con un comensal y pedidos `pending`, `confirmed`, `in_kitchen` y `canceled`, con producto, opción y valor) y una mesa libre, y un mozo de ese restaurante con su JWT, todo insertado por la prueba
- **WHEN** el mozo llama `GET /restaurants/<su restaurante>/tables/active`
- **THEN** la réplica responde 200 con un arreglo con solo la mesa ocupada (DP-60), con su `restaurant` y sus umbrales, la sesión activa con `createdAt`, `total`, `amountPaid`, `tips` y `requestingHelp`, sus usuarios y sus pedidos `confirmed`, `in_kitchen` y `canceled`, sin el `pending`, cada uno con su árbol de ítems
- **AND** `total`, `amountPaid`, `tips` y los `price` llegan como string
- **AND** la respuesta valida contra la entrada de T05 en `docs/api/openapi.yaml`

#### Scenario: T05 trae los campos de O4 a propósito

- **GIVEN** la mesa ocupada del scenario anterior, con un usuario de la sesión que tiene restaurante
- **WHEN** el mozo llama T05
- **THEN** el `restaurant` de ese usuario y el de la mesa traen `mercadoPagoToken` y `mercadoPagoRefreshToken`, y los usuarios traen `email` (O4, reproducido a propósito, DP-50)
- **AND** en `docs/api/openapi.yaml` esos campos llevan `x-sensitive: true`

#### Scenario: T05 rechaza otro restaurante

- **GIVEN** un mozo del restaurante A con su JWT, y un restaurante B
- **WHEN** el mozo llama `GET /restaurants/<B>/tables/active`
- **THEN** la réplica responde 403, sin datos de B (DP-61)

#### Scenario: T05 rechaza un rol que no está en `@Roles`

- **GIVEN** un usuario con rol `user` y su JWT
- **WHEN** llama `GET /restaurants/:id/tables/active`
- **THEN** la réplica responde 403 (DP-61)

#### Scenario: T05 sin mesas ocupadas

- **GIVEN** un restaurante sin mesas ocupadas y un mozo de ese restaurante con su JWT
- **WHEN** el mozo llama T05
- **THEN** la réplica responde 200 con `[]` (DP-60)

### Requirement: Contrato del stream `GET /sse/waiters`

Fuente: contexto, T16, T17, 3.1 ("Streams y eventos SSE"), 3.3 ("Memoria del proceso"), sección 5, C4 y C9; 0008; DP-53.

La réplica SHALL atender `GET /sse/waiters` con **J**, sin roles, como un stream de eventos (`text/event-stream`) del restaurante del usuario. SHALL alimentarlo con un `Subject` por restaurante en la memoria del proceso: todo evento llega a todos los suscriptores de ese restaurante, sin heartbeat ni replay, y un evento sin suscriptores se pierde. SHALL aceptar el JWT en el encabezado `Authorization: Bearer` (0008) o en `?token=`, y con un JWT vencido SHALL responder 401 **antes** de abrir el stream. Con un JWT válido de un usuario sin restaurante SHALL responder 403, también antes de abrirlo (DP-64); la app no llega a ese caso.

Los eventos que llevará, y su `data` tal como la fija el contexto, los emiten los endpoints de otros tickets (DP-53):

| Evento | `data` | Lo emite | Ticket |
|---|---|---|---|
| `order-confirmed-notification` | `{"body":"<JSON en string>"}` con `{orderId, tableNumber, tableSessionId, restaurantId, confirmedAt}` (C4) | `PUT /orders/:id/confirm` | TK-03 |
| `in-person-payment-request` | la solicitud de cobro (contexto, 3.3) | `POST /payments/in-person-request` | TK-03 |
| `in-person-payment-request-deleted` | `{requestId, restaurantId}` (C9) | `DELETE /payments/in-person-requests/:requestId` (T13) | TK-13 |

Este cambio no emite ninguno.

#### Scenario: El stream abre con el JWT en el encabezado

- **GIVEN** un mozo insertado con su restaurante y su JWT
- **WHEN** abre `GET /sse/waiters` con `Authorization: Bearer <jwt>`
- **THEN** la réplica responde 200 con `Content-Type: text/event-stream` y deja la conexión abierta hasta que la prueba la corta

#### Scenario: El stream responde 401 con un JWT vencido antes de abrirse

- **GIVEN** un JWT del mismo mozo, firmado con el `JWT_SECRET` de la réplica y ya vencido
- **WHEN** abre `GET /sse/waiters` con ese JWT en el encabezado
- **THEN** la réplica responde 401 y no abre el stream: no llega ningún `Content-Type: text/event-stream`

#### Scenario: El stream responde 403 a un usuario sin restaurante (DP-64)

- **GIVEN** un usuario con rol `user` y sin restaurante, insertado por la prueba, y un JWT vigente para su `userId`
- **WHEN** abre `GET /sse/waiters` con ese JWT en el encabezado
- **THEN** la réplica responde 403 con un mensaje que dice que el usuario no tiene restaurante, y no abre el stream: no llega ningún `Content-Type: text/event-stream`
