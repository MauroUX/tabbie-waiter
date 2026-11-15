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
| Archivos ignorados | `.gitignore` | Deja fuera del repo `.env*` (salvo los ejemplos), keystores, `local.properties`, lo generado por Node y Gradle, y lo local de Claude Code | Un archivo de variables o una keystore commiteados en un repo público (0009) | Permiso | 2026-11-15 | S-001 |
| Finales de línea | `.gitattributes` | LF por defecto y en `*.sh` y `gradlew`, CRLF en `*.bat` y `*.cmd`, `*.jar` y `*.png` binarios | Hooks que no arrancan en Git Bash por CRLF; binarios corrompidos por la conversión de finales de línea | Configuración | 2026-11-15 | S-001 |
| Configuración de OpenSpec | `openspec/config.yaml` | Da el contexto del proyecto y las reglas de cada artefacto: el no-alcance y el ticket en la propuesta, un scenario por criterio heredado, el test primero y cómo se deshace una carga de datos | Un change con criterios inventados o reescritos, una tarea sin test previo o una carga de datos sin vuelta atrás | Instrucción | 2026-11-15 | S-001 |
| Workflows de OpenSpec | `.claude/commands/opsx/` y `.claude/skills/openspec-*/` | Los comandos `/opsx:*` y sus skills: propose, explore, apply, update, sync, archive y verify | Un ticket que se implementa sin change, o que se cierra sin verificar ni archivar | Skill | 2026-11-15 | S-001 |
| Perfil global de OpenSpec | Fuera del repo; se comprueba con `openspec config list` | Fija los siete workflows con delivery `both` en la máquina de desarrollo | Un `openspec init` que genera menos workflows de los que el flujo del ticket usa | Configuración | 2026-11-15 | S-001 |

## Pendiente

| Pieza | Capa | Disparador |
|---|---|---|
| Hook de pre-commit que bloquea credenciales y cuentas, en `.claude/hooks/` (DP-07) | Hook | S-002 |
| Subagente `adversarial-reviewer` (DP-12) y skill `commit` | Subagente y skill | S-003 |
| Skill `replica-feature` y subagentes `test-writer` e `implementer` | Skill y subagente | S-004 |
| `android/CLAUDE.md`, skill `app-feature`, subagentes `android-test-writer` y `android-implementer`, y hook de ktlint | Instrucción, skill, subagente y hook | S-005 |
| CI de `.github/workflows/`: ktlint, tests de la app, tests de la réplica y gitleaks (DP-11) | CI | TK-01 |
| MCP `dbhub` | MCP | TK-02 |
| Evals E1 y E2 (no son las épicas del PRD) | Eval | Después del tercer ticket |
| Skills `ticket-a-change` y `cerrar-ticket` | Skill | Después del tercer ticket |
