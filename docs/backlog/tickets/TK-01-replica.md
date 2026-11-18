# TK-01 · Réplica base: proyecto, migraciones, inicio de sesión, mesas activas y stream

| | |
|---|---|
| **Tipo** | Backend (réplica y simulador) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Réplica" en el alcance; [0010](../../adr/0010-replica-propia-desde-el-contrato.md), "Reparto" (DP-53) |
| **Readme.md** | Ticket de backend de la sección 6 |

## Objetivo

Dejar la réplica base corriendo en el entorno local: el proyecto NestJS propio en `replica/`, con sus migraciones, el inicio de sesión, las mesas activas y el stream de eventos de los mozos, construidos desde el contrato del contexto y comprobados por HTTP (0010).

## Criterios heredados

- [SEG-c10](../../architecture/seguridad.md#43-criterios-nuevos) · Los secretos no están en el repo.
- [WS-c1](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app arranca contra la réplica. **En parte:** que la réplica arranca desde cero con `compose.yaml`, corre sus migraciones y atiende T01, T05 y el stream de `/sse/waiters`. El criterio completo es de [TK-05](TK-05-eventos-y-consulta-periodica.md).

## Alcance

**Incluye:**

- **El proyecto NestJS** en `replica/src/`, con el stack de 0003 (NestJS 10, TypeORM, MySQL 8, Redis 7 y Node 20) y su Dockerfile (0010, DP-48).
- **Las migraciones de TypeORM** (DP-51), escritas desde [modelo-de-datos.md](../../architecture/modelo-de-datos.md), solo con las 13 tablas del inventario (contexto, sección 3.2). Cada una dice cómo se deshace. `synchronize` queda desactivado.
- **El inicio de sesión (T01):** `POST /auth/login` canjea el ID token de Firebase por el JWT propio, con Firebase Admin, y crea la fila `user` en el primer inicio de sesión de un email (contexto, C1 y T01). Con `USE_FIREBASE` desactivada, la réplica arranca sin las credenciales de Firebase (DP-43).
- **Los guards:** `JwtAuthGuard`, que toma el JWT del encabezado `Authorization: Bearer` o del query param `?token=` y carga el usuario con su restaurante, y `RolesGuard`, que solo actúa donde se declara (contexto, sección 0, "Convenciones del backend").
- **Las mesas activas (T05):** `GET /restaurants/:id/tables/active`, con el control del restaurante y la respuesta que describe el contexto, incluidos los campos de O4, que se reproducen a propósito (DP-50).
- **El stream `GET /sse/waiters`** (T16, T17), alimentado por un `Subject` por restaurante en la memoria del proceso, sin heartbeat ni replay (contexto, sección 5). Abre con el JWT en el encabezado (0008) y responde 401 con un JWT vencido antes de abrirse (C1). Los eventos los emiten los endpoints que los originan, en [TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md) y [TK-13](TK-13-simulador-pagos.md).
- **`compose.yaml`:** la réplica, construida desde `replica/`; MySQL 8, vacío al primer arranque, y Redis 7, sin persistencia ([infraestructura.md](../../architecture/infraestructura.md), sección 2.1).
- **`replica/entornos/`:** los ejemplos de los dos perfiles, el normal y el de pruebas, con los nombres de las variables de [infraestructura.md](../../architecture/infraestructura.md), sección 5, y sin valores. El perfil de pruebas tiene un vencimiento corto de `REDIS_EXPIRATION_TIME`, para HU-06.h4.
- **Las pruebas del contrato por HTTP**, en `replica/tests/` (DP-14): una por cada pieza de la base. Comprueban el método y la ruta, los guards de la tabla de trazabilidad (sin JWT responde 401 donde hay "J"), los campos del cuerpo que manda la app y los de la respuesta que lee, y validan cada respuesta contra `docs/api/openapi.yaml`.
- **El JWT de mozo de la prueba** (DP-15): la prueba inserta un mozo en MySQL y firma su JWT con el `JWT_SECRET` de la réplica, sin pasar por Firebase.
- **`docs/api/openapi.yaml`, generado** (DP-52) desde el código con `@nestjs/swagger`, con los campos sensibles marcados `x-sensitive: true`. Este ticket resuelve cómo se logra esa marca con el generador. Tres endpoints se copian en la sección 4 del `Readme.md`, cuando existan.
- **La CI** de `.github/workflows/` (DP-11), con el paso que regenera el OpenAPI y falla si difiere del commiteado (DP-52).
- **El detector de secretos** de SEG-c10, sobre todo el historial y todas las ramas.

**No incluye:**

- Los datos iniciales y las cuentas de prueba: [TK-02](TK-02-datos-iniciales.md).
- Los demás endpoints y los eventos que emiten: [TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md), [TK-08](TK-08-simulador-ordenes.md) y [TK-13](TK-13-simulador-pagos.md), según el reparto de DP-53 ([índice](README.md#decisiones-tomadas-2026-11-17)).
- La comprobación de O1 a O4 (SEG-c1 a SEG-c4), que necesita el simulador: TK-08 y TK-13.
- Los escenarios del simulador: TK-03, TK-08 y TK-13.
- Toxiproxy y los cortes de punta a punta: van en la ampliación (DP-04; ver el [índice](README.md), "Fuera de esta descomposición").
- El entorno de demo en Railway: va al final de la ampliación.
- La app: [TK-04](TK-04-app-base.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `replica/src/` (con las migraciones), `compose.yaml`, `replica/entornos/`, `replica/tests/`, `docs/api/` y `.github/workflows/`.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 2): `AppModule`, `AuthModule`, `FirebaseAdminModule`, los guards, `UsersModule`, `RestaurantsModule`, `TableModule`, las entidades de pedidos y productos que trae T05, `SseModule` y `RedisModule`.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad) y del [inventario](../../context/panel-mozos-actual.md#31-endpoints-y-eventos-usados):

- **HTTP:** T01 y T05.
- **Stream:** `GET /sse/waiters`, el de T16 y T17, sin los endpoints que emiten sus eventos.

Si al contexto le falta un dato del contrato, se marca como hueco y se resuelve con el humano: el código de Tabbie no se lee (0010).

## Requisitos de prueba del backlog

- **Un vencimiento corto, configurable, de las solicitudes de cobro:** el perfil de pruebas de `replica/entornos/`. El de la sesión es de la renovación, que va en la ampliación.

## Dependencias

- El setup del proyecto (DP-06; ver el [índice](README.md), "Antes del primer ticket").

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de SEG-c10 y de la parte de WS-c1, y una spec del contrato con una entrada por cada pieza de la base (T01, T05 y el stream), tomada del contexto.
2. Escribir las pruebas primero, y verlas fallar: el detector de secretos, el arranque de la réplica, las migraciones y el contrato.
3. Armar el proyecto NestJS en `replica/src/`, con su Dockerfile, y las migraciones de las 13 tablas.
4. Escribir los ejemplos de los perfiles en `replica/entornos/`, y armar el archivo local de variables, que no entra al repo, con las credenciales del proyecto de Firebase de Tabbie y un `JWT_SECRET` propio del entorno local.
5. Escribir `compose.yaml` con la réplica, MySQL y Redis. Levantar y comprobar que la réplica corre sus migraciones y se conecta a MySQL y Redis, también con `USE_FIREBASE` desactivada.
6. Implementar T01, los guards, T05 y el stream hasta que pasen las pruebas del contrato, con el mozo insertado y su JWT firmado.
7. Generar `docs/api/openapi.yaml`, con la marca `x-sensitive`, y validar cada respuesta contra él. Sumar a la CI el control del OpenAPI.
8. Correr el detector de secretos sobre todo el historial y todas las ramas.
9. Actualizar [infraestructura.md](../../architecture/infraestructura.md) con los comandos reales del entorno local, [estructura.md](../../architecture/estructura.md) si alguna carpeta quedó distinta, y la sección "Comandos" de `AGENTS.md`.
10. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Backend](../definition-of-done.md#backend-réplica-y-simulador).
- **Propio del ticket:**
  - La réplica arranca desde cero con `compose.yaml` y un archivo local de variables, siguiendo solo lo que dice [infraestructura.md](../../architecture/infraestructura.md), y corre sus migraciones.
  - T01, T05 y el stream tienen su entrada en `docs/api/openapi.yaml`, generada desde el código, y su prueba del contrato, que pasa.
  - La CI falla si `docs/api/openapi.yaml` difiere del que genera el código.
  - Si una prueba del contrato no coincide con el contexto, se corrige la réplica. Si el contexto está incompleto, el hueco se lleva al humano.

## Riesgos y decisiones

- **Riesgo aceptado (0010):** la réplica no tiene que ser 100 % igual a Tabbie. Las diferencias aparecen al conectar la app con el backend real, y se ajustan entonces.
- **Decidido (DP-48 a DP-53):** réplica propia desde el contrato, con migraciones propias y el OpenAPI generado; este ticket deja solo la base ([0010](../../adr/0010-replica-propia-desde-el-contrato.md); [índice](README.md#decisiones-tomadas-2026-11-17)).
- **Decidido (DP-14):** las pruebas de integración y de contrato de la réplica viven en `replica/tests/`, en TypeScript con Jest y Supertest, y van por HTTP contra la réplica levantada con Docker Compose, con MySQL y Redis reales ([índice](README.md#decisiones-tomadas-2026-11-14)).
- **Decidido (DP-15):** la prueba del contrato inserta un mozo en MySQL y firma su JWT con el `JWT_SECRET` de la réplica, porque la réplica, como el backend (contexto, sección 0), solo verifica la firma y busca el `userId`. El canje con Firebase se prueba en [TK-02](TK-02-datos-iniciales.md).
- **Decidido (DP-41):** en el lote 1, `compose.yaml` no tiene Toxiproxy y la app llega directo a la réplica. Toxiproxy se suma con la ampliación ([infraestructura.md](../../architecture/infraestructura.md), sección 2.1).
- **Decidido (DP-43):** en la CI, las pruebas del contrato corren con `USE_FIREBASE` desactivada y un `JWT_SECRET` de prueba, sin credenciales de Firebase ([infraestructura.md](../../architecture/infraestructura.md#6-integración-continua)).
