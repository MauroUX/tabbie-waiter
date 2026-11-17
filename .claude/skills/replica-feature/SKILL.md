---
name: replica-feature
description: Procedimiento obligatorio para los tickets de Backend (réplica y simulador). Explora el ticket, el contrato y backend/ en solo lectura, propone un plan con una fila por pieza y se para a esperar la aprobación. Después escribe los tests de contrato con el subagente test-writer, comprueba el rojo, los congela por su huella, implementa con el subagente implementer hasta el verde y cierra con backend/ intacto y las respuestas validadas contra openapi.yaml. Usar siempre en un ticket de Backend, aunque nadie la pida.
---

# Un ticket de Backend, de los criterios al verde

El orden es fijo: **explorar → plan → (aprobación) → tests → rojo → congelar → implementar → verde → huella intacta → cierre**. Cubre los pasos 4 a 6 de "Cómo se trabaja un ticket" de `AGENTS.md`. El commit, el PR y la revisión adversarial siguen ese procedimiento, no esta skill.

Lo propio va en `replica/` y en `simulator/`. `backend/` es la copia sin cambios de `c18b0f7` (0002): se lee y nunca se escribe.

## 0. Antes de empezar

- **Rama:** `mc/tk-NN-<slug>`. Si estás en `main` o en una `feature/entrega-*`, pará y proponela; no la crees sin que te lo pidan.
- **Change:** `openspec/changes/<nombre>/`, con un scenario por criterio heredado (DP-08). Si no existe, primero `/opsx:propose`. Sin el OK del humano sobre el change no se sigue.
- **Lo ajeno:** `git status --short`, y anotá lo que ya estaba sin commitear. No es de esta tarea y los subagentes no lo tocan.
- **Comandos:** los de `AGENTS.md`, sección "Comandos". Si todavía no hay (antes de TK-01), el plan los propone y quedan en el informe para completar esa sección. No inventes otros.

## 1. Explorar

- **El ticket** entero: sus criterios heredados, el alcance, lo que no incluye, los pasos (incluidas sus **paradas del humano**) y su DoD propia. Contá los scenarios del change: habrá **un test por scenario**. Los criterios que el ticket hereda "en parte" se prueban solo en la parte que dice el ticket.
- **El contrato que usa:**
  - el inventario del contexto (`docs/context/panel-mozos-actual.md`, secciones 2 y 3) por las filas Tnn que nombra el ticket;
  - `docs/api/openapi.yaml`, si existe;
  - `docs/architecture/modelo-de-datos.md`, si el test inserta o mira algo en la base.
- **`backend/`, en solo lectura,** para confirmar rutas, guards y formas de respuesta. Lo que leas ahí no se le pasa a `test-writer` como código: se vuelve pieza de contrato del plan. Si la copia no coincide con el contexto, se corrige el contexto, nunca la copia.
- **Las piezas de contrato** que fijan los tests y que la implementación tiene que respetar: método y ruta, códigos de estado, forma del cuerpo (los campos que manda y los que lee la app) y, si el test mira la base, las tablas y columnas con su tipo. Si no se fijan ahora, quien escribe los tests y quien implementa eligen distinto.
- **Qué tests son de caracterización de la copia:** los que comprueban un comportamiento que ya trae `backend/` y que nacen en verde con la réplica levantada.

## 2. Plan, y PARÁ

Una fila por pieza, en este orden y sin saltear ninguna. La que no hace falta se declara con su porqué.

| Pieza | Archivo | ¿Hace falta? | Por qué |
|---|---|---|---|
| Tests de contrato | `replica/tests/<área>/<nombre>.test.ts` o `simulator/test/<nombre>.test.ts` | | |
| Datos iniciales | `replica/datos-iniciales/` (DP-16), con cómo se deshace la carga | | |
| Escenario del simulador | `simulator/src/` | | |
| Compose | `compose.yaml` | | |
| Contrato | `docs/api/openapi.yaml` (DP-09, DP-42) | | |
| Documentación | `docs/` que el cambio deja desactualizada | | |
| Otras del ticket | p. ej. `replica/entornos/`, la CI | | |

Debajo de la tabla:
- **scenario → test:** el ID del criterio, el título del test y el archivo;
- **las piezas de contrato** del paso 1;
- **qué tests son de caracterización**, y cómo se va a demostrar que detectan algo (paso 4);
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

No le pases código de `backend/src/`, de `replica/` fuera de `replica/tests/`, ni de `simulator/src/`: no puede leerlo. Si vuelve con preguntas, contestalas con el plan o llevalas al humano; no le pases código para que se responda solo.

Al volver, leé los archivos vos: un test por scenario, con el ID del criterio en el nombre; ningún id supuesto; ningún reloj; datos sembrados en el test y a la vista; ningún secreto literal.

## 4. Rojo

Corré la suite y guardá la salida en el scratchpad. Mostrá **por qué falla cada test** (`expected 200, got 404`, `ECONNREFUSED`, `relation does not exist`…).

- **Un test que nace en verde sin ser de caracterización:** pará y decilo. Vuelve a `test-writer` para que le sume un control positivo, que solo pase con la funcionalidad real. Nunca se deja pasar.
- **Un test de caracterización:** se demuestra que detecta algo. Cambiá **una vez** su valor esperado (el código, un campo, un tipo), mostralo en rojo con ese motivo y restauralo. Si la réplica todavía no se puede levantar (el ticket la crea), en el rojo falla por conexión rechazada: anotá ese motivo, y la demostración se hace en el paso 7, antes de `sha256sum -c`, que prueba que se restauró.
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

Trabaja hasta que la suite sale en verde. Si el ticket tiene una parada del humano en el medio (por ejemplo, la importación de la copia en TK-01), el subagente vuelve antes, la parada se le pide al humano y después se lo relanza.

**Disputas.** Si devuelve una, se la llevás al humano **tal cual**: el test, `archivo:línea`, qué dice el scenario, qué exige el test y la propuesta. No cambiás el test vos, ni él. Si el humano la acepta, el test lo corrige `test-writer`, y se repiten el rojo y el congelado (pasos 4 y 5) de ese test antes de seguir con `implementer`.

## 7. Verde y huella intacta

La suite la corre la sesión principal, no solo el subagente.

```bash
# demostración de los tests de caracterización pendientes del paso 4: cambiar, ver rojo, restaurar
sha256sum -c <scratchpad>/congelados.sha
git diff --stat -- replica/tests simulator/test   # vacío: nada sin stagear encima de lo congelado
git status --short replica/tests simulator/test   # nada nuevo fuera de lo congelado
<comando de la suite>                              # entera, no solo los tests nuevos
```

Si la huella no cuadra, la implementación no vale aunque esté en verde: decilo y pará.

## 8. Cierre

- **`backend/` intacto:** `git diff --stat backend-base -- backend/` da vacío. `backend-base` es la etiqueta que deja TK-01 en el commit que importa la copia (DP-46, DP-47). Si todavía no existe, decilo: el cierre no se da por bueno sin ella.
- **El contrato:** las pruebas de contrato validan las respuestas reales de la réplica contra `docs/api/openapi.yaml`. Comprobá que cada entrada que tocó el ticket tiene su validación y que los campos sensibles llevan `x-sensitive: true`.
- **Lo que no se versiona:** ningún valor de secreto en lo nuevo, ni correos fuera de los dominios de ejemplo. `replica/entornos/` trae solo nombres.
- **Las tareas del change:** marcá en `tasks.md` las que quedaron hechas.
- **Informe final:**
  - pieza → archivo, incluidas las que no hicieron falta;
  - scenario → rojo (con el motivo) → verde, y para los de caracterización, el valor que se cambió para verlos en rojo;
  - la huella: `sha256sum -c` en OK;
  - el diff vacío de `backend/`;
  - las disputas, las paradas del humano y lo que quedó fuera del plan.

Esta skill **no hace commit**: eso es la skill `commit`.

## Lo que ya se aprendió haciéndolo

(Vacía. Se completa al cerrar cada ticket de Backend con lo que costó y no estaba escrito.)
