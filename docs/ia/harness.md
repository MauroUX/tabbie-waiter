# Harness de agentes: Tabbie Waiter App

> Inventario de lo que hace que cada sesión de agente arranque sabiendo qué es el proyecto, qué no se toca y cómo se trabaja un ticket. Crece con cada prompt del setup (S-001 a S-005) y con los tickets que suman piezas.
>
> La base son [AGENTS.md](../../AGENTS.md), la [Definition of Done](../backlog/definition-of-done.md) y las decisiones DP-06, DP-07, DP-08, DP-11 y DP-12 de los [tickets](../backlog/tickets/README.md).

**Capas:** instrucción (lo que el agente lee al arrancar), skill, subagente, hook, permiso (lo que se deja o no se deja hacer o entrar al repo), configuración, MCP, eval y CI.

## Piezas

| Pieza | Archivo | Qué hace | Qué fallo evita | Capa | Fecha | Prompt |
|---|---|---|---|---|---|---|
| Instrucciones del repo | `AGENTS.md` | Dice qué es el repo, lo que no se toca con su porqué, cómo se trabaja un ticket, las ramas, la DoD (importada) y OpenSpec | Una sesión que arranca sin saber que `backend/` no se toca, que no hay base local o que las acciones no se repiten | Instrucción | 2026-11-15 | S-001 |
| Instrucciones de Claude Code | `CLAUDE.md` | Importa `AGENTS.md` y dice qué se conserva al compactar | Instrucciones copiadas en dos archivos que se desalinean; perder el ticket, el plan o las decisiones del humano al compactar | Instrucción | 2026-11-15 | S-001 |
| Instrucciones de la réplica | `replica/CLAUDE.md` | Se carga solo al trabajar en `replica/`: cómo se comprueba que `backend/` no cambió, dónde van las pruebas, el OpenAPI y la CI sin Firebase | Pruebas por dentro de la copia, un contrato escrito sin validar o una CI que pide credenciales de Firebase | Instrucción | 2026-11-15 | S-001 |
| Archivos ignorados | `.gitignore` | Deja fuera del repo `.env*` y `*.env` (salvo `.env.example`, por si la copia de `backend/` lo trae, y los `<perfil>.env.example` propios), keystores, `local.properties`, lo generado por Node y Gradle, y lo local de Claude Code | Un archivo de variables o una keystore commiteados en un repo público (0009) | Permiso | 2026-11-16 | S-001, S-002 |
| Finales de línea | `.gitattributes` | LF por defecto y en `*.sh` y `gradlew`, CRLF en `*.bat` y `*.cmd`, `*.jar` y `*.png` binarios | Hooks que no arrancan en Git Bash por CRLF; binarios corrompidos por la conversión de finales de línea | Configuración | 2026-11-15 | S-001 |
| Configuración de OpenSpec | `openspec/config.yaml` | Da el contexto del proyecto y las reglas de cada artefacto: el no-alcance y el ticket en la propuesta, un scenario por criterio heredado, el test primero y cómo se deshace una carga de datos | Un change con criterios inventados o reescritos, una tarea sin test previo o una carga de datos sin vuelta atrás | Instrucción | 2026-11-15 | S-001 |
| Workflows de OpenSpec | `.claude/commands/opsx/` y `.claude/skills/openspec-*/` | Los comandos `/opsx:*` y sus skills: propose, explore, apply, update, sync, archive y verify | Un ticket que se implementa sin change, o que se cierra sin verificar ni archivar | Skill | 2026-11-15 | S-001 |
| Perfil global de OpenSpec | Fuera del repo; se comprueba con `openspec config list` | Fija los siete workflows con delivery `both` en la máquina de desarrollo | Un `openspec init` que genera menos workflows de los que el flujo del ticket usa | Configuración | 2026-11-15 | S-001 |
| Hook de datos | `.claude/hooks/datos-que-no-salen.sh` | En cada `git commit` por Bash o PowerShell, revisa lo staged y lo que suma un `git add` o un `-a` del mismo comando. Bloquea con código 2 los archivos que no se versionan (`.env*`, `*.env`, keystores, `google-services.json`, cuentas de servicio), las claves con forma reconocible (Google, GitHub, AWS, Anthropic, Slack, PEM, MercadoPago), `JWT_SECRET`, `FIREBASE_PRIVATE_KEY` y `REDIS_PASSWORD` con valor, los correos fuera de los dominios de ejemplo y los valores de `.claude/hooks/valores-prohibidos.local`. No exime `backend/` | Una credencial, una cuenta de servicio, un token de MercadoPago, un correo real o una contraseña de las cuentas de prueba commiteados en un repo público (0009, PR-1, PR-3, DP-07) | Hook | 2026-11-16 | S-002 |
| Valores prohibidos | `.claude/hooks/valores-prohibidos.local`, ignorado por git | Lo llena el humano, con un valor por línea: las contraseñas de las cuentas de prueba, que el hook bloquea literales | Una contraseña de prueba que no tiene una forma reconocible y entra al repo | Configuración | 2026-11-16 | S-002 |
| Hook de ramas | `.claude/hooks/ramas-protegidas.sh` | En cada `git push` por Bash o PowerShell, resuelve el destino real, incluidos el `git push` sin rama y `git -C`. Bloquea con código 2 el push a `main` o a una `feature/entrega-*`, el push forzado y el de todas las ramas | Un push directo a una rama de entrega, o una historia reescrita, sin PR ni merge del humano | Hook | 2026-11-16 | S-002 |
| Tests de los hooks | `.claude/hooks/tests/datos-que-no-salen.test.sh` y `.claude/hooks/tests/ramas-protegidas.test.sh` | Corren cada hook en un repo temporal: al menos un bloqueo por regla, con su fila en el registro y sin el valor, y los casos limpios que tienen que pasar. Arman los datos falsos por partes | Un hook que deja de bloquear, o que bloquea lo que no debe, sin que nadie lo note | Hook | 2026-11-16 | S-002 |
| Registro de bloqueos | `docs/seguridad/registro-de-bloqueos.md` | Una fila por bloqueo de los hooks: la fecha, el hook, la regla y el archivo o el destino, nunca el valor. Se commitea | Un bloqueo que no deja evidencia | Hook | 2026-11-16 | S-002 |
| Permisos del proyecto | `.claude/settings.json` | Cada regla, para Bash y para PowerShell. Bloquea editar `backend/`; leer `.env*`, `*.env`, `google-services.json`, las cuentas de servicio y `.claude/hooks/*.local`; `gh pr merge`, `gh repo delete` y el merge por `gh api`; el push forzado, el de todas las ramas y el push a `main` o a una `feature/entrega-*`. Pide permiso para crear, editar, comentar y cerrar issues; crear, comentar y editar PR; `git push` y `railway`. Permite leer issues y PR, `git status`, `diff` y `log`, y `openspec`. Registra los dos hooks | Un merge o un push a una rama de entrega hecho por el agente; un cambio en la copia de `backend/`; un secreto leído y copiado a la conversación | Permiso | 2026-11-16 | S-002 |
| Hooks que no se esquivan | `AGENTS.md`, "Lo que no se toca" | Cuando un hook bloquea, no se desactiva, no se saltea y no se reescribe el comando para esquivarlo: se cambia el dato y se vuelve a intentar | Un agente que reformula el comando hasta que el hook deja de verlo | Instrucción | 2026-11-16 | S-002 |
| Revisor adversarial | `.claude/agents/adversarial-reviewer.md` | Con el ticket, el change y el diff, intenta demostrar que el PR está mal: lo contrasta con los scenarios del change, las reglas del negocio (solo `waiter`, un restaurante, nada se repite solo, nada persistido salvo la sesión y las marcas, registros sin datos sensibles, `backend/` intacto), los `SEG-cN` y el OWASP Top 10, empezando por el control de acceso. Cada hallazgo trae `archivo:línea` o un fragmento citado y la regla que rompe, y es un hecho, un riesgo (con su escenario) o una opinión (con el experimento que la decide). Los hechos y los riesgos llevan prioridad. No reporta O1 a O4 salvo que el cambio los empeore. Cierra con lo que no revisó. Solo lectura (`Read`, `Grep`, `Glob`), con `opus`. Lo lanza el humano antes del merge (DP-12) | Un PR que se aprueba sin que nadie busque cómo rompe los criterios; un recurso pedido por su id sin comprobar el restaurante; hallazgos sin evidencia que no se pueden verificar | Subagente | 2026-11-17 | S-003 |
| Skill de commit | `.claude/skills/commit/SKILL.md` | Se niega en `main` y en una `feature/entrega-*`. Mira `git status` y stagea archivo por archivo lo de la petición, nunca `git add -A` ni `.`; lo ajeno lo avisa y no lo toca. Escribe el mensaje en español, `tipo(alcance): descripción`, con el `TK-NN` en el cuerpo y la línea de coautoría. Si el hook bloquea, cambia el dato y vuelve a intentar | Un commit que arrastra cambios ajenos o un archivo con secretos; mensajes con formas distintas; un commit directo en una rama de entrega | Skill | 2026-11-17 | S-003 |
| Cuándo se usan el revisor y la skill | `AGENTS.md`, "Cómo se trabaja un ticket", pasos 7 y 9 | Una línea por pieza: cada commit, con la skill `commit`; antes del merge, el humano lanza `adversarial-reviewer` con el ticket, el change y el diff | Una pieza que existe pero que nadie usa porque no se sabe cuándo | Instrucción | 2026-11-17 | S-003 |

## Comprobaciones

| Pieza | Prueba | Resultado | Fecha | Prompt |
|---|---|---|---|---|
| Revisor adversarial | Se le pasó un change mínimo con el scenario SEG-c8 y un `MesasService.obtenerMesa` que buscaba la mesa solo por su id, sin el `restaurantId` de la sesión, sin decirle dónde estaba el fallo. La rama y los archivos de la prueba se borraron después | Lo encontró como primer hallazgo, **crítico · hecho**, en `replica/src/prueba-revisor/mesas.service.ts:18-24`, con la cita `this.mesas.findOne({ where: { id: mesaId } })` y la regla que rompe (PA-2, SEG-c8, OWASP A01). Dio el arreglo mínimo (`where: { id: mesaId, restaurantId: sesion.restaurantId }`) y además señaló que el scenario SEG-c8 mide escrituras y no detecta una fuga de lectura | 2026-11-17 | S-003 |

## Huecos conocidos

| Hueco | Qué lo cubre mientras tanto | Cuándo se cierra |
|---|---|---|
| `Edit(/backend/**)` impide que el agente importe la copia en `backend/` en TK-01, y hacerlo por la terminal sería esquivar el bloqueo | La importación es una parada del humano, y la ficha de la copia vive fuera de `backend/`, en `docs/architecture/backend-upstream.md` (DP-47) | Cubierto |
| Los bloqueos de lectura frenan la herramienta Read, Grep, Glob y `cat`, `head`, `sed` o `tee` en Bash. En PowerShell, solo `Get-Content` con los patrones de `settings.json`. Un script que abre el archivo por su cuenta no pasa por ellos | Los secretos son variables de entorno y no están en el repo (PR-1) | Sin fecha |
| Las reglas de permisos no reconocen `git -C . push` ni un `git push` sin rama parado en una rama de entrega | El hook `ramas-protegidas` | Cubierto |
| Un bloqueo por permiso deja evidencia solo en la sesión, no en el registro | La sesión de Claude Code | Sin fecha |
| Los hooks corren solo en las sesiones de Claude Code: un `git commit` o un `git push` desde una terminal no pasa por ellos. El hook de datos tampoco revisa el mensaje del commit | gitleaks en la CI de cada PR (DP-11) | TK-01 |

## Pendiente

| Pieza | Capa | Disparador |
|---|---|---|
| Skill `replica-feature` y subagentes `test-writer` e `implementer` | Skill y subagente | S-004 |
| `android/CLAUDE.md`, skill `app-feature`, subagentes `android-test-writer` y `android-implementer`, y hook de ktlint | Instrucción, skill, subagente y hook | S-005 |
| CI de `.github/workflows/`: ktlint, tests de la app, tests de la réplica y gitleaks (DP-11) | CI | TK-01 |
| MCP `dbhub` | MCP | TK-02 |
| Evals E1 y E2 (no son las épicas del PRD) | Eval | Después del tercer ticket |
| Skills `ticket-a-change` y `cerrar-ticket` | Skill | Después del tercer ticket |
