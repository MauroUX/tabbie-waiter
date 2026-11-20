# App

- Se carga solo al trabajar en `android/`. Lo general está en `AGENTS.md`; acá va lo propio de la app.
- Los tickets de Frontend se hacen con la skill `app-feature`.

## Stack (0003)

- **Kotlin y Jetpack Compose,** con MVVM y flujo de datos unidireccional. El estado de cada pantalla vive en su ViewModel, en memoria (0005).
- **Hilt** conecta todos los componentes.
- **Retrofit y OkHttp** para HTTP, y **OkHttp SSE** para `/sse/waiters`, con el JWT en el encabezado (0006, 0008).
- **Firebase Authentication,** solo para iniciar sesión y canjear el ID token por el JWT (0004).
- **DataStore,** solo para la sesión y las marcas de "Atendido".
  - Nada más se guarda en la tablet: ni Room, ni archivos, ni caché HTTP en disco (0005, PA-3).
  - Por qué: las respuestas traen emails de comensales y tokens de MercadoPago (O4).

Los paquetes van por funcionalidad y, dentro de cada una, por capas: `sesion/`, `salon/`, `cobros/`, `impresora/` y `comun/` ([estructura.md](../docs/architecture/estructura.md), sección 1). Qué hace cada componente está en [componentes.md](../docs/architecture/componentes.md), sección 1.

## Reglas del código

- **`!!` prohibido,** también en los tests.
  - Un dato que el backend puede no mandar se maneja con `?.`, `?:` o un estado de error.
  - Por qué: un `!!` sobre un dato que no llegó cierra la app en medio del turno.
- **Un solo cliente HTTP,** el de `comun/red/`, para las consultas y las acciones (DP-27):
  - con `retryOnConnectionFailure(false)`;
  - sin reintentos propios: ni un interceptor que repita, ni `retry` en un `Flow`, ni un "volver a intentar" automático;
  - una consulta que falla espera a la próxima consulta periódica, y una acción que falla vuelve al mozo (0007, RNF-6);
  - por qué: `/pay` y `/add-payment` no son idempotentes, y una acción repetida es un cobro duplicado (M-2).
- **Tiempos de espera (DP-26):** 4 s para las consultas, así un corte se detecta antes de los 5 s de RNF-4, y 10 s para las acciones.
- **Registros sin datos sensibles (PA-6):**
  - ni el registro de diagnóstico, ni Logcat, ni el de OkHttp llevan cuerpos de respuesta, el JWT, la URL del stream, el ID token, la contraseña, emails, nombres de comensales ni credenciales de cobro;
  - `HttpLoggingInterceptor`, si se usa, nunca en `HEADERS` ni en `BODY`.
- **Solo HTTPS fuera de la réplica local (PA-7):** la configuración de seguridad de red permite HTTP sin cifrar solo en la variante local, y solo hacia la máquina de desarrollo.
- **Solo `waiter`, en un restaurante (PA-1, PA-2):** el `restaurantId` de cada llamada sale de la sesión, nunca de una pantalla ni de una respuesta.
- **La hora entra como dato:** un `Clock` inyectado. Nada de `System.currentTimeMillis()` ni `Instant.now()` en el código que se prueba.
- **Textos de la interfaz** en español, en `strings.xml`.

## Los estados de cada pantalla

Cada pantalla tiene, además del estado con datos, estos cuatro:

| Estado | Qué muestra |
|---|---|
| Carga | Que los datos están llegando, mientras no llegó la primera respuesta. |
| Error | Qué falló, en palabras del mozo, sin códigos ni cuerpos de respuesta, y cómo sigue. |
| Vacío | Un mensaje propio. Un salón sin mesas ocupadas es normal, no un error. |
| Sin conexión | El aviso del Monitor de conexión: aparece a los 5 s y se quita solo, en 5 s, cuando vuelve la comunicación (RNF-4, 0006). La pantalla no tiene su propio manejo de los cortes. |

- Hasta TK-06, que trae el Monitor, "sin conexión" es la consulta que falla por la red, y no se recupera sola.
- El estado es un tipo sellado en el ViewModel, expuesto como `StateFlow`.
- La pantalla es una función sin estado, `(estado, acciones) -> UI`, que lo dibuja con un `when` exhaustivo. Así cada estado se prueba poniéndolo directo.

## Pruebas

| Qué | Dónde | Con qué |
|---|---|---|
| ViewModels, repositorios y reglas | `app/src/test/` | JUnit, MockK, Turbine y `kotlinx-coroutines-test`, con el tiempo virtual de `runTest` |
| Cliente HTTP, Eventos y Monitor de conexión | `app/src/test/` | MockWebServer: cuenta las peticiones (WS-c11) y corta o retiene las respuestas ([walking skeleton](../docs/architecture/walking-skeleton.md), sección 4) |
| Pantallas | `app/src/test/` | Compose UI test sobre Robolectric, así la CI las corre sin emulador |
| Contra la réplica | `app/src/androidTest/` | En el emulador, con la réplica levantada (WS-c1, WS-c2, WS-c3) |

- **Cada borde, un caso a cada lado.** Por ejemplo, con `yellowTicketSeconds` en 300, el cronómetro se prueba en 299 s y en 300 s.
- **Ningún secreto en el código de las pruebas.** La cuenta de prueba de `androidTest/` llega por argumentos de instrumentación, que salen de variables de entorno.

## La tablet

- **Horizontal y en español (RNF-10):** completa y sin desplazamiento horizontal en la referencia de 10,1" a 1920×1200 y en el mínimo de 8" a 1280×800.
- **Se verifica con una captura a 1280×800,** en horizontal. 1920×1200 es requisito, pero no lleva captura.
- **El emulador:**
  - está en `%LOCALAPPDATA%\Android\Sdk\emulator\emulator`, que no está en el `PATH` (`adb` sí);
  - el AVD es `tablet-8-1280x800`: 1280×800, densidad 213 y horizontal.
- **La captura va por Bash,** con `adb exec-out screencap -p > <archivo>.png`. En PowerShell 5.1, `>` reescribe la salida como texto y el PNG queda roto.
- Las pantallas del walking skeleton son sin diseño: RNF-10 aplica desde TK-09.

## ktlint

- El hook `ktlint-formato` formatea el `.kt` o `.kts` de `android/` que se escribe con Write o Edit, y solo ese.
- Lo que ktlint no arregla solo, el hook lo devuelve, y se corrige en el código.
- Lo que no pasa por Write o Edit (un script o una plantilla de Android Studio) se formatea a mano.

## Comandos

Desde `android/`, en Bash (`./gradlew`) o en PowerShell (`.\gradlew.bat`). No inventes otros.

| Para qué | Comando |
|---|---|
| Compilar las tres variantes | `./gradlew assembleLocalDebug assembleDemoDebug assembleTabbieDebug` |
| Tests locales (los de la CI) | `./gradlew testLocalDebugUnitTest` |
| ktlint: comprobar o formatear | `./gradlew spotlessCheck` o `./gradlew spotlessApply` |
| Levantar el emulador (en segundo plano) | `"$LOCALAPPDATA/Android/Sdk/emulator/emulator" -avd tablet-8-1280x800 -no-snapshot-save` |
| Esperar a que arranque | `adb wait-for-device shell 'while [ "$(getprop sys.boot_completed)" != 1 ]; do sleep 1; done'` |
| Instalar la variante local en el emulador | `./gradlew installLocalDebug` |
| Tests en el dispositivo, variante local (WS-c1 y SEG-c7 local), con la réplica de `local.env` y ESC-1 en las mesas 1 y 2 | `./gradlew connectedLocalDebugAndroidTest` |
| SEG-c7 de la demo, con la variante de demo apuntando por `http://` a la réplica local | `./gradlew connectedDemoDebugAndroidTest -PurlBase=http://10.0.2.2:3000/` |
| Un solo test o clase en el dispositivo | `-Pandroid.testInstrumentationRunnerArguments.class=com.tabbie.waiter.WsC1DispositivoTest` |
| Leer el registro de diagnóstico | `adb logcat -d -v raw -s TabbieDiag:I` |
| La captura (solo en Bash) | `adb exec-out screencap -p > <archivo>.png` |

- **La cuenta de prueba de los tests en el dispositivo** sale de las variables de entorno `CONTRASENA_MOZO1_R1` (obligatoria) y `EMAIL_MOZO1_R1` (opcional; por defecto, `waiterapp.mozo1.r1@example.com`), que `app/build.gradle.kts` pasa como argumentos de instrumentación (DP-93). La carga el humano; si es una variable de usuario de Windows, una terminal abierta antes no la ve: se toma con `[Environment]::GetEnvironmentVariable('CONTRASENA_MOZO1_R1','User')` sin mostrarla.
- **`google-services.json`** va en `app/` y no se versiona (DP-89). Sin él, la app compila y el inicio de sesión falla con `motivo=sin-configuracion-de-firebase`.
- **Las URLs de `demo` y `tabbie`** son hosts `.invalid` hasta que existan (DP-90). `-PurlBase=…` reemplaza la URL de la variante que se compila.
- **Con `adb shell` en Git Bash,** `MSYS_NO_PATHCONV=1`: si no, `/sdcard/…` se convierte en una ruta de Windows.
- **Firebase escribe el email del mozo en Logcat,** con la etiqueta `FirebaseAuth` (DP-96): no se pega Logcat entero en un PR ni en un informe.
