# AGENTS.md · Tabbie Waiter App

Tabbie Waiter App es la app Android de tablet para el mozo de un restaurante que usa Tabbie: reemplaza el panel de mozos actual con los mismos endpoints y eventos.
Es un monorepo con la app (`android/`), la réplica del backend (`backend/` y `replica/`), el simulador de comensales (`simulator/`) y la documentación (`docs/`).
Fuera de `docs/` todavía no hay código: lo crean los tickets TK-01 a TK-16, en orden.

| Artefacto | Dónde |
|---|---|
| PRD del MVP (RF-n, RNF-n, M-n) | `docs/prd/tabbie-waiter-mvp.md` |
| Panel de mozos actual (Cn, Tnn, On) | `docs/context/panel-mozos-actual.md` |
| Backlog e historias, con sus criterios (HU-nn) | `docs/backlog/README.md` y `docs/backlog/historias/` |
| Tickets y decisiones DP-nn | `docs/backlog/tickets/` |
| Definition of Done | `docs/backlog/definition-of-done.md` |
| Decisiones de arquitectura (NNNN) | `docs/adr/` |
| Componentes, estructura, infraestructura, seguridad (PA-n, PR-n, SEG-cN), walking skeleton (WS-cN) y modelo de datos | `docs/architecture/` |
| Contrato de la API | `docs/api/openapi.yaml`, que escribe TK-01 (DP-42) |
| Inventario del harness | `docs/ia/harness.md` |

Un número de cuatro cifras remite a un ADR; los demás IDs son los de cada documento.

## Lo que no se toca

- **`backend/` es la copia sin cambios de `order-pay-backend` en `c18b0f7` (0002).** Lo propio va en `replica/` o en `simulator/`.
  Por qué: la app pasa al backend real cambiando solo la URL base, y un cambio en la copia lo rompe sin que se note.
- **La app no tiene base local (0005):** solo DataStore, para la sesión y las marcas de "Atendido".
  Por qué: las mesas llegan con emails de comensales y tokens de MercadoPago (O4), y lo que no se guarda no se lee de una tablet perdida (PA-3).
- **Ninguna acción que cambia datos se repite sola (0007, RNF-6),** ni por la app ni por el cliente HTTP.
  Por qué: `/pay` y `/add-payment` no son idempotentes, y una acción repetida es un cobro duplicado (M-2).
- **La app es solo para el rol `waiter`, en un único restaurante,** el del inicio de sesión.
  Por qué: el backend no restringe por rol ni por restaurante todos los endpoints del mozo (O2, O3); lo decide la app (PA-1, PA-2).
- **No entra al repo ninguna credencial ni cuenta (0009), y no se leen archivos `.env` ni datos de Tabbie.**
  Por qué: el repo es público, y con la cuenta de servicio de Firebase o con `JWT_SECRET` se toma el proyecto de Tabbie o se firma un JWT de cualquier rol (PR-1).
- **Cuando un hook de `.claude/hooks/` bloquea, no se desactiva, no se saltea y no se reescribe el comando para esquivarlo:** se cambia el dato y se vuelve a intentar.

## Cómo se trabaja un ticket

1. **El issue** del ticket.
2. **El change de OpenSpec** (`/opsx:propose`), con un scenario por criterio heredado, con su ID y su texto copiado (DP-08). Nunca un criterio inventado.
3. **El OK del humano** sobre el change. Sin OK no se escribe código.
4. **El test primero, en rojo:** uno por scenario, y se lo ve fallar.
5. **La implementación hasta el verde** (`/opsx:apply`), sin cambiar los tests del paso 4.
6. **`/opsx:verify`.**
7. **El commit, siempre con la skill `commit`.** Antes de cada commit, el hook `datos-que-no-salen` bloquea credenciales y cuentas (DP-07).
8. **El PR**, con `Closes #n`.
9. **La revisión adversarial, antes del merge:** el humano lanza el subagente `adversarial-reviewer` con el ticket, el change y el diff, y el informe queda como comentario del PR (DP-12).
10. **El merge, que lo hace el humano.** El agente nunca mergea.
11. **`/opsx:archive`.**

**Tickets de Backend: skill `replica-feature`, siempre, aunque nadie la pida.** Cubre los pasos 4 a 6, con los subagentes `test-writer` e `implementer`.

**Tickets de Frontend: skill `app-feature`, siempre, aunque nadie la pida.** Cubre los pasos 4 a 6, con los subagentes `android-test-writer` y `android-implementer`.

## Ramas

- Una por ticket: `mc/tk-NN-<slug>`, con PR hacia `feature/entrega-2-mc`.
- Nunca se commitea en `main` ni directo en una `feature/entrega-*`.

## Definition of Done

@docs/backlog/definition-of-done.md

## Comandos

Todavía no hay. Esta sección se completa con TK-01 (réplica) y TK-04 (app). No inventes comandos.

## OpenSpec

- El perfil es global y no viaja con el repo.
- Hacen falta los workflows propose, explore, apply, update, sync, archive y verify, con delivery `both`.
- Se comprueba con `openspec config list`.
- La configuración del proyecto, con sus reglas para cada artefacto, está en `openspec/config.yaml`.

## Idioma

Español en los artefactos, los commits y los PR.
