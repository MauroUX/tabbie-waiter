## ADDED Requirements

### Requirement: Contrato `POST /auth/guest` (la ruta de T02)

Fuente: contexto, C2, T02 y su nota, sección 0 ("Roles"), "Endpoints del comensal que usa el simulador"; DP-17, DP-49, DP-53; `modelo-de-datos.md`, 2.2.

La réplica SHALL atender `POST /auth/guest` **sin guards** (público) y sin Firebase, con el body `{guestId}`, y SHALL responder con un JWT propio de invitado con rol `user`, firmado con `JWT_SECRET` y los claims de DP-57, que vence a los `JWT_EXPIRATION`. La app no usa esta ruta: la usa el simulador (C2, DP-49).

- **Fila del invitado (DP-72):** inserta una fila `user` con `isGuest = true`, rol `user`, sin restaurante, `name` nulo y email `invitado.<guestId>@example.com`, o reusa la de ese `guestId`. El JWT lleva su `userId`, así pasa `JwtAuthGuard` (DP-57). Diverge de la nota de T02 ("sin acceder a la base") en una ruta que la app no usa (DP-48).
- **Cuerpo y respuesta (DP-73):** `guestId` es un string de 1 a 64 caracteres `[A-Za-z0-9-]`. Éxito: **201** con `{"access_token": "<jwt>", "user": {"id", "email", "name", "role": "user", "restaurantId": "-1"}}`, la forma de T01 (DP-56). `access_token` lleva `x-sensitive: true`.
- **Rechazos (DP-73):** sin `guestId` o con otro formato, **400** con un mensaje que nombra el campo, sin JWT y sin fila nueva.

#### Scenario: `/auth/guest` devuelve un JWT de invitado sin Firebase

- **GIVEN** la réplica arrancada con `USE_FIREBASE` desactivada
- **WHEN** se llama `POST /auth/guest` sin `Authorization`, con un `guestId` generado por la prueba
- **THEN** la réplica responde 201 con `access_token` y `user` con rol `user` y `restaurantId` `"-1"` (DP-73)
- **AND** en `user` hay una fila con ese `id`, `isGuest` verdadero, rol `user`, sin restaurante y el email `invitado.<guestId>@example.com` (DP-72)
- **AND** el JWT es HS256 con `JWT_SECRET` y claims `{userId, role, iat, exp}` (DP-57), y pasa `JwtAuthGuard` en una ruta con "J"
- **AND** la respuesta valida contra la entrada de `/auth/guest` en `docs/api/openapi.yaml`, con `access_token` marcado `x-sensitive: true`

#### Scenario: El mismo `guestId` vuelve a ser el mismo invitado

- **GIVEN** un `guestId` que ya entró por `/auth/guest`
- **WHEN** se llama `POST /auth/guest` otra vez con ese `guestId`
- **THEN** la réplica responde 201 con el mismo `user.id`, y en `user` sigue habiendo una sola fila con ese email (DP-72)

#### Scenario: `/auth/guest` rechaza un `guestId` ausente o inválido

- **WHEN** se llama `POST /auth/guest` con un body sin `guestId`, y otra vez con un `guestId` que tiene `@`
- **THEN** la réplica responde 400 las dos veces, con un mensaje que nombra `guestId`, sin `access_token` y sin insertar ninguna fila en `user` (DP-73)

### Requirement: Contrato `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber`

Fuente: contexto, "Endpoints del comensal que usa el simulador", sección 4 ("Mesa y sesión"); DP-18, DP-53; `modelo-de-datos.md`, 2.3 a 2.5; walking-skeleton.md, 6.1 ("Unirse a la mesa y autenticar al comensal").

La réplica SHALL atender `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber` **sin guard**, con el comensal en el body. El comensal SHALL quedar en la sesión activa de la mesa `tableNumber` del restaurante `restaurantId`, y la mesa SHALL quedar activa: `isBusy = true` y `activeSessionId` apuntando a una `table_session` con `closedAt` nulo.

- **Cuerpo (DP-74):** `{userId}`, el `user.id` que devolvió `/auth/guest`.
- **Mesa libre o ocupada (DP-74):** si la mesa está libre, crea la `table_session` y la activa; si está ocupada, suma al comensal a la sesión activa, sin duplicarlo. Dos comensales a la vez no abren dos sesiones.
- **Respuesta (DP-74):** **201** con la sesión: sus columnas y `users[]`, cada uno con sus columnas y su `restaurant`, como `activeSession` en T05.
- **Rechazos (DP-74):** body sin `userId` entero, **400**; restaurante, mesa o usuario inexistente, **404**. Ninguno abre una sesión.

#### Scenario: Riesgo técnico · un invitado se une a una mesa libre y la mesa aparece en T05

- **GIVEN** un restaurante con una mesa libre y un mozo de ese restaurante con su JWT, insertados por la prueba
- **AND** un invitado que entró con `POST /auth/guest`
- **WHEN** el invitado llama `POST /table-sessions/join/restaurant/<restaurante>/table/<número>` **sin `Authorization`**, con `{userId}` en el body
- **THEN** la réplica responde 201 con la sesión, sus columnas y `users[]` con el invitado (DP-74)
- **AND** la mesa queda con `isBusy` verdadero y `activeSessionId` apuntando a esa sesión, con `closedAt` nulo
- **AND** el mozo llama T05 y la mesa aparece con esa sesión activa y el invitado en `users[]`
- **AND** la respuesta valida contra la entrada de `/join` en `docs/api/openapi.yaml`

#### Scenario: Un segundo comensal se suma a la misma sesión

- **GIVEN** la mesa ocupada del scenario anterior y otro invitado
- **WHEN** el segundo invitado se une a la misma mesa, y el primero vuelve a unirse
- **THEN** la réplica responde 201 las dos veces con la misma sesión, sin abrir otra, y `users[]` trae a los dos invitados una sola vez cada uno (DP-74)

#### Scenario: `/join` rechaza una mesa, un restaurante o un comensal que no existen

- **WHEN** se llama `/join` con un número de mesa que no existe en el restaurante, con un `restaurantId` que no existe, con un `userId` que no está en `user`, y con un body sin `userId`
- **THEN** la réplica responde 404, 404, 404 y 400, con un mensaje que nombra lo que falta, y no crea ninguna `table_session` ni cambia la mesa (DP-74)

### Requirement: Contrato `POST /orders`

Fuente: contexto, sección 4 (tabla de transiciones: "→ `pending`") y C3; DP-53; `modelo-de-datos.md`, 2.6 a 2.12.

La réplica SHALL atender `POST /orders` y crear el pedido en estado `pending`, con su árbol de ítems. Un pedido `pending` no SHALL aparecer en T05 ni contar en `table_session.total` (contexto, sección 4).

- **Guards y cuerpo (DP-75):** **J**, sin roles. Body `{tableSessionId, items: [{productId, quantity, note?, selectedOptions?: [{productOptionId, valueIds: []}]}]}`. El `userId` sale del JWT; el `restaurantId`, de la mesa de la sesión.
- **Respuesta (DP-75):** **201** con el pedido: sus columnas e `items[]` con `product` y `selectedOptions[]` con `productOption` y `values[]`, sin `user`.
- **Rechazos (DP-75):** **400** si no hay ítems, si una cantidad no es un entero ≥ 1, si un producto no existe o es de otro restaurante, si una opción no es del producto o un valor no es de la opción; **404** si la sesión no existe; **409** si está cerrada; **403** si el comensal no está en la sesión; **401** sin JWT. Ninguno crea el pedido.

#### Scenario: `POST /orders` crea un pedido `pending` con su árbol de ítems

- **GIVEN** un invitado unido a una mesa de un restaurante con un producto que tiene una opción y sus valores, insertados por la prueba
- **WHEN** el invitado llama `POST /orders` con su JWT, la sesión y dos ítems, uno con la opción y un valor elegidos
- **THEN** la réplica responde 201 con el pedido en `pending`, su `userId`, el `restaurantId` de la mesa y el árbol de ítems con el producto, la opción y el valor (DP-75)
- **AND** el pedido, sus líneas y la opción elegida están en `order`, `order_product_details`, `order_product_option` y la intermedia de valores
- **AND** el mozo del restaurante llama T05 y la mesa no muestra el pedido, y `total` sigue en `"0.00"`
- **AND** la respuesta valida contra la entrada de `POST /orders` en `docs/api/openapi.yaml`

#### Scenario: `POST /orders` rechaza a quien no está en la sesión

- **GIVEN** una sesión activa y un invitado que no se unió a ella
- **WHEN** ese invitado llama `POST /orders` con su JWT y esa sesión, y otra vez sin JWT
- **THEN** la réplica responde 403 y 401, y no crea ningún pedido (DP-75)

#### Scenario: `POST /orders` rechaza un cuerpo inválido o una sesión que no sirve

- **GIVEN** un invitado unido a una mesa
- **WHEN** llama `POST /orders` sin ítems, con una cantidad 0, con un producto de otro restaurante, con un valor que no es de la opción, con una sesión que no existe y con una sesión cerrada por la prueba
- **THEN** la réplica responde 400, 400, 400, 400, 404 y 409, con un mensaje que nombra el motivo, y no crea ningún pedido (DP-75)

### Requirement: Contrato `PUT /orders/:id/confirm` y el evento T16

Fuente: contexto, C4, sección 4 (`pending` → `confirmed`), "Origen de los eventos que escucha el panel" (`order-confirmed-notification`), sección 5; DP-53; `modelo-de-datos.md`, 2.4 y 2.6.

La réplica SHALL atender `PUT /orders/:id/confirm` con **J + R**, roles `admin` y `user`: el mozo no confirma pedidos. Al confirmar, SHALL pasar el pedido de `pending` a `confirmed`, fijar `confirmedAt` (la base del cronómetro, C3), recalcular `table_session.total` y emitir `order-confirmed-notification` (T16) a los suscriptores de `/sse/waiters` del restaurante del pedido.

- **Cuerpo y respuesta (DP-76):** sin body; **200** con el pedido, en la forma de `POST /orders`.
- **Total (DP-77):** suma, en los pedidos `confirmed` e `in_kitchen` de la sesión, de `(product.price + suma de los price de los valores elegidos) × quantity`, con dos decimales.
- **Evento (DP-78):** `data` = `{"body": "<JSON en string>"}`, y el JSON de adentro es `{"orderId": number, "tableNumber": number, "tableSessionId": number, "restaurantId": "<uuid>", "confirmedAt": "<ISO 8601 en UTC con milisegundos>"}`. Solo al restaurante del pedido.
- **Rechazos (DP-76):** **403** si el rol no es `admin` ni `user`, o si un `user` no está en la sesión del pedido; **404** si el pedido no existe; **409** si no está `pending`. Ninguno cambia el pedido ni emite el evento.

#### Scenario: `confirm` confirma el pedido, recalcula el total y emite T16

- **GIVEN** un mozo del restaurante con `/sse/waiters` abierto con su JWT en el encabezado, y un mozo de otro restaurante con su stream abierto
- **AND** un invitado unido a una mesa del restaurante, con un pedido `pending` de dos unidades de un producto de precio 4500 y un valor de opción de precio 0
- **WHEN** el invitado llama `PUT /orders/<id>/confirm` con su JWT
- **THEN** la réplica responde 200 con el pedido en `confirmed` y `confirmedAt` (DP-76)
- **AND** la sesión queda con `total` `"9000.00"` (DP-77), y T05 muestra el pedido en la mesa
- **AND** el stream del restaurante recibe `order-confirmed-notification` con `data.body` igual al JSON de `{orderId, tableNumber, tableSessionId, restaurantId, confirmedAt}` del pedido (DP-78), que valida contra su esquema en `docs/api/openapi.yaml`
- **AND** el stream del otro restaurante no recibe ningún evento

#### Scenario: El mozo no confirma pedidos

- **GIVEN** un pedido `pending` y un mozo de su restaurante con su JWT
- **WHEN** el mozo llama `PUT /orders/<id>/confirm`
- **THEN** la réplica responde 403, el pedido sigue `pending` y no se emite T16 (contexto, sección 4; DP-76)

#### Scenario: `confirm` rechaza un pedido que no está `pending`, que no existe o que es de otra sesión

- **WHEN** el invitado confirma un pedido ya `confirmed`, un id que no existe, y un pedido de una sesión a la que no se unió
- **THEN** la réplica responde 409, 404 y 403, no cambia ningún pedido ni `total`, y no emite T16 (DP-76)

### Requirement: Contrato `POST /payments/in-person-request` y el evento T17

Fuente: contexto, 3.3 (Redis), "Origen de los eventos que escucha el panel" (`in-person-payment-request`), sección 4 ("Ciclo de una solicitud de pago presencial"), sección 0 ("Validación"); `modelo-de-datos.md`, 3.1; DP-53.

La réplica SHALL atender `POST /payments/in-person-request` con **J**, guardar la solicitud en Redis bajo la clave `in-person-request:restaurant-<restaurantId>:<requestId>`, con el vencimiento `REDIS_EXPIRATION_TIME` (3600 s si está vacía), y emitir `in-person-payment-request` (T17) a los suscriptores de `/sse/waiters` del restaurante.

- **Sin validar (contexto, 3.3):** guarda el body tal como llega, con los campos de `InPersonPaymentRequestDto`, aunque `userId` sea `"guest"` o traiga campos de más; si el body es `{body: "<JSON>"}`, guarda el JSON de adentro.
- **`id`, respuesta y evento (DP-79):** el `id` lo genera la réplica (uuid v4) y reemplaza al del body. **201** con la solicitud guardada; el evento lleva esa misma solicitud en `data` y va al restaurante de `restaurantId` del body.
- **Rechazos (DP-79):** **400** si falta `restaurantId` (un string no vacío), porque sin él no hay clave; **401** sin JWT. Ninguno guarda ni emite.
- **Vencimiento inválido (DP-80):** si `REDIS_EXPIRATION_TIME` no es un entero positivo, la réplica no arranca y lo dice nombrando la variable.

#### Scenario: La solicitud se guarda en Redis con su vencimiento y emite T17

- **GIVEN** un mozo del restaurante con `/sse/waiters` abierto, y un invitado unido a una mesa del restaurante
- **WHEN** el invitado llama `POST /payments/in-person-request` con su JWT y `{userId, userName, restaurantId, tableNumber, tableSessionId, amount: 2200, noTipAmount: 2000, method: "Cash"}`
- **THEN** la réplica responde 201 con la solicitud y un `id` uuid (DP-79)
- **AND** en Redis está la clave `in-person-request:restaurant-<restaurantId>:<id>` con ese JSON, y su TTL está entre `REDIS_EXPIRATION_TIME` − 5 y `REDIS_EXPIRATION_TIME` segundos (3600 si la variable está vacía)
- **AND** el stream del mozo recibe `in-person-payment-request` con la misma solicitud en `data`, que valida contra su esquema en `docs/api/openapi.yaml`
- **AND** el mozo llama T06 y la solicitud está en la respuesta

#### Scenario: La solicitud se guarda sin validar, también envuelta en `body`

- **GIVEN** un invitado con su JWT
- **WHEN** llama `POST /payments/in-person-request` con `userId: "guest"` y un campo que la interfaz no declara, y otra vez con `{body: "<el JSON de una solicitud>"}`
- **THEN** la réplica responde 201 las dos veces y guarda en Redis cada solicitud tal como llegó, la segunda sin el envoltorio `body` (contexto, 3.3)

#### Scenario: La solicitud sin `restaurantId` o sin JWT se rechaza

- **WHEN** un invitado llama `POST /payments/in-person-request` con su JWT y sin `restaurantId`, y otra vez sin JWT
- **THEN** la réplica responde 400 y 401, no escribe ninguna clave en Redis y no emite T17 (DP-79)

### Requirement: Contrato T06 · `GET /payments/in-person-requests`

Fuente: contexto, C9, T06, 3.3 (Redis: `SCAN` + `GET`); DP-53.

La réplica SHALL atender `GET /payments/in-person-requests` con **J** y sin `RolesGuard`, y SHALL devolver las solicitudes de cobro guardadas en Redis para el restaurante del usuario (`in-person-request:restaurant-<restaurante del usuario>:*`), incluidas las de MercadoPago (`mp-…`), y ninguna de otro restaurante.

- **Forma (DP-81):** **200** con un arreglo de solicitudes, cada una el JSON guardado, sin orden garantizado. Sin solicitudes, `[]`. Un valor que no es JSON se omite y se anota en el registro de la réplica.
- **Sin restaurante (DP-81):** **403**, como el stream (DP-64).

#### Scenario: T06 devuelve las solicitudes del restaurante del mozo

- **GIVEN** dos restaurantes con un mozo cada uno, y en Redis, escritas por la prueba, una solicitud de cada restaurante y una de MercadoPago (`mp-<userId>-<sessionId>-<timestamp>`, `method: "Mercadopago"`) del primero
- **WHEN** el mozo del primer restaurante llama `GET /payments/in-person-requests`
- **THEN** la réplica responde 200 con las dos solicitudes de su restaurante, en cualquier orden, y ninguna del otro (DP-81)
- **AND** la respuesta valida contra la entrada de T06 en `docs/api/openapi.yaml`

#### Scenario: T06 sin solicitudes y sin restaurante

- **WHEN** un mozo de un restaurante sin solicitudes llama T06, y un usuario sin restaurante llama T06
- **THEN** la réplica responde 200 con `[]` al mozo y 403 al usuario sin restaurante (DP-81)

### Requirement: Contrato T07 · `GET /table-sessions/:id/payments`

Fuente: contexto, C10, T07, O2; `modelo-de-datos.md`, 2.13; DP-50, DP-53.

La réplica SHALL atender `GET /table-sessions/:id/payments` con **J** y `@Roles(admin, waiter, backoffice)` **sin** `RolesGuard`, y SHALL devolver los pagos de la sesión `:id`.

**O2, reproducido a propósito (DP-50):** como en el contexto, el `@Roles` no restringe y no se verifica que la sesión sea del restaurante del usuario: cualquier JWT válido, incluido el de un invitado, lee los pagos de cualquier sesión. No es un fallo de la réplica: la app lo rodea (C10) y SEG-c2 lo comprueba en TK-13.

- **Forma (DP-82):** **200** con un arreglo de `payment` por `createdAt` y `id` ascendente, cada uno con sus columnas (`amount` string, como todo `decimal`) y `user` con su `restaurant`; `user` es `null` en los pagos manuales (C10). Sin pagos o con una sesión que no existe, `[]`.

#### Scenario: T07 devuelve los pagos de la sesión

- **GIVEN** una sesión con un pago manual (`method: "cash"`, sin `userId`) y un pago de un comensal (`method: "POS"`), insertados por la prueba, y un mozo de su restaurante con su JWT
- **WHEN** el mozo llama `GET /table-sessions/<id>/payments`
- **THEN** la réplica responde 200 con los dos pagos por `createdAt`, `amount` como string, `user: null` en el manual y el comensal en el otro (DP-82)
- **AND** la respuesta valida contra la entrada de T07 en `docs/api/openapi.yaml`

#### Scenario: T07 reproduce O2 a propósito

- **GIVEN** la sesión del scenario anterior, un invitado de `/auth/guest` y un mozo de otro restaurante, cada uno con su JWT
- **WHEN** cada uno llama `GET /table-sessions/<id>/payments`
- **THEN** la réplica responde 200 con los mismos dos pagos a los dos: `@Roles` sin `RolesGuard` y sin chequeo de restaurante (O2, reproducido a propósito, DP-50)

#### Scenario: T07 sin JWT o de una sesión sin pagos

- **WHEN** se llama T07 sin JWT, y con el JWT del mozo para una sesión que no existe
- **THEN** la réplica responde 401 y 200 con `[]` (DP-82)

## MODIFIED Requirements

### Requirement: Contrato del stream `GET /sse/waiters`

Fuente: contexto, T16, T17, 3.1 ("Streams y eventos SSE"), 3.3 ("Memoria del proceso"), sección 5, C4 y C9; 0008; DP-53.

La réplica SHALL atender `GET /sse/waiters` con **J**, sin roles, como un stream de eventos (`text/event-stream`) del restaurante del usuario. SHALL alimentarlo con un `Subject` por restaurante en la memoria del proceso: todo evento llega a todos los suscriptores de ese restaurante, sin heartbeat ni replay, y un evento sin suscriptores se pierde. SHALL aceptar el JWT en el encabezado `Authorization: Bearer` (0008) o en `?token=`, y con un JWT vencido SHALL responder 401 **antes** de abrir el stream. Con un JWT válido de un usuario sin restaurante SHALL responder 403, también antes de abrirlo (DP-64); la app no llega a ese caso.

Los eventos que lleva, y su `data` tal como la fija el contexto, los emiten los endpoints de cada ticket (DP-53):

| Evento | `data` | Lo emite | Ticket |
|---|---|---|---|
| `order-confirmed-notification` | `{"body":"<JSON en string>"}` con `{orderId, tableNumber, tableSessionId, restaurantId, confirmedAt}` (C4; tipos y formato en DP-78) | `PUT /orders/:id/confirm` | TK-03 |
| `in-person-payment-request` | la solicitud de cobro guardada en Redis (contexto, 3.3; DP-79) | `POST /payments/in-person-request` | TK-03 |
| `in-person-payment-request-deleted` | `{requestId, restaurantId}` (C9) | `DELETE /payments/in-person-requests/:requestId` (T13) | TK-13 |

Los dos eventos de TK-03 SHALL tener su esquema en `components.schemas` de `docs/api/openapi.yaml`, y la descripción del stream SHALL nombrarlos. El de TK-13 lo agrega ese ticket.

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

#### Scenario: Los esquemas de T16 y T17 están en el OpenAPI

- **WHEN** se lee `docs/api/openapi.yaml`
- **THEN** `components.schemas` tiene el esquema de `order-confirmed-notification` (con `body` string y el esquema de su JSON de adentro) y el de `in-person-payment-request`, y la descripción de `GET /sse/waiters` nombra los dos eventos
