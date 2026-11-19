#!/usr/bin/env bash
# Change tk-02-datos-iniciales · spec datos-iniciales · pruebas de la carga que recrean la base.
# Corre en la máquina, desde cualquier carpeta (se mueve a la raíz del repo), y como paso de la CI:
# el contenedor de pruebas no puede recrear la base.
#
# Scenarios, un bloque cada uno, en este orden:
#   - DP-16 · un up sobre la base cargada no cambia nada
#     ("Volver a levantar el stack sobre una base ya cargada no duplica nada")
#   - SEG-c11 · la lista del script es la de user
#     (la parte de "SEG-c11 · Datos iniciales sintéticos y cuentas de prueba reconocibles" con el modo `lista`)
#   - DoD Datos · recrear y volver a cargar da la misma foto
#     ("Recrear la base y volver a cargar da el mismo resultado")
#   - DoD Datos · falla en alto sin migraciones
#   - DoD Datos · falla en alto con un restaurante ajeno
#     (los dos: "La carga falla en alto sobre una base que no es la esperada")
#
# La foto de la base son los conteos de las 13 tablas y un mysqldump, sin el esquema y ordenado por PK,
# de las 6 tablas que carga el SQL. Control positivo: la primera foto tiene 2 restaurantes y 5 usuarios,
# así dos fotos vacías no salen iguales.
#
# Nunca usa `docker compose config`, `docker inspect`, `env` ni `printenv`, y nunca imprime valores de variables:
# la contraseña de MySQL se lee solo dentro del contenedor, de sus propias variables.
#
# Uso: bash replica/tests/datos/carga-desde-cero.sh replica/entornos/pruebas.env
set -uo pipefail

USO="Uso: bash replica/tests/datos/carga-desde-cero.sh replica/entornos/pruebas.env"

# --- Solo con el perfil de pruebas: el script borra la base -----------------------------------

ENV="${1:-}"
case "$ENV" in
  *pruebas.env) ;;
  *)
    echo "$USO" >&2
    echo "Solo corre con el perfil de pruebas (un archivo que termina en pruebas.env): hace down -v y borra la base." >&2
    exit 2
    ;;
esac
if [ ! -f "$ENV" ]; then
  echo "No existe el archivo de perfil indicado." >&2
  echo "$USO" >&2
  exit 2
fi

# Ruta absoluta del perfil antes de moverse a la raíz del repo.
ENV="$(cd "$(dirname "$ENV")" && pwd)/$(basename "$ENV")"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$RAIZ" || exit 2

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
total=0
fallos=0

TABLAS=(
  restaurant user table table_session table_session_users_user order order_product_details
  order_product_option order_product_option_values_product_option_value product product_option
  product_option_value payment
)
TABLAS_DEL_SQL="restaurant user table product product_option product_option_value"
RESTAURANTE_AJENO="99999999-9999-4999-8999-999999999999"

echo "Atención: este script hace 'docker compose down -v' con el perfil de pruebas."
echo "Borra la base de la réplica, la vuelve a cargar varias veces y termina con el stack recién cargado."
echo

# --- Utilidades -------------------------------------------------------------------------------

dc() { docker compose --env-file "$ENV" "$@"; }

# Una consulta en MySQL, sin encabezados; la contraseña solo dentro del contenedor.
sql() {
  dc exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE" -N -e "$1"' sh "$1" \
    | tr -d '\r'
}

contar() { sql "SELECT COUNT(*) FROM \`$1\`" | tr -d '[:space:]'; }

# foto <prefijo>: deja <prefijo>.conteos y <prefijo>.volcado. Sale con distinto de 0 si no pudo sacarla.
foto() {
  local prefijo=$1 consulta="" tabla
  for tabla in "${TABLAS[@]}"; do
    consulta+="SELECT '$tabla', COUNT(*) FROM \`$tabla\` UNION ALL "
  done
  consulta="${consulta% UNION ALL }"
  sql "$consulta" >"$prefijo.conteos" 2>"$prefijo.conteos.err" || return 1
  # shellcheck disable=SC2016
  dc exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --no-tablespaces --no-create-info \
      --order-by-primary --skip-dump-date --skip-comments --skip-extended-insert \
      -u"$MYSQL_USER" "$MYSQL_DATABASE" '"$TABLAS_DEL_SQL" \
    >"$prefijo.volcado" 2>"$prefijo.volcado.err" || return 1
}

# conteo <prefijo> <tabla>: el conteo de una tabla en una foto.
conteo() { awk -F'\t' -v t="$2" '$1 == t { print $2 }' "$1.conteos" | tr -d '[:space:]'; }

# control_positivo <prefijo>: vacío si la foto tiene 2 restaurantes y 5 usuarios; si no, el problema.
control_positivo() {
  local r u
  r=$(conteo "$1" restaurant)
  u=$(conteo "$1" user)
  if [ "$r" != "2" ] || [ "$u" != "5" ]; then
    printf '; la foto %s tiene restaurant=%s y user=%s, se esperaban 2 y 5' "$(basename "$1")" "${r:-?}" "${u:-?}"
  fi
}

# misma_foto <a> <b>: vacío si son iguales; si no, el problema (con las primeras diferencias).
misma_foto() {
  local problema=""
  if ! diff -q "$1.conteos" "$2.conteos" >/dev/null; then
    problema+="; los conteos de $(basename "$2") difieren de los de $(basename "$1")"
    diff "$1.conteos" "$2.conteos" | head -20 | sed 's/^/         conteos: /' >&2
  fi
  if ! diff -q "$1.volcado" "$2.volcado" >/dev/null; then
    problema+="; el volcado de $(basename "$2") difiere del de $(basename "$1")"
    diff "$1.volcado" "$2.volcado" | head -20 | sed 's/^/         volcado: /' >&2
  fi
  printf '%s' "$problema"
}

informar() {
  local nombre=$1 problema=$2
  total=$((total + 1))
  if [ -z "$problema" ]; then
    printf 'OK     %s\n' "$nombre"
  else
    fallos=$((fallos + 1))
    printf 'FALLA  %s → %s\n' "$nombre" "${problema#; }"
  fi
}

# --- 1. Base recién creada y cargada: foto A --------------------------------------------------

echo "Recreando la base (down -v) y levantando el stack con la carga (up --build)…"
problema_a=""
dc down -v >"$TMP/down-1.log" 2>&1 || problema_a+="; down -v salió con $?"
dc up -d --build --wait >"$TMP/up-1.log" 2>&1
rc=$?
[ "$rc" -eq 0 ] || problema_a+="; up --build --wait salió con $rc"
if foto "$TMP/A"; then
  problema_a+=$(control_positivo "$TMP/A")
else
  problema_a+="; no se pudo sacar la foto A"
fi
echo

# --- 2. DP-16 · un up sobre la base cargada no cambia nada ------------------------------------

problema=""
dc up -d --wait >"$TMP/up-2.log" 2>&1
rc=$?
[ "$rc" -eq 0 ] || problema+="; up --wait sobre la base cargada salió con $rc, se esperaba 0"
dc logs --no-color carga >"$TMP/logs-carga.log" 2>&1
grep -qF "ya estaban" "$TMP/logs-carga.log" || problema+="; la salida del servicio carga no dice 'ya estaban'"
if [ -n "$problema_a" ]; then
  problema+="; sin foto A válida para comparar"
elif foto "$TMP/A2"; then
  problema+=$(misma_foto "$TMP/A" "$TMP/A2")
else
  problema+="; no se pudo sacar la foto después del up"
fi
informar "DP-16 · un up sobre la base cargada no cambia nada" "$problema"

# --- 3. SEG-c11 · la lista del script es la de user -------------------------------------------

problema=""
# Sin progreso: con Compose v2.39 el progreso del build sale por stdout y se mezcla con los emails.
dc --progress quiet --profile firebase run --rm --build cuentas lista >"$TMP/lista.out" 2>"$TMP/lista.err"
rc=$?
[ "$rc" -eq 0 ] || problema+="; cuentas lista salió con $rc, se esperaba 0"
tr -d '\r' <"$TMP/lista.out" | sed '/^[[:space:]]*$/d' | LC_ALL=C sort >"$TMP/lista.ordenada"
if sql "SELECT email FROM \`user\` WHERE isGuest = 0" 2>"$TMP/user.err" \
  | sed '/^[[:space:]]*$/d' | LC_ALL=C sort >"$TMP/user.ordenada"; then
  :
else
  problema+="; no se pudo leer la tabla user"
fi
[ -s "$TMP/lista.ordenada" ] || problema+="; la lista del script está vacía"
if ! diff -q "$TMP/lista.ordenada" "$TMP/user.ordenada" >/dev/null; then
  problema+="; la lista del script no es la de user (isGuest = 0)"
  diff "$TMP/lista.ordenada" "$TMP/user.ordenada" | head -20 | sed 's/^/         lista vs user: /' >&2
fi
ajenos=$(grep -vc '@example\.com$' "$TMP/lista.ordenada")
[ "$ajenos" -eq 0 ] || problema+="; $ajenos líneas de la lista no terminan en @example.com"
informar "SEG-c11 · la lista del script es la de user" "$problema"

# --- 4. DoD Datos · recrear y volver a cargar da la misma foto --------------------------------

problema="$problema_a"
dc down -v >"$TMP/down-4.log" 2>&1 || problema+="; down -v salió con $?"
dc up -d --wait >"$TMP/up-4.log" 2>&1
rc=$?
[ "$rc" -eq 0 ] || problema+="; up --wait después de down -v salió con $rc"
if foto "$TMP/B"; then
  problema+=$(control_positivo "$TMP/B")
  [ -f "$TMP/A.conteos" ] && problema+=$(misma_foto "$TMP/A" "$TMP/B")
else
  problema+="; no se pudo sacar la foto B"
fi
informar "DoD Datos · recrear y volver a cargar da la misma foto" "$problema"

# --- 5. DoD Datos · falla en alto sin migraciones ---------------------------------------------

problema=""
dc down -v >"$TMP/down-5.log" 2>&1 || problema+="; down -v salió con $?"
dc up -d --wait mysql >"$TMP/up-5.log" 2>&1
rc=$?
[ "$rc" -eq 0 ] || problema+="; up --wait mysql salió con $rc"
dc run --rm --no-deps carga >"$TMP/carga-5.log" 2>&1
rc=$?
[ "$rc" -ne 0 ] || problema+="; la carga salió con 0 sobre una base sin migraciones"
grep -qi "migraciones" "$TMP/carga-5.log" || problema+="; la salida de la carga no nombra las migraciones"
# Sin insertar nada: la base sigue sin ninguna tabla.
tablas=$(sql "SELECT COUNT(*) FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE()" | tr -d '[:space:]')
[ "$tablas" = "0" ] || problema+="; la base quedó con ${tablas:-?} tablas, se esperaban 0"
informar "DoD Datos · falla en alto sin migraciones" "$problema"

# --- 6. DoD Datos · falla en alto con un restaurante ajeno ------------------------------------

problema=""
dc up -d --wait replica >"$TMP/up-6.log" 2>&1
rc=$?
[ "$rc" -eq 0 ] || problema+="; up --wait replica salió con $rc"
sql "INSERT INTO \`restaurant\` (id, name) VALUES ('$RESTAURANTE_AJENO', 'Restaurante ajeno de prueba')" \
  >"$TMP/ajeno.log" 2>&1 || problema+="; no se pudo insertar el restaurante ajeno"
dc run --rm carga >"$TMP/carga-6.log" 2>&1
rc=$?
[ "$rc" -ne 0 ] || problema+="; la carga salió con 0 con un restaurante ajeno"
grep -qi "restaurante" "$TMP/carga-6.log" || problema+="; la salida de la carga no nombra el restaurante"
r=$(contar restaurant)
[ "$r" = "1" ] || problema+="; restaurant tiene ${r:-?} filas, se esperaba 1 (el ajeno)"
# Sin insertar ninguna fila: ninguna de las otras tablas que carga el SQL tiene filas.
for tabla in user table product product_option product_option_value; do
  n=$(contar "$tabla")
  [ "$n" = "0" ] || problema+="; $tabla tiene ${n:-?} filas, se esperaban 0"
done
informar "DoD Datos · falla en alto con un restaurante ajeno" "$problema"

# --- 7. Deja el stack recién cargado para la suite --------------------------------------------

echo
echo "Dejando el stack recién creado y cargado para la suite…"
problema=""
dc down -v >"$TMP/down-7.log" 2>&1 || problema+="; down -v salió con $?"
dc up -d --wait >"$TMP/up-7.log" 2>&1
rc=$?
[ "$rc" -eq 0 ] || problema+="; up --wait salió con $rc"
informar "Preparación · stack recién cargado para la suite" "$problema"

echo
echo "Casos: $total · fallan: $fallos"
[ "$fallos" -eq 0 ] || exit 1
