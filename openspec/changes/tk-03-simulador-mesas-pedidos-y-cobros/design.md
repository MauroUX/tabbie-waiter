## Context

- La réplica de TK-01 atiende T01, T05 y `/sse/waiters`, con los guards y las 13 tablas; TK-02 la carga con dos restaurantes, sus mesas, su menú y cinco usuarios con IDs fijos (DP-70, DP-71). El `SseService` ya tiene `emitir(restauranteId, evento)`, sin nadie que lo llame.
- `simulator/` no existe. `estructura.md` lo ubica en la raíz, como CLI en TypeScript sobre Node 20 (0002, 0003).
- La máquina no tiene Node 20: todo corre en contenedores de Node 20 (0003), con la imagen fijada en `replica/Dockerfile` (`node:20.20.2-bookworm-slim` y su digest).
- `JwtStrategy` responde 401 si el `userId` del JWT no está en `user` (DP-57). El contexto dice que T02 "firma un JWT de invitado sin acceder a la base". Las dos cosas no caben juntas: lo resolvió DP-72.
- La suite de la réplica supone una base recién cargada: `replica/tests/datos/contenido.test.ts` exige cinco usuarios y ninguna fila en `table_session`, `order` ni `payment` (infraestructura.md, 2.1). Todo lo que el simulador crea rompe esa foto hasta recrear la base.
- La réplica es propia (0010): lo que el contexto no fija es un hueco, y el humano lo decidió en el gate 1 (sección "Huecos del contrato": DP-72 a DP-82). El código de Tabbie no se leyó.

## Goals / Non-Goals

**Goals:**

- Despejar primero el riesgo técnico del skeleton: un invitado de `POST /auth/guest` se une a una mesa libre y la mesa aparece en T05 (walking-skeleton.md, 6.1).
- Que ESC-1, ESC-2 y ESC-5 se corran desde la línea de comandos, sin tocar código, contra la réplica cargada desde cero, y que T16 y T17 lleguen por `/sse/waiters`.
- Un registro del turno con la hora de cada petición, en el reloj de la máquina, que TK-05 pueda leer para medir WS-c2 y WS-c3.
- Siete endpoints con su contrato fijado por pruebas antes del código, y el OpenAPI regenerado sin diferencias (DP-52).

**Non-Goals:**

- Ver `proposal.md`, "No-alcance". Además: el simulador no lee MySQL ni Redis (eso es la Medición de ESC-11, en la ampliación), y no usa la cuenta de ningún mozo.

## Decisions

### D1 · El simulador en contenedor (0003)

- **Proyecto:** `simulator/package.json` (TypeScript, `"engines": {"node": ">=20 <21"}`), `simulator/tsconfig.json`, `simulator/src/` y `simulator/Dockerfile`, multi-etapa (`build` y `runtime`) sobre la misma imagen de Node 20, con su digest, que `replica/Dockerfile`. `npm run build` deja la línea de comandos en `dist/cli.js`. Sin dependencias de ejecución salvo las que pida la línea de comandos: el cliente HTTP es el `fetch` de Node 20.
- **Componentes** ([componentes.md](../../../docs/architecture/componentes.md), sección 3), un módulo cada uno en `simulator/src/`: línea de comandos, sesión del comensal, cliente HTTP del comensal, escenarios (`esc-1`, `esc-2`, `esc-5`) y registro del turno.
- **Cómo se corre:** el servicio `simulador` de `compose.yaml`, perfil `simulador`, con `REPLICA_URL=http://replica:3000` y `./simulator/registros` montada en `/registros`. No necesita ningún secreto: no firma JWT ni lee la base.
- **Alternativa descartada:** correr el simulador con Node en la máquina (rompe 0003) o como script dentro de `replica/tests/` (mezcla el simulador con las pruebas de la réplica, y `estructura.md` lo pone aparte).

### D2 · La línea de comandos

```text
simulador esc-1 --mesa <n> [--restaurante <uuid>] [--comensales <n>]
simulador esc-2 --mesa <n> [--restaurante <uuid>] [--pedidos <n>] [--productos <id>[x<cantidad>],...]
simulador esc-5 --mesa <n> --monto <n> [--restaurante <uuid>] [--propina <n>] [--metodo POS|Cash]
                [--pedidos-cubiertos <id>,...] [--lineas-cubiertas <id>,...]
Opciones comunes: [--registro <ruta>] [--replica <url>]
```

- **Valores por defecto:** `--restaurante` es el restaurante 1 (`11111111-1111-4111-8111-111111111111`, DP-71); `--comensales 1`; `--pedidos 1`; `--productos 1` (la Provoleta del restaurante 1, DP-70: en el restaurante 2 hay que pasar uno suyo); `--propina 0`; `--metodo POS`; `--registro /registros/turno-<AAAA-MM-DD>.jsonl` (fecha UTC); `--replica` sale de `REPLICA_URL`.
- **Cada escenario es completo:** ESC-2 y ESC-5 también entran como invitado y se unen a la mesa (un comensal nuevo), porque cada corrida es un proceso aparte y no guarda el JWT de la anterior. Si la mesa ya está ocupada, el comensal se suma a su sesión (DP-74).
- **ESC-1:** `--comensales` invitados, cada uno con su `guestId` generado (`randomUUID()`), entran por `POST /auth/guest` y se unen con `/join`.
- **ESC-2:** un comensal; `--pedidos` veces, `POST /orders` con `--productos` y `PUT /orders/:id/confirm`.
- **ESC-5:** un comensal; `POST /payments/in-person-request` con `amount = monto + propina`, `noTipAmount = monto`, `method`, `userId` del comensal, `userName = "Invitado <primeros 8 del guestId>"`, `restaurantId`, `tableNumber`, `tableSessionId` y, si se pasan, `orderIds` y `lineItemIds`. No manda `prepaid`.
- **Salida:** al terminar bien, una línea en stdout con lo creado (`tableSessionId`, los `orderId`, el `requestId`) y código **0**. Una petición rechazada (4xx o 5xx) o sin respuesta termina el escenario en ese punto, con un mensaje en stderr que nombra el escenario, la petición, el código y el mensaje de la réplica, y código **1**. Argumentos inválidos: mensaje con el uso y código **2**, sin mandar ninguna petición.
- **Cliente HTTP del comensal:** sin reintentos, ni propios ni de la librería, con un tiempo de espera de 10 s por petición (como las acciones de la app, DP-26). Nunca repite una petición (RNF-6).

### D3 · El registro del turno

- **Formato:** JSON Lines, una línea por petición, que se agrega al archivo de `--registro`:

  ```json
  {"hora":"2026-11-19T20:15:03.123Z","escenario":"esc-2","peticion":"PUT /orders/:id/confirm","restaurantId":"11111111-1111-4111-8111-111111111111","mesa":3,"comensal":{"userId":42,"guestId":"3f2c…"},"tableSessionId":7,"orderId":15,"requestId":null,"monto":null,"estado":200,"resultado":"ok","mensaje":null}
  ```

- **`hora`:** la del reloj del contenedor justo antes de mandar la petición, en UTC con milisegundos. Es el "desde cuándo" de WS-c2 y WS-c3 (walking-skeleton.md, sección 4).
- **`resultado`:** `ok`, `rechazada` (con `estado` y el `mensaje` de la réplica) o `sin respuesta` (`estado: null` y el motivo).
- **Lo que no anota:** el JWT, la URL con el token, emails ni datos de la réplica fuera de los IDs. El `guestId` es un id aleatorio, no un dato personal.
- **Fuera del repo:** `simulator/registros/` va en `.gitignore` y el servicio la monta en `/registros`. El registro de una corrida no entra a ningún commit; el directorio queda con un `.gitkeep` para que exista.
- **Alternativa descartada:** un registro por corrida en stdout (no se junta un turno de varias corridas) o en SQLite (otra dependencia, y nadie lo consulta con SQL).

### D4 · Las pruebas del simulador (`simulator/test/`)

- **Proyecto aparte**, como `replica/tests/`: `simulator/test/package.json`, `jest.config.ts`, `tsconfig.json`, `apoyo/` y su `Dockerfile`, construido con el contexto `./simulator`: una etapa corre `npm ci && npm run build` del simulador y la otra instala las dependencias de las pruebas y copia `dist/`. Las pruebas **no importan** nada de `simulator/src/`: corren `node dist/cli.js` con sus argumentos, leen el archivo del registro y comprueban el efecto por HTTP.
- **Servicio:** `pruebas-simulador` de `compose.yaml`, perfil `pruebas`, con `REPLICA_URL`, `JWT_SECRET` y `--runInBand`.
- **Las comprobaciones** usan T05 y T06 y abren `/sse/waiters` **con el JWT del primer mozo del restaurante 1** (`userId: 1`, rol `waiter`, DP-71), firmado por la prueba con el `JWT_SECRET` del perfil y los claims de DP-57, con fechas literales, igual que `replica/tests/apoyo/jwt.ts` (DP-15). No hace falta Firebase.
- **Base recién cargada:** un `globalSetup` comprueba con T05 que el restaurante 1 no tiene mesas ocupadas; si las tiene, la suite falla con el mensaje "la suite del simulador supone una base recién cargada: corré carga-desde-cero.sh". Los escenarios van en un solo archivo, en orden (WS-c1 primero), y usan mesas distintas: 1 y 2 para WS-c1, 3 para WS-c2, 4 para WS-c3, 5 para los parámetros y 99 (inexistente) para el rechazo.
- **Orden de las suites:** la de la réplica primero (exige la foto de la carga), la del simulador después. Para volver a correr cualquiera de las dos hay que recrear la base.

### D5 · El riesgo técnico, primero

- Su prueba es la primera de `tasks.md` y vive en `replica/tests/contrato/`, con su propio restaurante, su mesa libre y su mozo insertados por la prueba: no depende de la base cargada ni del simulador.
- El `implementer` corre en dos fases: primero `POST /auth/guest` y `/join`, hasta que esa prueba pasa; después el resto. Si el riesgo no se despeja, se para y se le lleva al humano antes de construir lo demás.

### D6 · Los dos eventos en el OpenAPI

- `docs/api/openapi.yaml` suma dos esquemas en `components.schemas`, con `@ApiExtraModels`: `EventoPedidoConfirmado` (`{body: string}`, con la descripción del JSON de adentro y un esquema aparte, `CuerpoDePedidoConfirmado`, para `{orderId, tableNumber, tableSessionId, restaurantId, confirmedAt}`) y `EventoSolicitudDeCobro` (la solicitud de 3.3). La descripción del stream los nombra.
- Las pruebas validan el `data` de cada evento recibido contra su esquema, con Ajv, como las respuestas HTTP.

### D7 · Compose, CI y comandos para `AGENTS.md`

- **`compose.yaml`:** `simulador` (perfil `simulador`) y `pruebas-simulador` (perfil `pruebas`), los dos con `depends_on` la réplica sana y la carga terminada.
- **CI (`replica.yml`):** después de "Suite de contrato", un paso "Suite del simulador" con el mismo perfil de pruebas, sobre la misma base.
- **Comandos** (se confirman con la salida real al cerrar):

```powershell
docker compose --env-file replica/entornos/pruebas.env --profile simulador run --rm --build simulador esc-1 --mesa 1 --comensales 2
docker compose --env-file replica/entornos/pruebas.env --profile simulador run --rm --build simulador esc-2 --mesa 1
docker compose --env-file replica/entornos/pruebas.env --profile simulador run --rm --build simulador esc-5 --mesa 1 --monto 2000 --propina 200 --metodo Cash
docker compose --env-file replica/entornos/pruebas.env --profile pruebas run --rm --build pruebas-simulador
```

### D8 · `REDIS_EXPIRATION_TIME`

- `config/entorno.ts` la lee: vacía o ausente vale **3600** s (contexto, 3.3); un entero positivo son segundos; cualquier otro valor termina el arranque con un error que nombra la variable, sin mostrar el valor (DoD de Backend). Es DP-80 (H-9).
- **No hace falta tocar los archivos locales:** `compose.yaml` ya pasa la variable, los ejemplos la nombran (DP-63) y la CI escribe `30`. La prueba del vencimiento lee la misma variable que la réplica y espera su valor, o 3600 si está vacía, así que pasa con cualquier perfil válido. Solo es una parada si la réplica no arranca porque el valor local no es un entero (ver "Paradas del humano").

## Huecos del contrato

Lo que el contexto no fija en los endpoints que construye este cambio ([índice de tickets](../../../docs/backlog/tickets/README.md#decisiones-tomadas-2026-11-17), "Huecos del contrato"). El humano aprobó las propuestas: H-1 a H-11 son DP-72 a DP-82 en `docs/backlog/tickets/README.md`, y las specs citan cada DP. No se leyó el código de Tabbie. La réplica puede diferir de Tabbie en estos puntos y, si difiere, se ajusta al conectar con el backend real (DP-48); ninguno es una ruta que use la app, salvo T06 y T07.

| Hueco | Qué falta | Decisión | Alternativa descartada |
|---|---|---|---|
| **H-1 → DP-72** · `/auth/guest`, ¿escribe en `user`? | El contexto dice que T02 firma el JWT sin acceder a la base, pero `JwtAuthGuard` responde 401 si el `userId` no está en `user` (DP-57), y `order.userId`, `table_session_users_user` y la solicitud de cobro necesitan un usuario | **Inserta una fila `user`** con `isGuest = true`, rol `user`, sin restaurante, `name` nulo y email `invitado.<guestId>@example.com` (PR-3), o la reusa si ese `guestId` ya entró; firma el JWT con `{userId, role}`. Diverge del contexto en una ruta que la app no usa | Un JWT sin fila y un `JwtAuthGuard` que deja pasar invitados sin buscarlos: cambia DP-57 y el guard de TK-01, y `/join` igual tiene que crear la fila |
| **H-2 → DP-73** · `/auth/guest`, cuerpo, respuesta y rechazos | El formato de `guestId` y la respuesta | Body `{guestId}` (contexto, T02), un string de 1 a 64 caracteres `[A-Za-z0-9-]`. **201** con la forma de T01 (DP-56): `{"access_token", "user": {"id", "email", "name", "role": "user", "restaurantId": "-1"}}`. Vence con `JWT_EXPIRATION`, como todo rol que no es `waiter`. Sin `guestId` o con otro formato: **400**. Público, sin Firebase | 200; un `guestId` sin formato, que termina en el email |
| **H-3 → DP-74** · `/join`, cuerpo, respuesta y rechazos | Qué es "el comensal en el body", qué devuelve y qué pasa con una mesa ocupada | Body `{userId}` (el `user.id` de `/auth/guest`). Mesa libre: crea la `table_session`, pone `isBusy = true` y `activeSessionId`, y suma al comensal; mesa ocupada: lo suma a la sesión activa, sin duplicarlo. Todo en una transacción con la fila de la mesa bloqueada, para que dos comensales a la vez no abran dos sesiones. **201** con la sesión: sus columnas y `users[]`, cada uno con sus columnas y su `restaurant`, como `activeSession` en T05. Body sin `userId` entero: **400**; restaurante, mesa o usuario inexistente: **404**. Sin guard (contexto) | El comensal con `guestId` y nombre en el body; 409 con la mesa ocupada (rompe HU-02.c4, dos comensales en una mesa) |
| **H-4 → DP-75** · `POST /orders`, guards, cuerpo, respuesta y rechazos | Todo: el contexto solo dice que el pedido nace `pending` | **J**, sin roles. Body `{tableSessionId, items: [{productId, quantity, note?, selectedOptions?: [{productOptionId, valueIds: []}]}]}`. `userId` sale del JWT; `restaurantId`, de la mesa de la sesión; `type`, el valor por defecto. **201** con el pedido: sus columnas e `items[]` con el árbol de T05, sin `user`. Rechazos: **400** si no hay ítems, una cantidad no es un entero ≥ 1, el producto no existe o es de otro restaurante, la opción no es del producto o el valor no es de la opción; **404** si la sesión no existe; **409** si está cerrada; **403** si el comensal no está en la sesión | Sin chequeo de sesión (cualquier JWT pide en cualquier mesa); 422 para los cuerpos inválidos |
| **H-5 → DP-76** · `PUT /orders/:id/confirm`, cuerpo, respuesta y rechazos | Si lleva body, qué devuelve y qué rechaza | **Sin body.** **200** con el pedido, en la forma de H-4. Fija `status = confirmed` y `confirmedAt` (UTC, sin fracción, como la columna), recalcula `table_session.total` (H-6) y emite T16 (H-7). Rechazos: **403** si el rol no es `admin` ni `user` (un mozo no confirma, contexto, sección 4) o si un `user` no está en la sesión del pedido; **404** si el pedido no existe; **409** si no está `pending` | 400 para el pedido que no está `pending`; sin chequeo de sesión |
| **H-6 → DP-77** · Cómo se recalcula `total` | El contexto dice qué pedidos cuentan, no cómo se suma | `total` = suma, en los pedidos `confirmed` e `in_kitchen` de la sesión, de `(product.price + suma de los price de los valores elegidos) × quantity`, con dos decimales. La recalculan `confirm` y, cuando existan, los endpoints de TK-08 que la cambian | Solo `product.price × quantity`, sin las opciones |
| **H-7 → DP-78** · Payload completo de T16 | El tipo y el formato de cada campo | `data` = `{"body": "<JSON en string>"}`; el JSON de adentro es `{"orderId": number, "tableNumber": number, "tableSessionId": number, "restaurantId": "<uuid>", "confirmedAt": "<ISO 8601 en UTC con milisegundos>"}`. Se emite solo al restaurante del pedido | `confirmedAt` en milisegundos desde 1970 |
| **H-8 → DP-79** · `POST /payments/in-person-request`, `id`, respuesta y rechazos | Quién genera el `id`, qué devuelve y qué rechaza, si guarda sin validar | Guarda el body **sin validar** (contexto, 3.3), y si trae `{body: "<JSON>"}` guarda el de adentro. El `id` lo genera la réplica (uuid v4) y reemplaza al que traiga el body. La clave es `in-person-request:restaurant-<restaurantId del body>:<id>`, con `EX` = `REDIS_EXPIRATION_TIME`. **201** con la solicitud guardada; T17 lleva esa misma solicitud en `data` y va al restaurante del body. Único rechazo de negocio: **400** si falta `restaurantId` (string no vacío), porque sin él no hay clave. Sin JWT: 401 | Usar el `id` del body si viene (el `:` de un id ajeno rompe la clave); validar el body con un DTO (rompe ESC-6 y RF-25) |
| **H-9 → DP-80** · `REDIS_EXPIRATION_TIME` inválida | Qué hace la réplica con un valor que no es un número | Vacía: 3600 s; un entero positivo: esos segundos; otro valor: no arranca, con un error que nombra la variable (D8) | Usar 3600 en silencio |
| **H-10 → DP-81** · T06, forma, orden y usuario sin restaurante | La forma de la respuesta y qué hace sin restaurante | **200** con un arreglo de las solicitudes del restaurante del usuario, cada una el JSON guardado, **sin orden garantizado** (sale de `SCAN`); incluye las de MercadoPago (`mp-…`). Sin solicitudes: `[]`. Un valor que no es JSON se omite y se anota en el registro de la réplica. Usuario sin restaurante: **403**, con el mismo criterio que DP-64 | `[]` para el usuario sin restaurante; ordenar por `id` |
| **H-11 → DP-82** · T07, forma, orden y sesión inexistente | La forma de la respuesta | **200** con un arreglo de `payment` de la sesión, por `createdAt` y `id` ascendente, cada uno con sus columnas (`amount` string) y `user` con su `restaurant` (`null` en los pagos manuales, C10). Sesión sin pagos o inexistente: `[]`. **O2 a propósito:** sin `RolesGuard` y sin chequeo de restaurante | 404 para la sesión inexistente |

## Risks / Trade-offs

- **[El reloj del contenedor no es el de Windows]** → Docker Desktop corre los contenedores en una VM cuyo reloj puede correrse después de una suspensión. La `hora` del registro es la de esa VM, y WS-c2 mide 2 s contra el emulador. TK-05 ya tiene el riesgo "El reloj del emulador" (walking-skeleton.md, 6.1); este cambio documenta en `infraestructura.md` cómo comparar `docker run --rm <imagen> date -u` con la hora de la máquina antes de medir.
- **[La suite del simulador deja datos]** → mesas ocupadas, invitados, pedidos y solicitudes. Después, la suite de la réplica falla hasta recrear la base. Es lo que ya dice infraestructura.md, 2.1; el `globalSetup` de D4 lo dice en el mensaje, y la CI corre primero la réplica.
- **[Las pruebas de contrato crean invitados]** → `/auth/guest` y `/join` escriben en `user`, `table_session` y la intermedia. Cada prueba borra lo que crearon sus llamadas, incluido cada invitado por su email `invitado.<guestId>@example.com`, para no romper `contenido.test.ts` en la misma corrida.
- **[`--productos 1` por defecto acopla el simulador a los datos iniciales]** → los IDs son fijos por DP-71, y en el restaurante 2 se pasa `--productos`. Si la carga cambia, cambia el valor por defecto.
- **[`JWT_EXPIRATION` vacía en un archivo local]** → `/auth/guest` respondería 500, como T01 para un rol que no es `waiter`. Es una parada (abajo).
- **[El contexto dice que T02 no toca la base, y la réplica sí]** → DP-72. La app no usa `/auth/guest`, así que la diferencia no llega a la app.

## Migration Plan

- **Sin migraciones:** las 13 tablas ya existen (TK-01) y este cambio no agrega columnas.
- **Deshacer los datos que crea el simulador:** recrear la base (`carga-desde-cero.sh` o `down -v` y `up`). No hay otra vuelta atrás, porque T14 es de TK-08.
- **Deshacer el código:** revertir el PR; ningún dato persistente depende de él.

## Paradas del humano

1. **Gate 1 (aprobado):** este change, con los huecos H-1 a H-11, que quedaron como DP-72 a DP-82.
2. **Gate 2:** el plan de `replica-feature`, antes de lanzar `test-writer`.
3. **`JWT_EXPIRATION` en los archivos locales:** el humano confirma que `replica/entornos/pruebas.env` y `local.env` le dan valor. El agente no los lee.
4. **`REDIS_EXPIRATION_TIME` local inválida:** solo si la réplica no arranca por DP-80; el humano corrige su archivo.
5. **El riesgo técnico no se despeja** en la primera fase del `implementer` (D5).
6. **Un test que nace en verde, una disputa del `implementer` o una huella que no cuadra:** se trae tal cual.

## Open Questions

Ninguna. Los huecos H-1 a H-11 son DP-72 a DP-82.
