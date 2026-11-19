## Why

TK-03 ([issue #4](https://github.com/MauroUX/tabbie-waiter/issues/4), [ticket](../../../docs/backlog/tickets/TK-03-simulador-mesas-pedidos-y-cobros.md)) arma el simulador de comensales con lo mínimo que piden los criterios del skeleton: ocupar mesas (ESC-1), confirmar pedidos (ESC-2) y pedir cobros presenciales (ESC-5), con la hora de cada petición en el registro del turno. Para eso construye en la réplica los endpoints del comensal que esos escenarios usan, y T06 y T07, según el reparto de DP-53.

Sin este cambio la réplica de TK-01 y TK-02 arranca con los datos iniciales, pero ninguna mesa se ocupa, ningún pedido se confirma y ninguna solicitud de cobro llega: T05 devuelve `[]`, y `/sse/waiters` nunca emite T16 ni T17. TK-05 no tiene qué medir para WS-c1, WS-c2 y WS-c3. Además despeja el riesgo técnico del skeleton "Unirse a la mesa y autenticar al comensal" ([walking-skeleton.md](../../../docs/architecture/walking-skeleton.md), sección 6.1).

## What Changes

- **Siete endpoints nuevos en la réplica** (`replica/src/`), con las rutas, los cuerpos y los eventos del contexto, cada uno con su prueba de contrato y su entrada generada en `docs/api/openapi.yaml` (DP-52):
  - `POST /auth/guest` (la ruta de T02): el JWT de invitado, con rol `user` y sin Firebase (DP-17);
  - `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber`, sin guard y con el comensal en el body: la mesa pasa a estar activa (DP-18);
  - `POST /orders`: el pedido nace `pending`;
  - `PUT /orders/:id/confirm` (J + R, `admin` y `user`): fija `confirmedAt` y emite `order-confirmed-notification` (T16) por `/sse/waiters`;
  - `POST /payments/in-person-request` (J): guarda la solicitud en Redis con el vencimiento `REDIS_EXPIRATION_TIME` y emite `in-person-payment-request` (T17);
  - T06, `GET /payments/in-person-requests` (J, sin `RolesGuard`);
  - T07, `GET /table-sessions/:id/payments`, con `@Roles` y **sin** `RolesGuard`: **reproduce O2 a propósito** (DP-50). No es un fallo de la réplica: la app lo rodea y SEG-c2 (TK-13) lo comprueba.
- **El esquema de los dos eventos** en `docs/api/openapi.yaml` (`order-confirmed-notification` e `in-person-payment-request`), que TK-01 dejó para el ticket que los emite.
- **El simulador de comensales** en `simulator/` (no existe todavía): línea de comandos, sesión del comensal, cliente HTTP del comensal, ESC-1, ESC-2, ESC-5 y el registro del turno, en TypeScript sobre Node 20, en contenedor como la réplica (0003). El registro del turno es un archivo JSON Lines en `simulator/registros/`, que no entra al repo.
- **Pruebas:** las del contrato de cada endpoint en `replica/tests/contrato/` (DP-14), empezando por el riesgo técnico; las de los escenarios en `simulator/test/`, un proyecto aparte que corre la línea de comandos contra la réplica cargada y comprueba el efecto con T05, T06 y `/sse/waiters`, con el JWT del primer mozo del restaurante 1 firmado por la prueba (DP-15).
- **`compose.yaml`:** el servicio `simulador` (perfil `simulador`) y el de sus pruebas, `pruebas-simulador` (perfil `pruebas`).
- **CI:** la suite del simulador corre después de la de la réplica, sobre la misma base cargada.
- **Documentación:** `infraestructura.md` (cómo se corre el simulador), `AGENTS.md` (los comandos nuevos), `estructura.md` (`simulator/test/` y `simulator/registros/`), `componentes.md` si los endpoints quedan distintos de DP-17 y DP-18, y los huecos resueltos como DP en `docs/backlog/tickets/README.md`.

## Capabilities

### New Capabilities

- `simulador-comensales`: el simulador de comensales por línea de comandos, sus escenarios ESC-1, ESC-2 y ESC-5 y el registro del turno. Lleva los scenarios de WS-c1, WS-c2 y WS-c3 en la parte que hereda el ticket, los de su DoD propia y los de los criterios extra del humano.

### Modified Capabilities

- `contrato-replica`: suma una entrada por cada endpoint que construye este cambio (`POST /auth/guest`, `/join`, `POST /orders`, `PUT /orders/:id/confirm`, `POST /payments/in-person-request`, T06 y T07), con sus huecos resueltos; y cambia la entrada del stream `/sse/waiters`, que ahora emite T16 y T17 con el esquema de cada evento. Ninguna ruta, cuerpo ni evento del contexto cambia (DP-49).

## No-alcance

Lo que este cambio **no** hace (ticket, "No incluye"):

- **ESC-4, ESC-7, ESC-8 y los cobros de otra tablet:** TK-08, con sus endpoints (T08, T09, T11, T14 y `request-help`).
- **ESC-6, la solicitud de MercadoPago y el cierre desde otra tablet:** TK-13, con T12, T13 e `in-person-payment-request-deleted`. Este cambio deja que `POST /payments/in-person-request` guarde el body sin validar, como el contexto, así que ESC-6 no necesita nada nuevo de la réplica.
- **Las comprobaciones de O1 a O4 como huecos de seguridad (SEG-c1 a SEG-c4):** TK-08 y TK-13. Acá T07 solo reproduce O2.
- **ESC-3 y ESC-9 a ESC-11, y la medición de M-1 a M-3:** ampliación.
- **La medición de los 2 s de WS-c2 y WS-c3:** es de TK-05, con la app en el emulador. Este cambio deja la hora de la petición en el registro y prueba que el evento sale.
- **Cerrar una mesa:** T14 es de TK-08. Las mesas que ocupa el simulador quedan ocupadas hasta recrear la base (`carga-desde-cero.sh` o `down -v`).
- **Ningún componente de la app**, ni la sección "Comandos" de la app.
- **El código de Tabbie no se lee** (0010): lo que el contexto no fija está en `design.md`, "Huecos del contrato", y el humano lo decidió como DP-72 a DP-82.

## Impact

- **Carpetas nuevas:** `simulator/` (proyecto, `src/`, `test/`, `Dockerfile`), `simulator/registros/` (ignorada por `.gitignore`).
- **`replica/src/`:** `AuthModule` (`/auth/guest`), `TableSessionModule` (`/join` y T07), `OrderModule` (`POST /orders` y `confirm`), `PaymentModule` (`in-person-request` y T06), `SseModule` (los esquemas de los eventos) y `config/entorno.ts` (`REDIS_EXPIRATION_TIME`). Sin migraciones: las 13 tablas ya existen (TK-01).
- **`replica/tests/`:** pruebas de contrato nuevas en `contrato/`. Las existentes no cambian.
- **`compose.yaml`** y **`.github/workflows/replica.yml`**.
- **Archivos locales de variables:** no hace falta agregar ninguna. `REDIS_EXPIRATION_TIME` ya está en `compose.yaml`, en los ejemplos y en la CI, y vacía vale 3600 s. El humano confirma que `JWT_EXPIRATION` tiene valor en `pruebas.env` y `local.env`, porque el JWT de invitado vence con ella (ver `design.md`, "Paradas del humano").
- **Documentos:** `docs/architecture/infraestructura.md`, `estructura.md`, `componentes.md` (si hace falta), `AGENTS.md` y `docs/backlog/tickets/README.md` (los DP nuevos).
