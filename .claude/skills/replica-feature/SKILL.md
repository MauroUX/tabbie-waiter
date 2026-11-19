---
name: replica-feature
description: Procedimiento obligatorio para los tickets de Backend (réplica y simulador). Explora el ticket, el contrato del contexto, el modelo de datos y openapi.yaml, propone un plan con una fila por pieza y se para a esperar la aprobación. Después escribe los tests de contrato con el subagente test-writer, comprueba el rojo, los congela por su huella, implementa con el subagente implementer hasta el verde y cierra con el OpenAPI regenerado sin diferencias y las respuestas validadas contra él. Usar siempre en un ticket de Backend, aunque nadie la pida.
---

# Un ticket de Backend, de los criterios al verde

El orden es fijo: **explorar → plan → (aprobación) → tests → rojo → congelar → implementar → verde → huella intacta → cierre**. Cubre los pasos 4 a 6 de "Cómo se trabaja un ticket" de `AGENTS.md`. El commit, el PR y la revisión adversarial siguen ese procedimiento, no esta skill.

Todo va en `replica/` y en `simulator/`. La réplica es propia (0010): se construye desde el contrato y el comportamiento del contexto, con O1 a O4 reproducidos a propósito (DP-50). El código de Tabbie no se lee.

## 0. Antes de empezar

- **Rama:** `mc/tk-NN-<slug>`. Si estás en `main` o en una `feature/entrega-*`, pará y proponela; no la crees sin que te lo pidan.
- **Change:** `openspec/changes/<nombre>/`, con un scenario por criterio heredado (DP-08). Si no existe, primero `/opsx:propose`. Sin el OK del humano sobre el change no se sigue.
- **Lo ajeno:** `git status --short`, y anotá lo que ya estaba sin commitear. No es de esta tarea y los subagentes no lo tocan.
- **Comandos:** los de `AGENTS.md`, sección "Comandos". Si todavía no hay (antes de TK-01), el plan los propone y quedan en el informe para completar esa sección. No inventes otros.

## 1. Explorar

- **El ticket** entero: sus criterios heredados, el alcance, lo que no incluye, los pasos (incluidas sus **paradas del humano**) y su DoD propia. Contá los scenarios del change: habrá **un test por scenario**. Los criterios que el ticket hereda "en parte" se prueban solo en la parte que dice el ticket.
- **El contrato que usa:**
  - el contexto (`docs/context/panel-mozos-actual.md`): las filas Tnn que nombra el ticket (secciones 2 y 3), el origen de los eventos y los endpoints del comensal (sección 2), el ciclo del pedido (sección 4), el tiempo real (sección 5) y las observaciones O1 a O4 (sección 7);
  - `docs/architecture/modelo-de-datos.md`, para las tablas que tocan las migraciones o que el test inserta o mira;
  - `docs/api/openapi.yaml`, si existe.
- **El reparto de DP-53** (`docs/backlog/tickets/README.md`, "Decisiones tomadas (2026-11-17)"): qué endpoints y eventos construye este ticket, y cuáles ya existen.
- **Lo que el contexto no fija** (un cuerpo, una respuesta, un código de error): es un **hueco**. No se inventa ni se busca en el código de Tabbie: va al plan como pregunta para el humano.
- **Las piezas de contrato** que fijan los tests y que la implementación tiene que respetar: método y ruta, códigos de estado, forma del cuerpo (los campos que manda y los que lee la app) y, si el test mira la base, las tablas y columnas con su tipo. Si no se fijan ahora, quien escribe los tests y quien implementa eligen distinto.
- **Qué huecos de O1 a O4 toca el ticket:** cada uno se reproduce a propósito y su scenario lo dice (DP-50).

## 2. Plan, y PARÁ

Una fila por pieza, en este orden y sin saltear ninguna. La que no hace falta se declara con su porqué.

| Pieza | Archivo | ¿Hace falta? | Por qué |
|---|---|---|---|
| Tests de contrato | `replica/tests/<área>/<nombre>.test.ts` o `simulator/test/<nombre>.test.ts` | | |
| Datos iniciales | `replica/datos-iniciales/` (DP-16), con cómo se deshace la carga | | |
| Escenario del simulador | `simulator/src/` | | |
| Réplica | `replica/src/`: los endpoints y eventos del reparto de DP-53 | | |
| Migraciones | `replica/src/migrations/` (DP-51), con cómo se deshace cada una | | |
| Compose | `compose.yaml` | | |
| Contrato | `docs/api/openapi.yaml`, generado desde el código (DP-52) | | |
| Documentación | `docs/` que el cambio deja desactualizada | | |
| Otras del ticket | p. ej. `replica/entornos/`, la CI | | |

Debajo de la tabla:
- **scenario → test:** el ID del criterio, el título del test y el archivo;
- **las piezas de contrato** del paso 1;
- **los huecos del contrato** que el humano tiene que resolver antes de los tests;
- **las paradas del humano** que pide el ticket, y en qué paso de esta skill caen;
- **los comandos** para levantar la réplica y correr la suite;
- **lo que queda fuera:** lo que el ticket dice que no incluye.

**Detenete acá y esperá la aprobación explícita.** No lances ningún subagente ni crees ningún archivo antes. Si piden cambios, rehacé el plan y volvé a parar.

## 3. Tests: subagente `test-writer`

Lanzalo en primer plano, porque lo siguiente depende de él. Pasale:
- la ruta del change y la lista de sus scenarios, con su ID;
- la carpeta de los tests;
- las piezas de contrato del plan, con las tablas y columnas;
- la hora de referencia literal, si algún scenario depende de la hora.

No le pases código de `replica/` fuera de `replica/tests/`, ni de `simulator/src/`, ni de Tabbie: no puede leerlo. Si vuelve con preguntas, contestalas con el plan o llevalas al humano; no le pases código para que se responda solo.

Al volver, leé los archivos vos: un test por scenario, con el ID del criterio en el nombre; ningún id supuesto; ningún reloj; datos sembrados en el test y a la vista; ningún secreto literal.

## 4. Rojo

Corré la suite y guardá la salida en el scratchpad. Mostrá **por qué falla cada test** (`expected 200, got 404`, `ECONNREFUSED`, `relation does not exist`…).

- **Un test que nace en verde:** pará y decilo. La réplica es propia y lo que el ticket construye todavía no existe, así que ningún test tiene motivo para pasar. Vuelve a `test-writer` para que le sume un control positivo, que solo pase con la funcionalidad real. Nunca se deja pasar.
- **Si la réplica todavía no se puede levantar** (TK-01 la crea), el rojo es por conexión rechazada: anotá ese motivo, y cuando la réplica base exista, mostrá que cada test falla por lo que el ticket todavía no construyó.
- Los tests que ya existían siguen en verde. Si alguno estaba en rojo antes de empezar, anotalo para no atribuírselo a esta tarea.

## 5. Congelar

```bash
git add -- <cada archivo de test nuevo o cambiado>
sha256sum <los mismos archivos> | tee <scratchpad>/congelados.sha
```

Mostrá la huella en el chat. Es la garantía de que los tests no cambian: no hay hook que la sustituya. No se commitea.

## 6. Implementar: subagente `implementer`

Lanzalo en primer plano con:
- el change;
- el plan aprobado entero, con las piezas de contrato;
- los archivos congelados;
- lo ajeno del paso 0;
- las paradas del humano que quedan por delante.

Trabaja hasta que la suite sale en verde. Si el ticket tiene una parada del humano en el medio (por ejemplo, un hueco del contrato que el humano tiene que resolver), el subagente vuelve antes, la parada se le pide al humano y después se lo relanza.

**Disputas.** Si devuelve una, se la llevás al humano **tal cual**: el test, `archivo:línea`, qué dice el scenario, qué exige el test y la propuesta. No cambiás el test vos, ni él. Si el humano la acepta, el test lo corrige `test-writer`, y se repiten el rojo y el congelado (pasos 4 y 5) de ese test antes de seguir con `implementer`.

## 7. Verde y huella intacta

La suite la corre la sesión principal, no solo el subagente.

```bash
sha256sum -c <scratchpad>/congelados.sha
git diff --stat -- replica/tests simulator/test   # vacío: nada sin stagear encima de lo congelado
git status --short replica/tests simulator/test   # nada nuevo fuera de lo congelado
<comando de la suite>                              # entera, no solo los tests nuevos
```

Si la huella no cuadra, la implementación no vale aunque esté en verde: decilo y pará.

## 8. Cierre

- **El OpenAPI regenerado:** `docs/api/openapi.yaml` se genera desde el código y no tiene diferencias con el que va en el PR (DP-52), como lo comprueba la CI.
- **El contrato:** las pruebas de contrato validan las respuestas reales de la réplica contra `docs/api/openapi.yaml`. Comprobá que cada entrada que tocó el ticket tiene su validación, que los campos sensibles llevan `x-sensitive: true`, y que ninguna ruta, cuerpo o evento cambió respecto del contexto sin que el ticket lo pida (DP-49).
- **O1 a O4:** sus pruebas siguen pasando (DP-50).
- **Lo que no se versiona:** ningún valor de secreto en lo nuevo, ni correos fuera de los dominios de ejemplo. `replica/entornos/` trae solo nombres.
- **Las tareas del change:** marcá en `tasks.md` las que quedaron hechas.
- **Informe final:**
  - pieza → archivo, incluidas las que no hicieron falta;
  - scenario → rojo (con el motivo) → verde;
  - la huella: `sha256sum -c` en OK;
  - el OpenAPI regenerado sin diferencias;
  - las disputas, las paradas del humano, los huecos del contrato y lo que quedó fuera del plan.

Esta skill **no hace commit**: eso es la skill `commit`.

## Lo que ya se aprendió haciéndolo

Se completa al cerrar cada ticket de Backend con lo que costó y no estaba escrito.

**TK-01 (réplica base):**

- **Los subagentes corren en segundo plano.** Se espera su aviso de que terminaron; mientras tanto no se toca lo que están escribiendo.
- **Si el ticket tiene una parada del humano en medio de la implementación** (por ejemplo, el archivo local de variables), el `implementer` se lanza en dos fases: la infraestructura primero, después la parada, después el contrato. Entre las dos se corre un segundo rojo, con el stack levantado, y cada test tiene que fallar por lo que falta (404) y no por conexión.
- **Rojo sin réplica:** se corre la imagen de las pruebas con `--network none` y las direcciones a puertos cerrados de `127.0.0.1`, así el motivo es `ECONNREFUSED` y no "falta la variable".
- **Antes de congelar:** gitleaks `dir` sobre `replica/tests/` y una búsqueda de correos en los `package-lock.json`. npm copia en `deprecated` avisos de terceros con correos que bloquea el hook; se quitan antes del congelado.
- **Dependencias:** `npm view <paquete>@<versión> engines` para cada una contra Node 20 (firebase-admin 14 pide Node 22).
- **gitleaks `dir` también lee los archivos ignorados** (los `.env` del humano): se corre con `--redact` y se muestran solo la regla y el archivo. Un hallazgo en un archivo ignorado no es del repo.
- **Cambiar de perfil exige `down -v`:** MySQL guarda el usuario y la contraseña del primer arranque.
- **`@ApiProduces('text/event-stream')` alcanza también a las respuestas de error:** los 401 y 403 del stream se declaran con `application/json`.
- **La carpeta temporal de la sesión puede cambiar entre turnos:** la huella se copia a la nueva antes de verificarla.

**TK-02 (datos iniciales y cuentas de prueba):**

- **`up --wait` con un servicio de una sola vez falla aunque salga con 0,** salvo que otro servicio del mismo `up` dependa de él con `service_completed_successfully`. Una prueba con un servicio que sigue corriendo cuando Compose mira no lo detecta: se prueba con uno que termina enseguida.
- **`docker compose run --build` escribe el progreso del build en stdout** (Compose v2.39): si un test lee la salida, `--progress quiet`.
- **Git Bash convierte `/repo` de `docker run -v` en una ruta de Windows:** `MSYS_NO_PATHCONV=1` y `pwd -W`.
- **En Compose, `environment` pisa a `env_file`:** una variable interpolada vacía en `environment` tapa la del `env_file`. Cada variable, en un solo archivo.
- **Un rojo por mutación tiene que compilar:** si el `up` de la imagen mutada falla, la prueba corre contra la anterior. Se mira el código de salida del `up` antes de leer el resultado.
- **Un rojo que solo falla porque falta una variable no prueba nada:** se muestra cambiando los datos de entrada (una contraseña equivocada, una fecha anterior).
- **Un servicio externo puede tener ya lo que el ticket crea:** primero el modo que no escribe (`plan`), y si algo ya existe, se para y se pregunta.
- **Un subagente puede volver "esperando su trabajo en segundo plano":** antes de correr nada, se mira el estado del stack.
- **Las reglas de los tests congelados se le pasan al `implementer`:** por ejemplo, lo que `seg-c11` prohíbe en el SQL también vale en los comentarios.
- **El scratchpad cambió tres veces en el ticket:** la huella se copia cada vez.
