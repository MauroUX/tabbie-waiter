#!/usr/bin/env bash
# PreToolUse (Bash y PowerShell) · datos-que-no-salen (DP-07, PR-1, PR-3, 0009)
#
# Antes de un `git commit`, bloquea (exit 2) si lo que va a entrar al repo trae:
#   1. un archivo que no se versiona: variables de entorno (salvo los de ejemplo),
#      keystores, google-services.json, los valores locales de los hooks o un
#      JSON de cuenta de servicio (`"type": "service_account"` o `private_key`);
#   2. una clave con forma reconocible: AWS, Anthropic, GitHub, Google, Slack,
#      claves privadas PEM y tokens de MercadoPago;
#   3. JWT_SECRET, FIREBASE_PRIVATE_KEY o REDIS_PASSWORD con un valor asignado
#      (el nombre solo, o tomado del entorno, no bloquea);
#   4. un correo fuera de example.com, example.org, example.net y github.com;
#   5. una contraseña de las cuentas de prueba: los valores, uno por línea, de
#      .claude/hooks/valores-prohibidos.local, que está ignorado y lo llena el humano.
#
# Revisa lo staged y, si el mismo comando trae un `git add` o el commit lleva -a,
# también lo que eso suma, incluidos los archivos ignorados que el `git add`
# nombra (`git add -f .env`). No exime ninguna carpeta, tampoco `replica/`.
#
# Cada hallazgo deja una fila en docs/seguridad/registro-de-bloqueos.md con la
# fecha, la regla y el archivo. El valor no se muestra ni se registra nunca.
#
# Adaptado del hook de FlowSync (flowsync-ai4devs).
set -uo pipefail

HOOK="datos-que-no-salen"
TAB=$'\t'
entrada=$(cat)

# Sin jq no se puede leer el comando: ante la duda, el commit no pasa.
if ! command -v jq >/dev/null 2>&1; then
  case "$entrada" in
    *commit*)
      echo "Commit bloqueado por .claude/hooks/$HOOK.sh: falta jq, así que no se puede revisar qué entra al repo. Instalá jq y volvé a intentarlo." >&2
      exit 2 ;;
  esac
  exit 0
fi

cmd=$(printf '%s' "$entrada" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -n "$cmd" ] || exit 0

# `git <subcomando>`, también con opciones de git antes (`git -C . commit`).
re_git='(^|[[:space:];&|(])git(\.exe)?(([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+)|([[:space:]]+--[A-Za-z-]+(=[^[:space:]]+)?))*[[:space:]]+'
[[ "$cmd" =~ ${re_git}commit([[:space:]]|$) ]] || exit 0

root="${CLAUDE_PROJECT_DIR:-}"
[ -n "$root" ] || root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

registro="docs/seguridad/registro-de-bloqueos.md"

# --- Qué suma el comando además de lo staged ------------------------------------

con_add=0
con_todo=0
explicitos=()
while IFS= read -r seg; do
  if [[ "$seg" =~ ${re_git}add([[:space:]]|$) ]]; then
    con_add=1
    m=${BASH_REMATCH[0]}
    read -r -a toks <<< "${seg#*"$m"}"
    for t in ${toks[@]+"${toks[@]}"}; do
      t=${t//\"/}; t=${t//\'/}; t=${t//\\//}; t=${t#./}
      case "$t" in ''|-*) continue ;; esac
      [ -f "$t" ] && explicitos+=("$t")
    done
  fi
  if [[ "$seg" =~ ${re_git}commit([[:space:]]|$) ]]; then
    m=${BASH_REMATCH[0]}
    resto=" ${seg#*"$m"} "
    [[ "$resto" =~ [[:space:]](-a|--all|-[A-Za-z]*a[A-Za-z]*)[[:space:]] ]] && con_todo=1
  fi
done < <(printf '%s\n' "$cmd" | sed -E 's/(&&|\|\||;|\|)/\n/g')

# Líneas agregadas de un diff, como "archivo<TAB>línea<TAB>texto".
lineas_anadidas() {
  awk '
    /^diff --git / { cab = 1; next }
    cab && /^\+\+\+ / { f = substr($0, 7); next }
    /^@@/ { cab = 0; split($3, a, ","); n = substr(a[1], 2) + 0; next }
    !cab && /^\+/ { t = substr($0, 2); sub(/\r$/, "", t); print f "\t" n "\t" t; n++ }
  '
}

git_diff() { git -c core.quotePath=false diff --no-color --no-ext-diff "$@"; }

contenido=$(git_diff --cached -U0 | lineas_anadidas)
nombres=$(git_diff --cached --name-only --diff-filter=ACMR)

if [ "$con_add" -eq 1 ] || [ "$con_todo" -eq 1 ]; then
  contenido+=$'\n'$(git_diff -U0 | lineas_anadidas)
  nombres+=$'\n'$(git_diff --name-only --diff-filter=ACMR)
fi

# Un archivo que entra entero: el nombre siempre, el texto si no es binario.
archivo_entero() {
  [ -f "$1" ] || return 0
  nombres+=$'\n'"$1"
  grep -Iq . "$1" 2>/dev/null || return 0
  contenido+=$'\n'$(awk -v f="$1" '{ sub(/\r$/, ""); print f "\t" NR "\t" $0 }' "$1")
}

if [ "$con_add" -eq 1 ]; then
  while IFS= read -r -d '' f; do
    archivo_entero "$f"
  done < <(git -c core.quotePath=false ls-files --others --exclude-standard -z)
  # Los que el `git add` nombra y git no sigue todavía, aunque estén ignorados.
  for f in ${explicitos[@]+"${explicitos[@]}"}; do
    git ls-files --error-unmatch -- "$f" >/dev/null 2>&1 || archivo_entero "$f"
  done
fi

# --- Reglas -----------------------------------------------------------------------

hallazgos=""
hallar() { hallazgos+="$1$TAB$2$TAB$3"$'\n'; }

# Las líneas de contenido cuyo texto cumple una expresión, como "archivo<TAB>línea".
lineas_con() {
  printf '%s\n' "$contenido" | grep -E -e "^[^$TAB]*$TAB[0-9]+($TAB.*)?($1)" | cut -f1,2
}

# Regla 1: archivos que no se versionan.
archivo_prohibido() {
  local b=${1##*/}
  case "$1" in .claude/hooks/*.local) return 0 ;; esac
  case "$b" in
    *.example) return 1 ;;
    .env|.env.*|*.env|*.jks|*.keystore|google-services.json) return 0 ;;
  esac
  return 1
}
while IFS= read -r f; do
  [ -n "$f" ] && archivo_prohibido "$f" && hallar 1 "$f" "-"
done < <(printf '%s\n' "$nombres" | sort -u)

while IFS="$TAB" read -r f n; do
  case "$f" in *.json) hallar 1 "$f" "$n" ;; esac
done < <(lineas_con '"type"[[:space:]]*:[[:space:]]*"service_account"|"private_key"[[:space:]]*:')

# Regla 2: claves con forma reconocible.
re_mp_token='(APP_USR|TEST)-[0-9]{10,}-[0-9]{6}-[0-9a-fA-F]{32}-[0-9]+'
re_mp_publica='(APP_USR|TEST)-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
re_clave="AKIA[0-9A-Z]{16}|sk-ant-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{35}|xox[bpa]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|$re_mp_token|$re_mp_publica"
while IFS="$TAB" read -r f n; do
  [ -n "$f" ] && hallar 2 "$f" "$n"
done < <(lineas_con "$re_clave")

# Regla 3: variables secretas con un valor asignado. No bloquean `NOMBRE=`,
# `NOMBRE=""`, `${NOMBRE:-…}`, ni un valor tomado del entorno (`$…`, `${{ secrets.… }}`).
comilla="[\"']"
valor="[^[:space:]\"'\$]"
# El tab es el que separa el número de línea del texto: el nombre al principio de la línea.
re_var="(${TAB}|[^A-Za-z0-9_{])(JWT_SECRET|FIREBASE_PRIVATE_KEY|REDIS_PASSWORD)${comilla}?[[:space:]]*[:=][[:space:]]*${comilla}?${valor}"
while IFS="$TAB" read -r f n; do
  [ -n "$f" ] && hallar 3 "$f" "$n"
done < <(lineas_con "$re_var")

# Regla 4: correos cuyo dominio no es de ejemplo.
re_correo='[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}'
re_permitido='^(.+\.)?(example\.(com|org|net)|github\.com)$'
while IFS="$TAB" read -r f n linea; do
  while IFS= read -r correo; do
    dominio=$(printf '%s' "${correo#*@}" | tr '[:upper:]' '[:lower:]')
    [[ "$dominio" =~ $re_permitido ]] || hallar 4 "$f" "$n"
  done < <(printf '%s\n' "$linea" | grep -oE "$re_correo")
done < <(printf '%s\n' "$contenido" | grep -E "^[^$TAB]*$TAB[0-9]+$TAB.*$re_correo")

# Regla 5: contraseñas de las cuentas de prueba, literales. Una línea vacía del
# archivo no cuenta: si contara, bloquearía todo.
valores=".claude/hooks/valores-prohibidos.local"
if [ -f "$valores" ]; then
  while IFS="$TAB" read -r f n; do
    [ -n "$f" ] && hallar 5 "$f" "$n"
  done < <(printf '%s\n' "$contenido" | awk -F'\t' '
    NR == FNR { sub(/\r$/, ""); if ($0 != "") v[++k] = $0; next }
    {
      t = $0; sub(/^[^\t]*\t[^\t]*\t/, "", t)
      for (i = 1; i <= k; i++) if (index(t, v[i])) { print $1 "\t" $2; break }
    }
  ' "$valores" -)
fi

[ -n "$hallazgos" ] || exit 0

# --- Bloqueo: mensaje y registro, sin el valor ------------------------------------

# Uno por regla y archivo, con la primera línea donde aparece.
hallazgos=$(printf '%s' "$hallazgos" | sort -t"$TAB" -k1,1 -k2,2 -k3,3n | awk -F'\t' '!v[$1 FS $2]++')

nombre_regla() {
  case "$1" in
    1) echo "archivo que no se versiona" ;;
    2) echo "clave con forma reconocible" ;;
    3) echo "variable secreta con valor" ;;
    4) echo "correo fuera de los dominios de ejemplo" ;;
    5) echo "contraseña de una cuenta de prueba" ;;
  esac
}
que_hacer() {
  case "$1" in
    1) echo "sacalo del commit (git restore --staged <archivo>) y no lo agregues: un secreto va como variable de entorno, y un ejemplo se llama <perfil>.env.example y no trae valores" ;;
    2) echo "reemplazá la clave por un marcador o por una variable de entorno; si es de mentira, que no tenga la forma de una real" ;;
    3) echo "dejá la variable sin valor (NOMBRE=) o tomala del entorno (\$NOMBRE, secrets.NOMBRE)" ;;
    4) echo "usá un correo de example.com, example.org o example.net (PR-3)" ;;
    5) echo "reemplazá la contraseña por un marcador: las contraseñas de las cuentas de prueba no entran al repo" ;;
  esac
}

{
  echo "Commit bloqueado por .claude/hooks/$HOOK.sh:"
  while IFS="$TAB" read -r r f n; do
    donde="archivo: $f"
    [ "$n" != "-" ] && donde+=", línea $n"
    echo "  - regla $r ($(nombre_regla "$r")) · $donde → $(que_hacer "$r")."
  done <<< "$hallazgos"
  echo "No desactives ni saltees este hook, ni reescribas el comando para esquivarlo: cambiá el dato y volvé a intentarlo."
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
while IFS="$TAB" read -r r f n; do
  echo "| $fecha | $HOOK | regla $r · $(nombre_regla "$r") | \`${f//|/\\|}\` |" >> "$registro"
done <<< "$hallazgos"

exit 2
