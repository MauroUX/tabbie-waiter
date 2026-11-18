#!/usr/bin/env bash
# Tests de .claude/hooks/ramas-protegidas.sh.
#
# Arma un repo temporal con un remoto bare, las ramas main, feature/entrega-2-mc
# (con upstream) y mc/tk-01-replica, y le pasa al hook el JSON que manda Claude
# Code. El hook no ejecuta el push: solo decide si lo deja pasar.
# Un caso de bloqueo pasa si el hook sale con 2, nombra la regla y el destino,
# y deja su fila en el registro. Un caso limpio pasa si sale con 0 sin registrar.
#
# Uso: bash .claude/hooks/tests/ramas-protegidas.test.sh
set -uo pipefail

HOOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/ramas-protegidas.sh"
REGISTRO="docs/seguridad/registro-de-bloqueos.md"
BASE=$(mktemp -d)
trap 'rm -rf "$BASE"' EXIT
total=0
fallos=0
rc=0

R="$BASE/repo"
git init -q --bare "$BASE/remoto.git"
git init -q "$R"
git -C "$R" config user.name "Prueba"
git -C "$R" config user.email "prueba@example.com"
git -C "$R" checkout -q -b main
echo "# Repo de prueba" > "$R/README.md"
git -C "$R" add README.md
git -C "$R" commit -qm "inicial"
git -C "$R" remote add origin "$BASE/remoto.git"
git -C "$R" push -q -u origin main 2>/dev/null
git -C "$R" checkout -q -b feature/entrega-2-mc
git -C "$R" push -q -u origin feature/entrega-2-mc 2>/dev/null
git -C "$R" checkout -q -b mc/tk-02-sigue-a-main
git -C "$R" branch -q --set-upstream-to=origin/main
git -C "$R" checkout -q -b mc/tk-01-replica

en_rama() { git -C "$R" checkout -q "$1"; }

correr() {
  rm -f "$R/$REGISTRO"
  jq -n --arg t "$1" --arg c "$2" '{tool_name: $t, tool_input: {command: $c}}' \
    | (cd "$R" && CLAUDE_PROJECT_DIR="$R" bash "$HOOK") >"$BASE/out" 2>"$BASE/err"
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

# bloquea <id> <regla> <destino> <herramienta> <comando>
bloquea() {
  local id=$1 regla=$2 destino=$3 problema=""
  correr "$4" "$5"
  [ "$rc" -eq 2 ] || problema+="; salió con $rc, se esperaba 2"
  grep -qF "regla $regla (" "$BASE/err" || problema+="; stderr no nombra la regla $regla"
  grep -qF "destino: $destino" "$BASE/err" || problema+="; stderr no nombra el destino $destino"
  if [ -f "$R/$REGISTRO" ]; then
    grep -F "| regla $regla ·" "$R/$REGISTRO" | grep -qF "\`$destino\`" \
      || problema+="; el registro no tiene la fila de la regla $regla y $destino"
  else
    problema+="; no se creó el registro"
  fi
  informar "$id" "$5 [$4, en $(git -C "$R" branch --show-current)] · regla $regla · bloqueado (exit $rc)" "$problema"
  [ -z "$problema" ] && printf '           registro: %s\n' "$(grep -F "| regla $regla ·" "$R/$REGISTRO" | head -1)"
}

# pasa <id> <herramienta> <comando>
pasa() {
  local id=$1 problema=""
  correr "$2" "$3"
  [ "$rc" -eq 0 ] || problema+="; salió con $rc, se esperaba 0"
  [ -f "$R/$REGISTRO" ] && problema+="; creó el registro"
  informar "$id" "$3 [$2, en $(git -C "$R" branch --show-current)] · pasa (exit $rc)" "$problema"
}

echo "Hook: $HOOK"
echo

# --- Bloquea ---------------------------------------------------------------------

en_rama mc/tk-01-replica
bloquea B1 1 main Bash "git push origin main"
bloquea B2 1 feature/entrega-2-mc Bash "git push origin feature/entrega-2-mc"

en_rama feature/entrega-2-mc
bloquea B3 1 feature/entrega-2-mc Bash "git push"

en_rama mc/tk-01-replica
bloquea B4 1 main Bash "git -C . push origin main"
bloquea B5 2 mc/tk-01-replica Bash "git push --force origin mc/tk-01-replica"
bloquea B6 3 "(todas las ramas)" Bash "git push --mirror origin"
bloquea B7 1 main PowerShell "git push origin HEAD:main"
bloquea B8 2 mc/tk-01-replica PowerShell "git push origin +mc/tk-01-replica"
bloquea B9 2 mc/tk-01-replica Bash "git push --force-with-lease origin mc/tk-01-replica"
bloquea B10 1 feature/entrega-2-mc Bash "cd . && git push origin refs/heads/feature/entrega-2-mc"

en_rama mc/tk-02-sigue-a-main
bloquea B11 1 main Bash "git push"

# --- Pasa ------------------------------------------------------------------------

en_rama mc/tk-01-replica
pasa P1 Bash "git push -u origin mc/tk-01-replica"
pasa P2 PowerShell "git push -u origin mc/tk-01-replica"
pasa P3 Bash "git push"
pasa P4 Bash "git push origin v0.1.0"
pasa P5 Bash 'grep -rn "git push origin main" docs'
pasa P6 Bash "git status"

echo
echo "Casos: $total · fallan: $fallos"
[ "$fallos" -eq 0 ]
