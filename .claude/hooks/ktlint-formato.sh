#!/usr/bin/env bash
# PostToolUse (Write y Edit) · ktlint-formato
#
# Formatea con ktlint el .kt o .kts de android/ que se acaba de escribir, y
# solo ese. Nunca todo el proyecto: así no reformatea los tests congelados de
# la skill app-feature cuando se edita otro archivo, y su huella no cambia.
#
# Usa la entrada para un solo archivo de Spotless (-PspotlessIdeHook), con
# ktlint como paso de formato. Spotless lo configura TK-04.
#
# No hace nada (sale con 0, en silencio) si:
#   - todavía no existe android/gradlew (antes de TK-04);
#   - el archivo no es un .kt ni un .kts, o no está dentro de android/.
# Si ktlint deja errores que no arregla solo, sale con 2 y los devuelve: el
# archivo ya está escrito, y quien lo escribió lo corrige.
set -uo pipefail

HOOK="ktlint-formato"
entrada=$(cat)

root="${CLAUDE_PROJECT_DIR:-}"
[ -n "$root" ] || root=$(git rev-parse --show-toplevel 2>/dev/null) || root=$PWD

# Antes de TK-04 no hay proyecto Android: no se hace nada.
[ -f "$root/android/gradlew" ] || exit 0

if ! command -v jq >/dev/null 2>&1; then
  echo "ktlint no corrió (.claude/hooks/$HOOK.sh): falta jq, así que no se puede saber qué archivo se escribió. Instalá jq." >&2
  exit 2
fi

archivo=$(printf '%s' "$entrada" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
case "$archivo" in
  *.kt|*.kts) ;;
  *) exit 0 ;;
esac
[ -f "$archivo" ] || exit 0

# Rutas comparables en Windows (C:\…, /c/…) y en Linux.
normalizar() {
  local p=$1
  if command -v cygpath >/dev/null 2>&1; then p=$(cygpath -m -- "$p"); fi
  p=${p//\\//}
  printf '%s' "${p,,}"
}
case "$(normalizar "$archivo")" in
  "$(normalizar "$root/android")"/*) ;;
  *) exit 0 ;;
esac

# Gradle espera la ruta absoluta del sistema.
ruta=$archivo
if command -v cygpath >/dev/null 2>&1; then ruta=$(cygpath -w -- "$archivo"); fi

if ! salida=$(cd "$root/android" && sh ./gradlew --quiet spotlessApply -PspotlessIdeHook="$ruta" 2>&1); then
  {
    echo "ktlint (.claude/hooks/$HOOK.sh) no pudo dejar limpio $archivo."
    echo "El archivo ya está escrito: corregí lo que sigue y volvé a guardarlo."
    printf '%s\n' "$salida" | tail -n 30
  } >&2
  exit 2
fi
exit 0
