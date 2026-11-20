## Context

Ver proposal.md ("Why"). Hoy `android/` tiene solo su `CLAUDE.md`. La réplica (TK-01), los datos iniciales con las cuentas de prueba (TK-02) y el simulador con ESC-1 (TK-03) están mergeados. Restricciones que dan forma al diseño:

- **0005 y PA-3:** en la tablet solo quedan DataStore y los archivos del SDK de Firebase; SEG-c5 copia el almacenamiento privado y no admite otros archivos. En TK-04 la sesión vive solo en memoria (DataStore llega con TK-11).
- **0007, DP-26 y DP-27:** un solo cliente HTTP, sin reintentos; 4 s para las consultas y 10 s para las acciones.
- **0009 y PR-1:** ninguna credencial ni cuenta entra al repo, y `google-services.json` no se lee.
- **DP-43:** lo que necesita Firebase no corre en la CI.
- **La máquina:** JDK 21 (la CI usa 17), el SDK con `platforms;android-34` y la imagen `system-images;android-35;google_apis_playstore;x86_64`, sin `cmdline-tools` (no hay `avdmanager` ni `sdkmanager`).

## Goals / Non-Goals

**Goals:**

- Que `app-feature` y sus subagentes tengan sobre qué correr: un proyecto que compila, con tests locales en la CI y tests en el emulador contra la réplica.
- Dejar fijas las piezas que reusan TK-05 a TK-07: el Cliente HTTP, la Sesión en memoria, el registro de diagnóstico y el `Clock` inyectado.

**Non-Goals:**

- Navegación principal, DataStore, renovación del JWT, Monitor de conexión y eventos (ver proposal.md, "No-alcance").
- Publicar el APK de demo ni firmarlo.

## Decisions

Cada decisión nueva queda como DP en `docs/backlog/tickets/README.md`, con el número que lleva acá.

### D1 · `applicationId` y paquete base: `com.tabbie.waiter` (DP-88)

- Las tres variantes usan el mismo `applicationId`, sin sufijo, y el paquete base (`namespace`) es el mismo.
- **Por qué:** la app se registra una sola vez en el proyecto de Firebase de Tabbie (infraestructura.md, 2.3), y `google-services.json` trae un cliente por `applicationId`. En un dispositivo se instala una variante a la vez.
- **Alternativa descartada:** un sufijo por variante (`.local`, `.demo`), que obliga a registrar tres apps en Firebase.

### D2 · La configuración de Firebase: archivo local ignorado, plugin condicional (DP-89)

- El humano registra la app y deja `android/app/google-services.json`. `.gitignore` lo ignora en cualquier carpeta, y el hook `datos-que-no-salen` ya lo bloquea en un commit.
- `app/build.gradle.kts` aplica el plugin `com.google.gms.google-services` **solo si el archivo existe**. Sin él (la CI), la app compila; el SDK de Firebase no se inicializa, y el inicio de sesión termina en el estado de error con un motivo explícito en el registro (`motivo=sin-configuracion-de-firebase`), nunca en silencio.
- **Alternativa descartada:** pasar los valores (`apiKey`, `applicationId` de Firebase, `projectId`) desde un `.properties` local a `BuildConfig` e inicializar Firebase a mano. Obliga al humano a copiar valores sueltos del archivo, y en la CI igual faltan.

### D3 · Variantes y URL base (DP-90)

| Variante (`productFlavor`, dimensión `entorno`) | URL base por defecto | HTTP sin cifrar |
|---|---|---|
| `local` | `http://10.0.2.2:3000/`: la máquina de desarrollo vista desde el emulador, con el puerto por defecto de la réplica | Solo hacia `10.0.2.2` y `localhost` |
| `demo` | `https://replica-demo.invalid/` | No |
| `tabbie` | `https://tabbie.invalid/` | No |

- **Hueco:** las URLs de la réplica de demo (Railway, final de la ampliación) y del backend real no están en ningún documento. Llevan un host `.invalid`, que nunca resuelve, hasta que existan; no se inventan.
- La propiedad de Gradle `urlBase` (`-PurlBase=…`) reemplaza la URL de la variante que se compila. La usan la prueba de SEG-c7 (demo con `http://10.0.2.2:<puerto>/`) y el humano si `local.env` publica la réplica en otro puerto.
- La URL base entra a `BuildConfig.URL_BASE`; es lo único que cambia entre variantes (0002).

### D4 · Seguridad de red (PA-7)

- `src/main/res/xml/network_security_config.xml`: `cleartextTrafficPermitted="false"` en `base-config`. Lo usan demo y Tabbie.
- `src/local/res/xml/network_security_config.xml` lo reemplaza en la variante local: el mismo `base-config` y un `domain-config` con `cleartextTrafficPermitted="true"` solo para `10.0.2.2` (el emulador) y `localhost` (una tablet física con `adb reverse`). Ningún otro host.
- OkHttp consulta la política de Android antes de abrir la conexión y falla con `UnknownServiceException` ("CLEARTEXT communication … not permitted"): por eso "la app no llega a la réplica". La Sesión traduce esa excepción a "sin conexión" para el mozo, y el registro la anota con `motivo=http-sin-cifrar-bloqueado`, así se distingue de una réplica caída.
- **Robolectric no aplica la configuración de seguridad de red**, así que SEG-c7 se prueba en el emulador (D9).

### D5 · Registro de diagnóstico en Logcat (DP-91)

- Una línea por cambio, con la etiqueta `TabbieDiag` y nivel INFO: `<instante ISO-8601 UTC del Clock> <qué> origen=<origen> <clave>=<valor> …`.
  - Ejemplos: `2026-11-19T22:00:00Z sesion iniciada origen=inicio-de-sesion rol=waiter restaurante=<uuid> vence=<instante>` y `… mesas actualizadas origen=consulta cantidad=2 sesiones=[11,12]`.
- Se lee desde la máquina, sin pantalla: `adb logcat -d -v raw -s TabbieDiag:I`.
- **No es un archivo:** un archivo en la tablet rompe PA-3 y SEG-c5. Logcat está fuera del almacenamiento privado de la app.
- **PA-6:** el registro recibe solo datos ya filtrados (rol, `restaurantId`, vencimiento, ids de sesión de mesa, cantidades, motivos). Nunca recibe el cuerpo de una respuesta, el JWT, la URL, el ID token, la contraseña, emails, nombres ni credenciales de cobro. No hay `HttpLoggingInterceptor`. El modelo de red de T05 ni siquiera declara los campos sensibles: el deserializador los ignora, así que no llegan a ningún objeto de la app (O4, RF-9).
- La interfaz del registro recibe un escritor de líneas, así las pruebas locales leen las líneas sin Logcat.

### D6 · Cliente HTTP y tiempos de espera (DP-92)

- Un solo `OkHttpClient`, con `retryOnConnectionFailure(false)`, sin interceptores que repitan ni registren, y sin caché en disco (0005).
- **Tiempos:** T05 es una consulta (4 s de conexión, lectura y escritura). El canje de T01 no es una consulta periódica, y el mozo espera su resultado: usa los 10 s de las acciones. Una anotación `@Consulta` en la interfaz de Retrofit marca las consultas, y un interceptor de aplicación aplica los 4 s a esas llamadas; las demás usan los 10 s del cliente.
- `Authorization: Bearer <JWT>` lo agrega un interceptor que toma el JWT de la Sesión en memoria, en todas las llamadas menos el canje.
- Los bordes de 4 s y 10 s se prueban como configuración por llamada (el tiempo que ve cada petición), sin esperas reales. El comportamiento a cada lado de los 5 s lo prueba TK-06 con el Monitor de conexión.

### D7 · Sesión mínima en memoria

- `POST /auth/login` con `{firebaseIdToken}`; de la respuesta toma `access_token`, `user.role` y `user.restaurantId`, y el `exp` lo lee del payload del JWT (base64url), sin validar la firma (la valida la réplica).
- Expone la sesión como `StateFlow`. Su `toString()` no muestra el JWT.
- Firebase queda detrás de una interfaz propia (`AutenticacionFirebase`), con un resultado cerrado (ID token, credenciales rechazadas, sin conexión, sin configuración). Las pruebas locales la reemplazan con MockK; la implementación con el SDK se prueba en el emulador.
- No rechaza otro rol ni el restaurante `"-1"`: es de TK-11 (HU-01.h5).
- Un fallo de Firebase que no es de credenciales ni de red da `ResultadoFirebase.Fallida`, y el inicio de sesión termina en `Fallida` con `motivo=firebase-fallido`; no se confunde con la falta de configuración.

### D13 · El email del mozo que escribe el SDK de Firebase (DP-96)

- `firebase-auth` 25.0.0 escribe en Logcat, con la etiqueta `FirebaseAuth` y `Log.i`, la línea "Logging in as <email> with empty reCAPTCHA token" al iniciar sesión con email y contraseña. La app no la puede filtrar ni apagar.
- **Decisión del humano (disputa de WS-c1, opción a):** la prueba de WS-c1 busca el email en el registro de diagnóstico y en lo que escribe la app en Logcat, sin las etiquetas del SDK de Firebase. La contraseña y `token=` se siguen buscando en todo el Logcat del proceso.
- **Riesgo conocido:** el email del mozo, que es una cuenta de prueba de los datos iniciales, queda en el Logcat del sistema. Se anota en `seguridad.md` (PA-6 y SEG-c6), porque SEG-c6 busca esos emails en el registro del sistema de Android.
- **Alternativas descartadas por ahora:** habilitar reCAPTCHA en el proyecto de Firebase de Tabbie, sin saber si el SDK deja de escribir la línea, y reemplazar el SDK por la API REST de Firebase, que cambia D7.

### D8 · Navegación mínima

La actividad muestra el inicio de sesión mientras no hay sesión, y la lista del Salón cuando la hay. El Salón consulta T05 una vez al entrar, y ofrece "Volver a cargar" en error y sin conexión: es el mozo quien repite, no la app (RNF-6). La consulta periódica es de TK-05.

### D9 · Pruebas en el dispositivo y la cuenta de prueba (DP-93)

- Las pruebas de `androidTest/` corren con `connected<Variante>DebugAndroidTest`. Cada una se salta (`assumeTrue`) en la variante que no le toca: WS-c1 y la parte local de SEG-c7 en `local`; la parte de la demo en `demo`, compilada con `-PurlBase=http://10.0.2.2:<puerto>/`.
- **La cuenta de prueba:** `app/build.gradle.kts` lee dos variables de entorno y las pasa como argumentos de instrumentación; no se escriben en el APK ni en el repo:

| Variable de entorno | Argumento | Valor |
|---|---|---|
| `CONTRASENA_MOZO1_R1` | `contrasenaMozo` | La contraseña del primer mozo del restaurante 1. La carga el humano; es el mismo nombre que usa `replica/entornos/cuentas.env` (infraestructura.md, sección 5) |
| `EMAIL_MOZO1_R1` | `emailMozo` | Opcional. Por defecto, `waiterapp.mozo1.r1@example.com`, el de los datos iniciales |

- Si falta la contraseña, la prueba que la necesita falla con un mensaje que nombra la variable, no se salta.
- La prueba lee el registro de diagnóstico con `logcat -d` desde la instrumentación, y comprueba que el Logcat de la app no tiene la contraseña, el email ni `token=`.

### D10 · CI de la app (DP-94)

`.github/workflows/app.yml`, en cada PR y en cada push a `mc/**` y `feature/**`, en `ubuntu-latest` con Temurin 17: `./gradlew spotlessCheck testLocalDebugUnitTest assembleLocalDebug assembleDemoDebug assembleTabbieDebug`. Sin `google-services.json`, sin emulador y sin secretos. Los tests locales corren en una sola variante porque la lógica no cambia entre variantes; las tres se compilan.

### D11 · Versiones (DP-95)

Comprobadas en Maven Central y en el Maven de Google el 2026-11-19. Regla: la última estable cuya metadata de AAR pide `minCompileSdk` 35 o menos, con `compileSdk` y `targetSdk` 35 y JDK 17 como destino.

| Pieza | Versión | Por qué esa |
|---|---|---|
| Gradle (wrapper) | 9.6.0 | La mínima y por defecto de AGP 9.5 |
| AGP | 9.5.1 | La última; pide JDK 17 y Gradle 9.6.0, y compila hasta la API 37 |
| Kotlin (Compose y serialización) | 2.3.21 | La que usa Hilt 2.60 |
| KSP | 2.3.14 | La última de la línea 2.3, para Hilt |
| Hilt | 2.60.1 | Desde 2.59 el plugin de Hilt exige AGP 9 |
| `androidx.hilt:hilt-lifecycle-viewmodel-compose` | 1.3.0 | 1.4.0 pide `minCompileSdk` 37 |
| Compose BOM | 2026.06.01 (Compose 1.11.4, Material 3 1.4.0) | 2026.08.00 en adelante trae Compose 1.12, que pide `minCompileSdk` 37 |
| `androidx.activity:activity-compose` | 1.10.1 | 1.11.0 pide `minCompileSdk` 36 |
| `androidx.core:core-ktx` | 1.16.0 | 1.17.0 pide `minCompileSdk` 36 |
| `androidx.lifecycle` (runtime y viewmodel compose) | 2.10.0 | 2.11 pide `minCompileSdk` 37 |
| Firebase BOM | 35.2.0 (`firebase-auth` 25.0.0) | La última |
| Plugin `google-services` | 4.6.0 | La última |
| Retrofit y su conversor de kotlinx.serialization | 3.0.0 | La última |
| OkHttp y MockWebServer (`mockwebserver3`) | 5.3.2 | 5.4.0 pide `minCompileSdk` 36 y 5.5.x pide 37 |
| kotlinx.serialization JSON | 1.11.0 | La última |
| Corrutinas (android, play-services, test) | 1.11.0 | La última |
| JUnit 4 | 4.13.2 | Robolectric y Compose UI test corren sobre JUnit 4 |
| MockK | 1.14.12 | La última |
| Turbine | 1.2.1 | La última |
| Robolectric | 4.18.1 | La última; corre la API 35 |
| `androidx.test` (runner y core; `ext:junit`) | 1.7.0; 1.3.0 | Las últimas |
| Spotless y ktlint | 8.11.0 y 1.8.0 | Las últimas; el hook `ktlint-formato` usa Spotless |

- `minSdk` 26. El SDK descarga `platforms;android-35` en la primera compilación (la licencia ya está aceptada en la máquina).
- Si una versión no compila con otra, se baja a la anterior que cumple la regla y se anota en el informe; no se sube `compileSdk`.

### D12 · El AVD `tablet-8-1280x800`

Sin `avdmanager`, se crea a mano en `%USERPROFILE%\.android\avd\`, como los AVD que ya hay: `config.ini` con la imagen `android-35;google_apis_playstore;x86_64`, `hw.lcd.width=1280`, `hw.lcd.height=800`, `hw.lcd.density=213`, `hw.initialOrientation=landscape` y 2 GB de RAM, y su `.ini` con `target=android-35`. Es configuración de la máquina, no del repo. Se crea con el OK del humano.

### D14 · Lo que cambia la revisión adversarial del PR (DP-97 a DP-102)

Decisión que el humano delegó en la IA, que eligió la opción recomendada para cada hallazgo de la revisión adversarial del PR de TK-04 (MauroUX/tabbie-waiter#23).

- **Hallazgo 1, otro rol llega al Salón (PA-1):** no cambia en TK-04. El ticket deja el rechazo de quien no es mozo para TK-11, y D7 lo dice. Ninguna compilación sale del entorno de pruebas antes de TK-11.
- **DP-97 · Nada sale de la tablet por copia ni por transferencia (PA-3):** `allowBackup="false"` solo apaga la copia en la nube. El manifiesto declara `android:dataExtractionRules="@xml/reglas_de_extraccion"`, que excluye todos los dominios, con `path="."`, en `<cloud-backup>` y en `<device-transfer>`.
- **DP-98 · La variante local en una tablet física (PA-7):** `10.0.2.2` es la máquina de desarrollo solo en el emulador. En una tablet física, la variante local se compila siempre con `-PurlBase=http://localhost:<puerto>/` y `adb reverse tcp:<puerto> tcp:<puerto>`. Queda en `android/CLAUDE.md`.
- **DP-99 · Un error no previsto termina en el estado de error, no cierra la app:** los repositorios atrapan, después de los casos conocidos, cualquier otra excepción y devuelven `Fallida` con `motivo=error-inesperado`, sin anotar su mensaje. `CancellationException` se vuelve a lanzar.
- **DP-100 · Una consulta tiene un tope total de 4 s:** los 4 s por fase del cliente no ponen un límite al total, y el `callTimeout` de OkHttp no se puede cambiar por llamada sin reemplazar el `Call.Factory`. Cada repositorio pone la consulta dentro de `withContext(contextoDelTope) { withTimeout(ClienteHttp.ESPERA_CONSULTA) { … } }`: al cancelarse la corrutina se cancela la llamada. Vencido el tope, el resultado es `SinConexion`, con `motivo=sin-respuesta`. `contextoDelTope` es por defecto `Dispatchers.IO`, así que en la app el tope cuenta en tiempo real. El borde se prueba con el tiempo virtual: el test le pasa `EmptyCoroutineContext`, y 3999 ms responde mientras que 4000 ms no. Así lo decidió el humano en la disputa de DP-100. Sin el contexto inyectable, el tope en el hilo del test vencía al instante en los tests con MockWebServer real, porque `runTest` adelanta el reloj virtual mientras espera a OkHttp.
- **DP-101 · La contraseña de la cuenta de prueba no pasa por Gradle:** como argumento de instrumentación, Gradle la guardaba en texto claro en `android/.gradle/…/executionHistory.bin`. Ahora `app/build.gradle.kts` pasa solo `emailMozo`, y los tests en el dispositivo corren con `android/scripts/pruebas-en-dispositivo.sh`. El script instala con Gradle y corre `am instrument` con `contrasenaMozo`, tomada de `CONTRASENA_MOZO1_R1` sin mostrarla. Reemplaza la parte de la contraseña de DP-93.
- **DP-102 · Lo menor de la revisión:**
  - La CI valida el `gradle-wrapper.jar` con `gradle/actions/wrapper-validation@v6.4.1` antes de ejecutarlo.
  - Si Firebase no devuelve usuario o ID token sin lanzar una excepción, el resultado es `ResultadoFirebase.Fallida`, no `CredencialesRechazadas`.
  - Los insets de borde a borde quedan para TK-09, con RNF-10.

## Risks / Trade-offs

- [AGP 9 es nuevo y el plugin de Hilt lo exige] → Si la combinación no compila, se baja a AGP 8.13.2 con Hilt 2.58 y Kotlin 2.2.21, que no exigen AGP 9, y se anota.
- [La CI no prueba SEG-c7 ni WS-c1, que necesitan el emulador y Firebase] → Las pruebas locales cubren el cliente, la sesión, el salón, las pantallas y el registro; las del dispositivo se corren en la máquina y su salida va en el PR (DP-43).
- [Las URLs de demo y Tabbie son `.invalid`] → Una compilación de esas variantes no llega a ningún backend hasta que se completen; está a la vista en D3 y en `android/CLAUDE.md`.
- [La API key de Firebase viaja dentro del APK] → Es así por diseño en Android; no entra al repo y se restringe en la consola de Firebase.
- [Logcat lo puede leer cualquier herramienta con `adb`] → Por eso PA-6 se cumple en el origen: el registro nunca recibe un dato sensible.

## Migration Plan

No hay nada que migrar: es el primer código de la app. Para deshacerlo, se revierte el PR; el registro en Firebase y el AVD quedan en la consola y en la máquina, y no afectan al repo.
