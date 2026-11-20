## Why

TK-04 ([issue #5](https://github.com/MauroUX/tabbie-waiter/issues/5), [ticket](../../../docs/backlog/tickets/TK-04-app-base.md)) es el corte de la Entrega 2 y el primer código de la app. Sin el proyecto Android, sus variantes, el inicio de sesión y el Cliente HTTP no hay sobre qué construir los eventos y la consulta periódica (TK-05), el aviso sin conexión (TK-06), el cliente de las acciones (TK-07) ni ninguna pantalla del lote 1. Es también la primera corrida de `app-feature`, `android-test-writer` y `android-implementer`.

## What Changes

- **Proyecto Gradle en `android/`:** un único módulo `app`, el wrapper, el catálogo de versiones y el stack de 0003 (Kotlin, Jetpack Compose, MVVM con flujo de datos unidireccional, Hilt, Retrofit y OkHttp, Firebase Authentication). ktlint por Spotless, que usa el hook `ktlint-formato`.
- **Tres variantes** (infraestructura.md, sección 2.3): réplica local, réplica de demo y Tabbie. Cambian solo la URL base, y comparten el `applicationId`, así la app se registra una sola vez en Firebase. La configuración de seguridad de red bloquea HTTP sin cifrar en las tres, salvo en la local hacia la máquina de desarrollo (PA-7).
- **Configuración de Firebase fuera del repo:** `google-services.json` es un archivo local ignorado; sin él la app compila (CI) y el inicio de sesión falla con un error explícito.
- **Sesión mínima:** email y contraseña en Firebase (T19) y canje del ID token por el JWT en T01. Guarda en memoria el JWT, su `exp`, el `restaurantId` y el rol, y usa ese restaurante en todas las llamadas (PA-2).
- **Pantalla de inicio de sesión sin diseño:** email, contraseña y "Entrar", con sus estados de carga, error y sin conexión.
- **Cliente HTTP base:** un solo cliente Retrofit y OkHttp, sin reintentos automáticos (DP-27), con la URL base de la variante, `Authorization: Bearer <JWT>` en todas las llamadas menos el canje y los tiempos de espera de DP-26.
- **Salón mínimo:** una consulta de T05 con el `restaurantId` de la sesión y la lista sin diseño de las mesas, con sus estados de carga, error, vacío y sin conexión.
- **Registro de diagnóstico:** una línea por cada cambio del estado, con la hora, qué cambió y de dónde vino, en Logcat con una etiqueta propia; se lee desde la máquina con `adb` y no anota nada de lo que excluye PA-6.
- **CI de la app** (DP-11): `.github/workflows/app.yml`, con ktlint, los tests locales sobre Robolectric y la compilación de las tres variantes, sin emulador y sin `google-services.json`.
- **Documentación:** la sección "Comandos" de `android/CLAUDE.md` con los comandos reales, `.gitignore` con `google-services.json`, `estructura.md` y `infraestructura.md` donde el cambio los deja desactualizados, y las decisiones nuevas como DP en `docs/backlog/tickets/README.md`.

## Capabilities

### New Capabilities

- `app-base`: la app arranca contra la réplica, inicia sesión con la cuenta de prueba del mozo y muestra las mesas activas de su restaurante, con un solo cliente HTTP sin reintentos, solo HTTPS fuera de la réplica local y un registro de diagnóstico sin datos sensibles. Lleva los scenarios de SEG-c7 y de WS-c1 (en parte).

### Modified Capabilities

(Ninguna: `replica-base`, `contrato-replica`, `datos-iniciales` y `simulador-comensales` no cambian. La app usa T01 y T05 tal como están en `docs/api/openapi.yaml`.)

## No-alcance

Lo que este cambio **no** hace (ticket, "No incluye"):

- La conexión de eventos (`/sse/waiters`) y la consulta periódica de mesas, solicitudes y cobros: TK-05. Por eso el registro anota solo la primera consulta de mesas, no la conexión de eventos ni las solicitudes y los cobros: esa parte de WS-c1 es de TK-05.
- El aviso sin conexión del Monitor de conexión y la reconexión: TK-06. Hasta entonces, "sin conexión" es la consulta que falla por la red, y no se recupera sola.
- El cliente de las acciones que cambian datos: TK-07.
- La navegación principal y "Órdenes": TK-09.
- El diseño del inicio de sesión, sus errores, el rechazo de quien no es mozo y la sesión guardada en DataStore: TK-11. La sesión vive solo en memoria, y la app no rechaza todavía otro rol.
- La renovación del JWT y el 401: ampliación.
- RNF-10 (tamaño y resolución): aplica desde TK-09; estas pantallas son sin diseño.
- Toxiproxy (DP-04, DP-41), la réplica de demo en Railway y la firma del APK de demo.
- Ningún cambio en `replica/` ni en `simulator/`, ni en el contrato del contexto (DP-49).

## Impact

- **Carpetas nuevas:** `android/` (Gradle, `app/src/main`, `app/src/local`, `app/src/test`, `app/src/androidTest`) y `.github/workflows/app.yml`.
- **Dependencias nuevas:** AGP, Kotlin, Compose, Hilt, Retrofit, OkHttp, kotlinx.serialization, Firebase Authentication, Spotless con ktlint; para las pruebas, JUnit 4, MockK, Turbine, `kotlinx-coroutines-test`, MockWebServer, Robolectric y Compose UI test. Las versiones están en design.md.
- **Externo:** la app Android queda registrada en el proyecto de Firebase de Tabbie (lo hace el humano). Un AVD local `tablet-8-1280x800`.
- **Contrato:** ninguno cambia. La app consume T01 y T05 de `docs/api/openapi.yaml`.
