---
name: app-feature
description: Procedimiento obligatorio para los tickets de Frontend (la app Android). Explora el ticket, sus criterios heredados, el wireframe y los componentes, y propone un plan con cada pantalla y sus estados (carga, error, vacío y sin conexión), de qué componente sale cada parte y la lista scenario → test, con un caso a cada lado de cada borde. Se para a esperar la aprobación. Después escribe los tests con el subagente android-test-writer, comprueba el rojo con Gradle, los congela por su huella, implementa con el subagente android-implementer hasta el verde y cierra con ktlint, sin `!!` y con la captura en un emulador de 1280×800 en horizontal. Usar siempre en un ticket de Frontend, aunque nadie la pida.
---

# Un ticket de Frontend, de los criterios al verde

El orden es fijo: **explorar → plan → (aprobación) → tests → rojo → congelar → implementar → verde → huella intacta → cierre**.

- Cubre los pasos 4 a 6 de "Cómo se trabaja un ticket" de `AGENTS.md`. El commit, el PR y la revisión adversarial siguen ese procedimiento, no esta skill.
- Lo propio va en `android/`. `replica/` y `simulator/` no se tocan ([estructura.md](../../../docs/architecture/estructura.md), sección 3).
- Las reglas del código, de las pruebas y de la tablet están en `android/CLAUDE.md`.

## 0. Antes de empezar

- **Rama:** `mc/tk-NN-<slug>`. Si estás en `main` o en una `feature/entrega-*`, pará y proponela; no la crees sin que te lo pidan.
- **Change:** `openspec/changes/<nombre>/`, con un scenario por criterio heredado (DP-08). Si no existe, primero `/opsx:propose`. Sin el OK del humano sobre el change no se sigue.
- **Lo ajeno:** `git status --short`, y anotá lo que ya estaba sin commitear. No es de esta tarea y los subagentes no lo tocan.
- **Comandos:** los de `android/CLAUDE.md`, sección "Comandos". Si todavía no hay (antes de TK-04), el plan los propone y quedan en el informe para completar esa sección. No inventes otros.
- **El emulador:**
  - no está en el `PATH`: `"$LOCALAPPDATA/Android/Sdk/emulator/emulator"`;
  - `emulator -list-avds` tiene que mostrar `tablet-8-1280x800`. Si no está, el plan propone crearlo, con sus valores (1280×800, densidad 213, horizontal).

## 1. Explorar

- **El ticket** entero:
  - sus criterios heredados, y los que hereda "en parte", que se prueban solo en la parte que dice el ticket;
  - el alcance y lo que no incluye;
  - los pasos, incluidas sus **paradas del humano**;
  - su DoD propia.

  Contá los scenarios del change: habrá **un test por scenario**.
- **El wireframe** de `docs/design/` que enlaza el ticket.
  - Si el ticket dice "Ninguno", la pantalla es sin diseño; lo que eso cambia de RNF-10 lo dice el ticket.
  - Si lo enlaza y el archivo no existe, pará: los wireframes son del humano (DP-10).
- **`docs/architecture/componentes.md`, sección 1:**
  - qué componente da cada dato y cada estado de la pantalla;
  - qué reglas de 0005, 0006 y 0007 le tocan.
- **El contrato que usa:**
  - las filas Tnn del inventario del contexto (`docs/context/panel-mozos-actual.md`, secciones 2 y 3);
  - `docs/api/openapi.yaml`: los campos que la app lee, y los sensibles (`x-sensitive`), que no llegan a la pantalla ni al registro.
- **Lo que ya hay en `android/`,** para componer con el Cliente HTTP, el Monitor y Sesión en vez de repetirlos.
- **Los estados de cada pantalla:** carga, error, vacío, sin conexión y con datos, y lo que muestra cada uno.
- **Los bordes:** cada valor donde el comportamiento cambia. Por ejemplo:
  - los umbrales del cronómetro;
  - el saldo con la tolerancia de 0,01;
  - los 5 s del aviso sin conexión;
  - los 1,5 s del conjunto de pedidos;
  - los 4 s y los 10 s de espera.

  Cada uno lleva un caso a cada lado.
- **El contrato de la pieza,** que fijan los tests y respeta la implementación:
  - los paquetes y los nombres de las clases que usan los tests: ViewModel, estado de la pantalla, repositorio e interfaz de Retrofit;
  - las firmas que llaman los tests;
  - los textos visibles y los `testTag` con que se localiza cada parte de la pantalla.

  Si no se fija ahora, quien escribe los tests y quien implementa eligen distinto.

## 2. Plan, y PARÁ

**Por cada pantalla,** una tabla con sus estados. Los cuatro van siempre. Uno que no aplica se declara con su porqué; no se omite.

| Estado | Qué muestra | De qué componente sale | Test |
|---|---|---|---|
| Carga | | | |
| Error | | | |
| Vacío | | | |
| Sin conexión | | | |
| Con datos | | | |

Una pieza sin pantalla (un cliente, un repositorio) lo dice, y no lleva esta tabla.

**Las piezas,** una fila por pieza, en este orden y sin saltear ninguna. La que no hace falta se declara con su porqué.

| Pieza | Archivo | ¿Hace falta? | Por qué |
|---|---|---|---|
| Tests locales | `android/app/src/test/<paquete>/` | | |
| Tests en el dispositivo | `android/app/src/androidTest/<paquete>/` | | |
| Pantalla y ViewModel | `<funcionalidad>/` | | |
| Repositorio | `<funcionalidad>/` | | |
| Cliente y modelos de red | `comun/red/` | | |
| Módulos de Hilt | | | |
| Textos | `res/values/strings.xml` | | |
| Gradle | `gradle/libs.versions.toml` y `app/build.gradle.kts` | | |
| Documentación | `docs/` que el cambio deja desactualizada | | |
| Otras del ticket | p. ej. las variantes o la CI | | |

Debajo de las tablas:
- **scenario → test:** el ID del criterio, el título del test, la clase, el archivo y el tipo:
  - unitario, con MockK y Turbine;
  - de red, con MockWebServer;
  - de pantalla, con Compose UI test;
  - en el dispositivo, contra la réplica;
- **los bordes:** cada uno con el caso de cada lado y su test;
- **el contrato de la pieza** del paso 1;
- **las dependencias de prueba** que faltan en el catálogo de versiones;
- **las capturas:** qué pantalla, en qué estado, y dónde se guarda cada una;
- **las paradas del humano** que pide el ticket, y en qué paso de esta skill caen;
- **los comandos** para compilar, correr los tests e instalar en el emulador;
- **lo que queda fuera:** lo que el ticket dice que no incluye.

**Detenete acá y esperá la aprobación explícita.** No lances ningún subagente ni crees ningún archivo antes. Si piden cambios, rehacé el plan y volvé a parar.

## 3. Tests: subagente `android-test-writer`

Antes de lanzarlo, sumá al catálogo de versiones y a `app/build.gradle.kts` las dependencias de prueba que nombra el plan. Ni el escritor ni el implementador eligen librerías.

Lanzalo en primer plano, porque lo siguiente depende de él. Pasale:
- la ruta del change y la lista de sus scenarios, con su ID;
- las carpetas de los tests;
- del plan aprobado: las tablas de estados, los bordes y el contrato de la pieza;
- la hora de referencia literal, si algún test depende de la hora.

No le pases código de `android/app/src/main/`: no puede leerlo. Si vuelve con preguntas, contestalas con el plan o llevalas al humano; no le pases código para que se responda solo.

Al volver, leé los archivos vos:
- un test por scenario, por estado de cada pantalla y por lado de cada borde;
- el ID del criterio en el nombre de los que salen de un scenario;
- ningún reloj real, ni `Thread.sleep`, ni esperas por tiempo;
- la red, con MockWebServer, salvo los tests del dispositivo contra la réplica;
- la pantalla, localizada por el texto que ve el mozo o por los `testTag` del contrato;
- ningún secreto literal, y ningún `!!`.

## 4. Rojo

En Kotlin, un test que usa una clase que no existe no compila, y si no compila no se ve **por qué falla cada uno**. Por eso el rojo va en dos tiempos.

1. **Rojo de compilación.** Corré la compilación de los tests y guardá la salida en el scratchpad.
   - Las referencias que no resuelven tienen que ser todas del contrato de la pieza.
   - Cualquier otro error (un import mal escrito, una librería que falta) vuelve a `android-test-writer`.
2. **Rojo de cada test.**
   - Escribí vos el **esqueleto del contrato**: solo las declaraciones del plan, con los cuerpos en `TODO("TK-NN")` y sin ninguna lógica.
   - Corré los tests y guardá la salida.
   - Mostrá por qué falla cada uno (`NotImplementedError`, `expected:<Vacío> but was:<Carga>`, `expected 1 request, got 0`…).

Los tests del dispositivo se corren con el emulador encendido y, si el plan lo dice, con la réplica levantada.

- **Un test que pasa contra el esqueleto:** pará y decilo. Vuelve a `android-test-writer` para que le sume un control positivo, que solo pase con la funcionalidad real. Nunca se deja pasar.
- **Los tests que ya existían** siguen en verde. Si alguno estaba en rojo antes de empezar, anotalo para no atribuírselo a esta tarea.

## 5. Congelar

```bash
git add -- <cada archivo de test nuevo o cambiado>
sha256sum <los mismos archivos> | tee <scratchpad>/congelados.sha
```

- Mostrá la huella en el chat. Es la garantía de que los tests no cambian: no hay hook que la sustituya.
- El esqueleto del contrato no se congela: lo completa `android-implementer`.
- No se commitea.

## 6. Implementar: subagente `android-implementer`

Lanzalo en primer plano con:
- el change;
- el plan aprobado entero, con las tablas de estados, los bordes y el contrato;
- los archivos congelados y el esqueleto;
- lo ajeno del paso 0;
- las paradas del humano que quedan por delante.

Trabaja hasta que los tests salen en verde. Si el ticket tiene una parada del humano en el medio (por ejemplo, registrar la app en Firebase en TK-04), el subagente vuelve antes, la parada se le pide al humano y después se lo relanza.

**Disputas.** Si devuelve una, se la llevás al humano **tal cual**: el test, `archivo:línea`, qué dice el scenario, qué exige el test y la propuesta.
- No cambiás el test vos, ni él.
- Si el humano la acepta, el test lo corrige `android-test-writer`.
- Después se repiten el rojo y el congelado (pasos 4 y 5) de ese test, antes de seguir con `android-implementer`.

## 7. Verde y huella intacta

Los tests los corre la sesión principal, no solo el subagente.

```bash
sha256sum -c <scratchpad>/congelados.sha
git diff --stat -- android/app/src/test android/app/src/androidTest   # vacío: nada sin stagear encima de lo congelado
git status --short android/app/src/test android/app/src/androidTest   # nada nuevo fuera de lo congelado
<tests locales>                                                         # todos, no solo los nuevos
<tests en el dispositivo, si el plan los tiene>
```

Si la huella no cuadra, la implementación no vale aunque esté en verde: decilo y pará.

## 8. Cierre

- **ktlint** sin errores, sobre todo `android/`. Si falla en un test congelado, vuelve a `android-test-writer`, y se repiten el rojo y el congelado de ese test.
- **Sin `!!`:** `grep -rn --include='*.kt' '!!' android/` da vacío.
- **Las reglas del cliente HTTP y de los registros** (`android/CLAUDE.md`):
  - `grep -rn 'retryOnConnectionFailure' android/app/src/main` muestra solo `false`;
  - `grep -rnE 'Level\.(HEADERS|BODY)' android/app/src/main` da vacío.
- **La captura,** por Bash (en PowerShell 5.1 el PNG sale roto):
  1. Levantá el emulador en segundo plano: `"$LOCALAPPDATA/Android/Sdk/emulator/emulator" -avd tablet-8-1280x800 -no-snapshot-save`.
  2. Esperá el arranque: `adb wait-for-device shell 'while [ "$(getprop sys.boot_completed)" != 1 ]; do sleep 1; done'`.
  3. Comprobá el tamaño: `adb shell wm size` da 1280x800, y la pantalla está en horizontal.
  4. Instalá la variante local, con el comando de `android/CLAUDE.md`, y llevá la app al estado de la captura con la réplica y sus datos iniciales.
  5. Capturá: `adb exec-out screencap -p > <ruta del plan>`.
  6. Abrí la imagen y comprobá que está completa, sin desplazamiento horizontal y en español.

  Lo que muestra son solo datos sintéticos. 1920×1200 no lleva captura.
- **Lo que no se versiona:** ningún valor de secreto en lo nuevo, ni correos fuera de los dominios de ejemplo, ni `google-services.json`.
- **Las tareas del change:** marcá en `tasks.md` las que quedaron hechas.
- **Informe final:**
  - pieza → archivo, incluidas las que no hicieron falta;
  - pantalla → estado → test → rojo (con el motivo) → verde;
  - los bordes, con el caso de cada lado;
  - la huella: `sha256sum -c` en OK;
  - ktlint, la búsqueda de `!!` y las de las reglas del cliente;
  - las capturas, con su ruta;
  - las disputas, las paradas del humano y lo que quedó fuera del plan.

Esta skill **no hace commit**: eso es la skill `commit`.

## Lo que ya se aprendió haciéndolo

(Vacía. Se completa al cerrar cada ticket de Frontend con lo que costó y no estaba escrito.)
