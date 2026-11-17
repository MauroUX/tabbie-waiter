#!/usr/bin/env bash
# Tests de .claude/hooks/ktlint-formato.sh.
#
# Arma un proyecto temporal y le pasa al hook el JSON que manda Claude Code
# después de un Write o un Edit. Primero sin android/gradlew (antes de TK-04):
# el hook no hace nada. Después con un gradlew de mentira que anota con qué
# argumentos lo llamaron y, si se le pide, falla.
# Un caso pasa si el código de salida, la llamada a gradlew y la salida de
# error son las esperadas.
#
# Uso: bash .claude/hooks/tests/ktlint-formato.test.sh
set -uo pipefail

HOOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/ktlint-formato.sh"
BASE=$(mktemp -d)
trap 'rm -rf "$BASE"' EXIT
total=0
fallos=0
rc=0

P="$BASE/proyecto"
KT="$P/android/app/src/main/java/ejemplo/Mesa.kt"
mkdir -p "$(dirname "$KT")" "$P/replica"
echo 'class Mesa' > "$KT"
echo 'plugins {}' > "$P/android/build.gradle.kts"
echo '# notas' > "$P/android/NOTAS.md"
echo 'class Ajena' > "$P/replica/Ajena.kt"

# gradlew de mentira: anota sus argumentos y sale con $GRADLEW_SALE.
gradlew_falso() {
  cat > "$P/android/gradlew" <<'EOF'
#!/bin/sh
printf '%s\n' "$*" > "$(dirname "$0")/llamada.txt"
if [ "${GRADLEW_SALE:-0}" != 0 ]; then
  echo "Mesa.kt:1:1 Standard:no-wildcard-imports (no se puede arreglar solo)" >&2
fi
exit "${GRADLEW_SALE:-0}"
EOF
}

correr() {
  rm -f "$P/android/llamada.txt"
  jq -n --arg t "$1" --arg f "$2" '{tool_name: $t, tool_input: {file_path: $f}}' \
    | (cd "$P" && CLAUDE_PROJECT_DIR="$P" GRADLEW_SALE="${3:-0}" bash "$HOOK") >"$BASE/out" 2>"$BASE/err"
  rc=$?
}

informar() {
  local id=$1 descripcion=$2 problema=$3
  total=$((total + 1))
  if [ -z "$problema" ]; then
    printf 'OK     %-3s %s\n' "$id" "$descripcion"
  else
    fallos=$((fallos + 1))
    printf 'FALLA  %-3s %s → %s\n' "$id" "$descripcion" "${problema#; }"
    sed 's/^/         stderr: /' "$BASE/err"
  fi
}

# no_llama <id> <descripción> <herramienta> <archivo>
no_llama() {
  correr "$3" "$4"
  local p=""
  [ "$rc" -eq 0 ] || p+="; salió con $rc"
  [ ! -f "$P/android/llamada.txt" ] || p+="; llamó a gradlew"
  [ ! -s "$BASE/err" ] || p+="; escribió en stderr"
  informar "$1" "$2" "$p"
}

# Antes de TK-04: sin android/gradlew.
no_llama A1 "sin gradlew, un .kt de android/ no hace nada" Write "$KT"
no_llama A2 "sin gradlew, un .kts de android/ no hace nada" Edit "$P/android/build.gradle.kts"
correr Write ""
informar A3 "sin gradlew, una entrada sin archivo no hace nada" "$([ "$rc" -eq 0 ] || echo "salió con $rc")"

# Con TK-04: un gradlew de mentira.
gradlew_falso
no_llama B1 "un .md de android/ no llama a gradlew" Write "$P/android/NOTAS.md"
no_llama B2 "un .kt fuera de android/ no llama a gradlew" Edit "$P/replica/Ajena.kt"
no_llama B3 "un .kt que no existe no llama a gradlew" Write "$P/android/app/NoExiste.kt"

correr Edit "$KT"
p=""
[ "$rc" -eq 0 ] || p+="; salió con $rc"
llamada=$(cat "$P/android/llamada.txt" 2>/dev/null)
case "$llamada" in *spotlessApply*) ;; *) p+="; no llamó a spotlessApply" ;; esac
case "$llamada" in *-PspotlessIdeHook=*Mesa.kt*) ;; *) p+="; no pasó el archivo en -PspotlessIdeHook ($llamada)" ;; esac
informar B4 "un .kt de android/ formatea solo ese archivo" "$p"

correr Write "$KT" 1
p=""
[ "$rc" -eq 2 ] || p+="; salió con $rc, no con 2"
grep -q "no pudo dejar limpio" "$BASE/err" || p+="; no dice qué archivo quedó sucio"
grep -q "no-wildcard-imports" "$BASE/err" || p+="; no devuelve el error de ktlint"
informar B5 "si ktlint deja errores, sale con 2 y los devuelve" "$p"

if command -v cygpath >/dev/null 2>&1; then
  correr Edit "$(cygpath -w "$KT")"
  p=""
  [ "$rc" -eq 0 ] || p+="; salió con $rc"
  [ -f "$P/android/llamada.txt" ] || p+="; no llamó a gradlew"
  informar B6 "una ruta de Windows (C:\\…) dentro de android/ también se formatea" "$p"
fi

echo
echo "$((total - fallos)) de $total casos pasan."
[ "$fallos" -eq 0 ]
