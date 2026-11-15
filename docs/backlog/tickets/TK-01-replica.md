# TK-01 · Réplica levantada con el contrato comprobado

| | |
|---|---|
| **Tipo** | Backend (réplica y simulador) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Réplica" en el alcance, y el riesgo técnico "La réplica no arranca sin las variables de MercadoPago ni de almacenamiento de archivos" |
| **Readme.md** | Ticket de backend de la sección 6 |

## Objetivo

Dejar la réplica corriendo en el entorno local, con la copia sin cambios en `backend/` y los servicios de `compose.yaml`, y el contrato de los endpoints y eventos que usa la app comprobado por HTTP.

## Criterios heredados

- [SEG-c10](../../architecture/seguridad.md#43-criterios-nuevos) · Los secretos no están en el repo.
- [WS-c1](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app arranca contra la réplica. **En parte:** que la réplica arranca y atiende con las variables de MercadoPago y de archivos vacías o de mentira. El criterio completo es de [TK-05](TK-05-eventos-y-consulta-periodica.md).

## Alcance

**Incluye:**

- **La copia en `backend/`:** `order-pay-backend`, rama `main`, commit `c18b0f7`, con su código y su configuración de build. No entran datos, variables de entorno ni la configuración de despliegue de Tabbie (0002).
- **`backend/UPSTREAM.md`:** de qué repositorio y commit sale la copia, cómo se comprueba que sigue sin cambios y cómo se compara el contrato con el `main` de Tabbie (0002, "Predicción del límite").
- **`compose.yaml`:** la réplica, construida con el Dockerfile de la copia; MySQL 8, vacío al primer arranque, y Redis 7, sin persistencia ([infraestructura.md](../../architecture/infraestructura.md), sección 2.1).
- **`replica/entornos/`:** los ejemplos de los dos perfiles, el normal y el de pruebas, con los nombres de las variables de [infraestructura.md](../../architecture/infraestructura.md), sección 5, y sin valores. El perfil de pruebas tiene un vencimiento corto de `REDIS_EXPIRATION_TIME`, para HU-06.h4.
- **Arranque sin MercadoPago ni archivos:** `MP_*`, `AWS_*` y `FRONT_URL` vacías o con valores de mentira, comprobando que ningún endpoint de la cadena del mozo ni del simulador las usa.
- **Prueba del contrato por HTTP**, en `replica/tests/` (DP-14): una por cada fila de la columna "Waiter App" del inventario (contexto, sección 3.1). Comprueba el método y la ruta, los guards de la tabla de trazabilidad (sin JWT responde 401 donde hay "J"), los campos del cuerpo que manda la app y los de la respuesta que lee. Los eventos se comprueban abriendo el stream con el JWT en el encabezado `Authorization` (0008): con un JWT vigente se abre; con uno vencido responde 401 antes de abrirse (C1).
- **El JWT de mozo de la prueba** (DP-15): la prueba inserta un mozo en MySQL y firma su JWT con el `JWT_SECRET` de la réplica, sin pasar por Firebase.
- **El detector de secretos** de SEG-c10, sobre todo el historial y todas las ramas.
- **`docs/api/openapi.yaml`** (DP-09, DP-42): escrito a mano desde el código de la copia, con una entrada por cada fila de la columna "Waiter App" del inventario y los campos sensibles marcados `x-sensitive: true`. Las pruebas del contrato validan las respuestas de la réplica contra él. Tres de esos endpoints se copian en la sección 4 del `Readme.md`.

**No incluye:**

- Los datos iniciales y las cuentas de prueba: [TK-02](TK-02-datos-iniciales.md).
- La comprobación de O1 a O4 (SEG-c1 a SEG-c4), que necesita el simulador: [TK-08](TK-08-simulador-ordenes.md) y [TK-13](TK-13-simulador-pagos.md).
- Los escenarios del simulador: [TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md), TK-08 y TK-13.
- Toxiproxy y los cortes de punta a punta: van en la ampliación (DP-04; ver el [índice](README.md), "Fuera de esta descomposición").
- El entorno de demo en Railway: va al final de la ampliación.
- La app: [TK-04](TK-04-app-base.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `backend/` (solo para poner la copia y `UPSTREAM.md`), `compose.yaml`, `replica/entornos/`, `replica/tests/` y `docs/api/`.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 2): los módulos de la copia tal como están, sin tocarlos: `AppModule`, `AuthModule`, `FirebaseAdminModule`, los guards, `RestaurantsModule`, `OrderModule`, `TableSessionModule`, `PaymentModule`, `SseModule` y `RedisModule`.

## Contrato que usa

Las filas de la columna "Waiter App" del inventario ([contexto, sección 3.1](../../context/panel-mozos-actual.md#31-endpoints-y-eventos-usados)), por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad):

- **HTTP:** T01, T05, T06, T07, T08, T09, T11, T12, T13 y T14.
- **Eventos de `/sse/waiters`:** T16, T17 e `in-person-payment-request-deleted`, que no tiene fila.

No comprueba las filas que la app no usa: T02, T03, T04, T10, T15 y T18.

## Requisitos de prueba del backlog

- **Un vencimiento corto, configurable, de las solicitudes de cobro:** el perfil de pruebas de `replica/entornos/`. El de la sesión es de la renovación, que va en la ampliación.

## Dependencias

- El setup del proyecto (DP-06; ver el [índice](README.md), "Antes del primer ticket").

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de SEG-c10 y de la parte de WS-c1, y una spec del contrato con una entrada por cada fila del inventario.
2. Escribir las pruebas primero: el detector de secretos, el arranque de la réplica y el contrato. Las del arranque y el contrato fallan, porque todavía no hay réplica.
3. Copiar `c18b0f7` en `backend/` sin tocar ningún archivo, y escribir `UPSTREAM.md`. Comprobar que el `diff` contra el commit da vacío.
4. Escribir los ejemplos de los perfiles en `replica/entornos/`, y armar el archivo local de variables, que no entra al repo, con las credenciales del proyecto de Firebase de Tabbie y un `JWT_SECRET` propio del entorno local.
5. Escribir `compose.yaml` con la réplica, MySQL y Redis. Levantar y comprobar que la réplica se conecta a MySQL y Redis y crea el esquema desde sus entidades (`DB_SYNC` activada).
6. Arrancar con `MP_*`, `AWS_*` y `FRONT_URL` vacías. Si la copia no arranca, usar valores de mentira, nunca cambiar su código, y dejar anotado en el ejemplo qué variable lo necesita.
7. Escribir `docs/api/openapi.yaml` y completar las pruebas del contrato, con el mozo insertado y su JWT firmado, validando cada respuesta contra él, hasta que pasen todas. Copiar tres endpoints en la sección 4 del `Readme.md`.
8. Correr el detector de secretos sobre todo el historial y todas las ramas.
9. Actualizar [infraestructura.md](../../architecture/infraestructura.md) con los comandos reales del entorno local, y [estructura.md](../../architecture/estructura.md) si alguna carpeta quedó distinta.
10. Abrir el PR desde una rama `mc`, con el `diff` vacío de `backend/` como evidencia.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Backend](../definition-of-done.md#backend-réplica-y-simulador).
- **Propio del ticket:**
  - El PR muestra que el `diff` de `backend/` contra `c18b0f7` da vacío, salvo `UPSTREAM.md`.
  - La réplica arranca desde cero con `compose.yaml` y un archivo local de variables, siguiendo solo lo que dice [infraestructura.md](../../architecture/infraestructura.md).
  - Cada fila de la columna "Waiter App" del inventario tiene su entrada en `docs/api/openapi.yaml` y su prueba del contrato, y pasa.
  - Si una prueba del contrato no coincide con el contexto, se corrige el contexto, no la copia.

## Riesgos y decisiones

- **Riesgo técnico del skeleton** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 6.1): "La réplica no arranca sin las variables de MercadoPago ni de almacenamiento de archivos". Se despeja en el paso 6.
- **Predicción del límite** (0002): si al comparar el contrato con el `main` de Tabbie hay diferencias, la réplica pasa a un commit nuevo con un ADR que reemplaza a 0002. No se edita a mano ningún archivo de la copia ([estructura.md](../../architecture/estructura.md), "Copia aislada del backend").
- **Decidido (DP-14):** las pruebas de integración y de contrato de la réplica viven en `replica/tests/`, en TypeScript con Jest y Supertest, y van por HTTP contra la réplica levantada con Docker Compose, con MySQL y Redis reales ([índice](README.md#decisiones-tomadas-2026-11-14)).
- **Decidido (DP-15):** la prueba del contrato inserta un mozo en MySQL y firma su JWT con el `JWT_SECRET` de la réplica, porque `src/guards/auth/jwt.strategy.ts` de la copia solo verifica la firma y busca el `userId`. El canje con Firebase se prueba en [TK-02](TK-02-datos-iniciales.md).
- **Decidido (DP-09):** el OpenAPI de `docs/api/openapi.yaml` se escribe a mano desde el código de la copia, con los campos sensibles marcados `x-sensitive: true`, y lo validan las pruebas de contrato de la réplica. Lo escribe este ticket (DP-42).
- **Decidido (DP-41):** en el lote 1, `compose.yaml` no tiene Toxiproxy y la app llega directo a la réplica. Toxiproxy se suma con la ampliación ([infraestructura.md](../../architecture/infraestructura.md), sección 2.1).
- **Decidido (DP-43):** en la CI, las pruebas del contrato corren con `USE_FIREBASE` desactivada y un `JWT_SECRET` de prueba, sin credenciales de Firebase ([infraestructura.md](../../architecture/infraestructura.md#6-integración-continua)).
