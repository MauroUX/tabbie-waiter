---
name: commit
description: Commitea el trabajo de la petición en curso con un mensaje en español `tipo(alcance): descripción` y el TK-NN en el cuerpo. Stagea archivo por archivo, nunca todo junto. Se usa en cada commit, también en el paso 7 del ticket.
---

# Commit

## 1. La rama

- Ejecutá `git branch --show-current`.
- Si es `main`, una `feature/entrega-*` o un HEAD suelto, no commitees. Decíselo al humano y proponé la rama del ticket, `mc/tk-NN-<slug>`. No la crees ni cambies de rama si no te lo pide.

## 2. Qué entra

- Ejecutá `git status --short`, `git diff` y `git diff --staged`.
- Separá lo que es de esta petición de lo ajeno: cambios que ya estaban antes de empezar, archivos que no creaste ni editaste, y lo que ya estaba staged.
- Stageá lo de la petición de a un archivo: `git add -- <archivo>`. Nunca uses `git add -A`, `git add .`, `git add -u`, `git commit -a` ni comodines.
- Lo ajeno no se toca: ni se stagea, ni se saca del índice, ni se descarta. Avisá qué es.
- Si hay algo ajeno ya staged, pará y preguntá. Si commiteás, entra en el commit.
- Si un archivo puede traer un secreto (`.env*`, `*.local`, un JSON con claves), no lo stagees y preguntá.

## 3. El mensaje

- **Primera línea:** `tipo(alcance): descripción`, de 72 caracteres como máximo.
  - **Tipo:** `feat`, `fix`, `test`, `docs`, `chore`, `refactor` o `ci` (los workflows de `.github/workflows/`).
  - **Alcance:** la parte que cambia: `app`, `replica`, `simulador`, `docs`, `openspec` o `harness`.
  - **Descripción:** en español, en presente ("agrega", "corrige"), en minúscula y sin punto final.
- **Cuerpo:** qué cambia y por qué, solo si la primera línea no alcanza. Si hay ticket, `TK-NN`, tomado de la rama `mc/tk-NN-*` o del change.
- **Última línea:** la coautoría del modelo que commitea, `Co-Authored-By: <modelo> <correo>`, con el nombre y el correo que da el entorno de Claude Code.
- Pasá el mensaje con un heredoc en Bash o con una here-string `@'…'@` en PowerShell.

## 4. Si el hook bloquea

Aplicá la regla de `AGENTS.md`: el hook no se desactiva, no se saltea y el comando no se reescribe para esquivarlo. Cambiá el dato: sacá el archivo con `git restore --staged <archivo>`, o reemplazá el valor por un marcador o una variable de entorno. Después volvé a intentar. Si el dato es de la petición y no sabés cómo cambiarlo, pará y preguntá.

Cada bloqueo deja una fila en `docs/seguridad/registro-de-bloqueos.md`, con la regla y el archivo, sin el valor. Ese cambio es de la petición: entra en el siguiente commit.

## 5. Después

- Ejecutá `git log -1 --stat` e informá el hash, el mensaje y los archivos.
- No pushees: el push es un paso aparte y pide permiso.
