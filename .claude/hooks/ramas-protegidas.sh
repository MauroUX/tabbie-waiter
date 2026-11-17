#!/usr/bin/env bash
# PreToolUse (Bash y PowerShell) · ramas-protegidas
#
# Bloquea (exit 2) un `git push` que:
#   1. va a `main` o a una `feature/entrega-*`: explícito (`origin main`,
#      `HEAD:main`, `refs/heads/main`, `:main`) o implícito (un `git push` sin
#      rama, parado en una de ellas o con su upstream en una de ellas);
#   2. fuerza (`--force`, `--force-with-lease`, `-f`, un refspec con `+`);
#   3. empuja todas las ramas (`--all`, `--branches`, `--mirror`).
# También con opciones de git antes del subcomando (`git -C . push`), que las
# reglas de permisos de settings.json no reconocen.
#
# Las ramas de entrega solo cambian por PR, y el merge lo hace el humano.
# Cada bloqueo deja una fila en docs/seguridad/registro-de-bloqueos.md.
set -uo pipefail

HOOK="ramas-protegidas"
TAB=$'\t'
entrada=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  case "$entrada" in
    *push*)
      echo "Push bloqueado por .claude/hooks/$HOOK.sh: falta jq, así que no se puede revisar a qué rama va. Instalá jq y volvé a intentarlo." >&2
      exit 2 ;;
  esac
  exit 0
fi

cmd=$(printf '%s' "$entrada" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -n "$cmd" ] || exit 0
case "$cmd" in *push*) ;; *) exit 0 ;; esac

root="${CLAUDE_PROJECT_DIR:-}"
[ -n "$root" ] || root=$(git rev-parse --show-toplevel 2>/dev/null) || root=$PWD
cd "$root" || exit 0

registro="docs/seguridad/registro-de-bloqueos.md"
hallazgos=""
hallar() { hallazgos+="$1$TAB$2"$'\n'; }

protegida() {
  case "${1#refs/heads/}" in
    main|feature/entrega-*) return 0 ;;
  esac
  return 1
}

limpiar() { local w=${1//\"/}; w=${w//\'/}; printf '%s' "$w"; }

# Analiza un comando simple; si es un `git push`, anota lo que viola.
analizar() {
  local -a t
  read -r -a t <<< "$1"
  local n=${#t[@]} i=0 w dir="."

  # Hasta `git`, que tiene que ser el programa del comando: antes solo puede
  # haber asignaciones de variables o el `&` de PowerShell. Así un `grep` que
  # busca el texto "git push" no cuenta como push.
  while [ "$i" -lt "$n" ]; do
    w=$(limpiar "${t[$i]}")
    case "${w##*/}" in
      git|git.exe) break ;;
      \&|\(|*=*) i=$((i + 1)) ;;
      *) return 0 ;;
    esac
  done
  [ "$i" -lt "$n" ] || return 0
  i=$((i + 1))

  # Opciones de git, hasta el subcomando.
  while [ "$i" -lt "$n" ]; do
    w=$(limpiar "${t[$i]}")
    case "$w" in
      -C) dir=$(limpiar "${t[$((i + 1))]:-.}"); i=$((i + 2)) ;;
      -c) i=$((i + 2)) ;;
      -*) i=$((i + 1)) ;;
      push) break ;;
      *) return 0 ;;
    esac
  done
  [ "$i" -lt "$n" ] || return 0
  i=$((i + 1))

  local remoto="" forzado=0 todas=0 solo_tags=0
  local -a refs=()
  while [ "$i" -lt "$n" ]; do
    w=$(limpiar "${t[$i]}")
    case "$w" in
      --force|--force-with-lease|--force-with-lease=*|--force-if-includes) forzado=1 ;;
      --all|--branches|--mirror) todas=1 ;;
      --tags) solo_tags=1 ;;
      -o|--push-option|--repo|--receive-pack|--exec) i=$((i + 1)) ;;
      --*) ;;
      -*) [[ "$w" == *f* ]] && forzado=1 ;;
      [0-9]\>*|\>*|\<*|2\>\&1) ;;  # redirecciones
      *) if [ -z "$remoto" ]; then remoto=$w; else refs+=("$w"); fi ;;
    esac
    i=$((i + 1))
  done

  local actual upstream
  actual=$(git -C "$dir" symbolic-ref --short -q HEAD 2>/dev/null)
  upstream=""
  [ -n "$actual" ] && upstream=$(git -C "$dir" config --get "branch.$actual.merge" 2>/dev/null)

  [ "$todas" -eq 1 ] && hallar 3 "(todas las ramas)"

  local r dst
  local -a sin_mas=()
  for r in ${refs[@]+"${refs[@]}"}; do
    if [[ "$r" == +* ]]; then forzado=1; r=${r#+}; fi
    sin_mas+=("$r")
    if [[ "$r" == *:* ]]; then dst=${r#*:}; else dst=$r; fi
    [ "$dst" = "HEAD" ] && dst=$actual
    [ -n "$dst" ] && protegida "$dst" && hallar 1 "${dst#refs/heads/}"
  done

  # Sin rama: va a la actual o a su upstream, según push.default.
  if [ "${#refs[@]}" -eq 0 ] && [ "$todas" -eq 0 ] && [ "$solo_tags" -eq 0 ]; then
    if [ -n "$actual" ] && protegida "$actual"; then
      hallar 1 "$actual"
    elif [ -n "$upstream" ] && protegida "$upstream"; then
      hallar 1 "${upstream#refs/heads/}"
    fi
  fi

  if [ "$forzado" -eq 1 ]; then
    local destino="${sin_mas[*]:-${actual:--}}"
    hallar 2 "$destino"
  fi
}

while IFS= read -r seg; do
  analizar "$seg"
done < <(printf '%s\n' "$cmd" | sed -E 's/(&&|\|\||;|\|)/\n/g')

[ -n "$hallazgos" ] || exit 0

hallazgos=$(printf '%s' "$hallazgos" | awk '!v[$0]++')

nombre_regla() {
  case "$1" in
    1) echo "push a una rama protegida" ;;
    2) echo "push forzado" ;;
    3) echo "push de todas las ramas" ;;
  esac
}

{
  echo "Push bloqueado por .claude/hooks/$HOOK.sh:"
  while IFS="$TAB" read -r r d; do
    echo "  - regla $r ($(nombre_regla "$r")) · destino: $d"
  done <<< "$hallazgos"
  echo "main y feature/entrega-* solo cambian por PR, y el merge lo hace el humano. Pusheá tu rama de ticket (git push -u origin mc/tk-NN-<slug>), sin forzar, y abrí el PR."
  echo "No desactives ni saltees este hook, ni reescribas el comando para esquivarlo."
} >&2

if [ ! -f "$registro" ]; then
  mkdir -p "$(dirname "$registro")"
  printf '%s\n' \
    "# Registro de bloqueos" "" \
    "> Una fila por cada dato que frenan los hooks de \`.claude/hooks/\`: la fecha, el hook, la regla y el archivo o el destino. Nunca el valor." "" \
    "| Fecha (UTC) | Hook | Regla | Archivo o destino |" \
    "|---|---|---|---|" > "$registro"
fi
fecha=$(date -u +%Y-%m-%dT%H:%M:%SZ)
while IFS="$TAB" read -r r d; do
  echo "| $fecha | $HOOK | regla $r · $(nombre_regla "$r") | \`${d//|/\\|}\` |" >> "$registro"
done <<< "$hallazgos"

exit 2
