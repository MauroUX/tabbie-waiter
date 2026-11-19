#!/usr/bin/env bash
# Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
# "Contrato POST /payments/in-person-request y el evento T17".
# Scenario: "La réplica no arranca con un REDIS_EXPIRATION_TIME inválido" (DP-80).
# Corre en la máquina, desde cualquier carpeta (se mueve a la raíz del repo), y como paso de la CI: necesita arrancar
# la réplica con otro entorno, y el contenedor de pruebas no puede.
#
# Arranca la réplica en un contenedor de un solo uso, sin dependencias, con REDIS_EXPIRATION_TIME=abc, y pasa solo si:
#   - el proceso termina con un código distinto de 0;
#   - su salida nombra REDIS_EXPIRATION_TIME (control positivo: un fallo por otra causa no cuenta);
#   - ninguna línea que nombra la variable muestra el valor `abc`.
# Si la réplica arrancara igual, el tiempo de espera la corta y el caso falla por no nombrar la variable.
#
# No lee el archivo de perfil: solo se lo pasa a docker compose. Nunca usa `docker compose config`, `docker inspect`,
# `env` ni `printenv`, y nunca imprime la salida de la réplica ni valores de variables.
#
# Uso: bash replica/tests/arranque/redis-expiration-invalida.sh replica/entornos/pruebas.env
set -uo pipefail

USO="Uso: bash replica/tests/arranque/redis-expiration-invalida.sh replica/entornos/pruebas.env"
NOMBRE="La réplica no arranca con un REDIS_EXPIRATION_TIME inválido"
VALOR_INVALIDO="abc"
ESPERA_MAXIMA_S=180

ENV="${1:-}"
if [ -z "$ENV" ] || [ ! -f "$ENV" ]; then
  echo "$USO" >&2
  echo "Falta el archivo de perfil o no existe." >&2
  exit 2
fi

# Ruta absoluta del perfil antes de moverse a la raíz del repo.
ENV="$(cd "$(dirname "$ENV")" && pwd)/$(basename "$ENV")"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$RAIZ" || exit 2

TMP=$(mktemp -d)
CONTENEDOR="replica-redis-expiration-invalida-$$"
limpiar() {
  docker rm -f "$CONTENEDOR" >/dev/null 2>&1
  rm -rf "$TMP"
}
trap limpiar EXIT

# --- La réplica con REDIS_EXPIRATION_TIME=abc -------------------------------------------------

timeout -k 10 "$ESPERA_MAXIMA_S" docker compose --env-file "$ENV" run --rm --no-deps -T --name "$CONTENEDOR" \
  -e REDIS_EXPIRATION_TIME="$VALOR_INVALIDO" replica >"$TMP/salida.log" 2>&1 </dev/null
rc=$?

tr -d '\r' <"$TMP/salida.log" >"$TMP/salida.txt"
grep -F "REDIS_EXPIRATION_TIME" "$TMP/salida.txt" >"$TMP/lineas-de-la-variable.txt"

problema=""
[ "$rc" -ne 0 ] || problema+="; el proceso terminó con 0, se esperaba un código distinto de 0"
[ "$rc" -ne 124 ] || problema+="; la réplica no terminó en ${ESPERA_MAXIMA_S} s: arrancó con el valor inválido"
[ -s "$TMP/lineas-de-la-variable.txt" ] || problema+="; la salida no nombra REDIS_EXPIRATION_TIME"
if grep -qF "$VALOR_INVALIDO" "$TMP/lineas-de-la-variable.txt"; then
  problema+="; la línea del error muestra el valor de la variable"
fi

if [ -z "$problema" ]; then
  printf 'OK     %s\n' "$NOMBRE"
  exit 0
fi
printf 'FALLA  %s → %s (código de salida %s)\n' "$NOMBRE" "${problema#; }" "$rc"
exit 1
