## Why

TK-01 ([issue #2](https://github.com/MauroUX/tabbie-waiter/issues/2), [ticket](../../../docs/backlog/tickets/TK-01-replica.md)) deja la réplica base corriendo en el entorno local. Sin ella no hay contra qué probar la app (TK-04, TK-05) ni dónde construir los demás endpoints del reparto de DP-53 (TK-03, TK-08, TK-13). Es el primer ticket de código y la primera corrida del harness (`replica-feature`, `test-writer`, `implementer`) sobre código real.

## What Changes

- **Proyecto NestJS propio en `replica/`** con el stack de 0003 (NestJS 10, TypeORM, MySQL 8, Redis 7, Node 20) y su Dockerfile (0010, DP-48).
- **Migraciones de TypeORM** con las 13 tablas del inventario (contexto, 3.2), escritas desde `modelo-de-datos.md`, cada una con su `down`. `synchronize` desactivado (DP-51).
- **T01 · `POST /auth/login`:** canjea el ID token de Firebase por el JWT propio con Firebase Admin, y crea la fila `user` en el primer inicio de sesión de un email. Con `USE_FIREBASE` desactivada, la réplica arranca sin credenciales de Firebase (DP-43).
- **Guards:** `JwtAuthGuard` (JWT del encabezado `Authorization: Bearer` o del query param `?token=`, carga `user` con su `restaurant`) y `RolesGuard` (solo donde figura en `@UseGuards`).
- **T05 · `GET /restaurants/:id/tables/active`:** las mesas activas con sus sesiones, comensales, pedidos y árbol de ítems, con el control del restaurante y los campos de O4 reproducidos a propósito (DP-50).
- **Stream `GET /sse/waiters`** (T16, T17): un `Subject` por restaurante en la memoria del proceso, sin heartbeat ni replay; abre con el JWT en el encabezado (0008) y responde 401 con un JWT vencido antes de abrirse. Sin emisores todavía.
- **`compose.yaml`** con la réplica, MySQL 8 vacío al primer arranque y Redis 7 sin persistencia.
- **`replica/entornos/`:** los ejemplos de los perfiles normal y de pruebas, con los nombres de `infraestructura.md`, sección 5.
- **Pruebas de contrato por HTTP** en `replica/tests/` (DP-14), con el mozo insertado en MySQL y su JWT firmado con el `JWT_SECRET` de la réplica (DP-15), y cada respuesta validada contra `docs/api/openapi.yaml`.
- **`docs/api/openapi.yaml` generado** desde el código con `@nestjs/swagger`, con los campos sensibles marcados `x-sensitive: true` (DP-52).
- **CI** en `.github/workflows/` (DP-11): tests de la réplica, control del OpenAPI y detector de secretos.
- **Detector de secretos** sobre todo el historial y todas las ramas (SEG-c10).
- **Documentación:** `infraestructura.md` con los comandos reales, `estructura.md` si una carpeta queda distinta, y la sección "Comandos" de `AGENTS.md`.

## Capabilities

### New Capabilities

- `replica-base`: la réplica arranca desde cero con `compose.yaml`, corre sus migraciones y no tiene secretos en el repo. Lleva los scenarios de los criterios heredados SEG-c10 y WS-c1 (en parte).
- `contrato-replica`: el contrato HTTP y de eventos que la réplica atiende, tomado del contexto. Este cambio agrega las entradas de T01, T05 y el stream de `/sse/waiters`; los tickets TK-03, TK-08 y TK-13 suman las suyas.

### Modified Capabilities

(Ninguna: `openspec/specs/` está vacío.)

## No-alcance

Lo que este cambio **no** hace (ticket, "No incluye"):

- Los datos iniciales y las cuentas de prueba de Firebase: TK-02. Por eso el canje completo de T01 contra Firebase (y la fila `user` que crea) se prueba en TK-02 (DP-15).
- Los demás endpoints y los eventos que emiten: TK-03, TK-08 y TK-13 (DP-53). El stream queda abierto pero nadie emite en él.
- La comprobación de O1 a O4 (SEG-c1 a SEG-c4), que necesita el simulador: TK-08 y TK-13. Acá T05 solo **devuelve** los campos de O4, a propósito.
- Los escenarios del simulador: TK-03, TK-08 y TK-13.
- Toxiproxy y los cortes de punta a punta: ampliación (DP-04, DP-41).
- El entorno de demo en Railway: final de la ampliación.
- La app: TK-04. El criterio completo de WS-c1 es de TK-05.
- El servicio de carga de los datos iniciales en `compose.yaml`: llega con TK-02 (DP-16).
- `POST /auth/guest` y el JWT de invitado: TK-03.

## Impact

- **Carpetas nuevas:** `replica/` (código, Dockerfile, migraciones, `entornos/`, `tests/`), `compose.yaml`, `docs/api/openapi.yaml`, `.github/workflows/`.
- **Dependencias nuevas:** NestJS 10, TypeORM, mysql2, ioredis, Passport y `@nestjs/jwt`, Firebase Admin, `@nestjs/swagger`, Jest y Supertest; imágenes de Docker de Node 20, MySQL 8, Redis 7 y gitleaks.
- **Contrato:** nace `docs/api/openapi.yaml`, con T01, T05 y el stream. Ninguna ruta, cuerpo ni evento del contexto cambia (DP-49).
- **Documentos:** `docs/architecture/infraestructura.md`, `docs/architecture/estructura.md` (si hace falta), `AGENTS.md` ("Comandos") y la sección 4 del `Readme.md` (tres endpoints, DP-52).
