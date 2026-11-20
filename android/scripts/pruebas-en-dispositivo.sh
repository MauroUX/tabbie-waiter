#!/usr/bin/env bash
# Pruebas en el dispositivo (androidTest/) sin que la contraseña de la cuenta de prueba pase por Gradle (DP-101).
#
# Gradle guarda los argumentos de instrumentación en su historial de ejecución (android/.gradle/…), así que la
# contraseña no se le pasa: Gradle solo instala la app y las pruebas, y este script corre `am instrument` con
# los argumentos `emailMozo` y `contrasenaMozo` (DP-93). La contraseña sale de CONTRASENA_MOZO1_R1 y nunca se
# muestra; en Windows, si la terminal no la ve, se toma de las variables de usuario.
#
# Uso, desde la raíz del repo o desde android/:
#   bash android/scripts/pruebas-en-dispositivo.sh <local|demo|tabbie> [clase de prueba] [-- <argumentos de Gradle>]
# Ejemplos:
#   bash android/scripts/pruebas-en-dispositivo.sh local
#   bash android/scripts/pruebas-en-dispositivo.sh local com.tabbie.waiter.WsC1DispositivoTest
#   bash android/scripts/pruebas-en-dispositivo.sh demo -- -PurlBase=http://10.0.2.2:3000/
#
# Sale con 0 solo si la corrida terminó y no falló ninguna prueba.
set -uo pipefail
export MSYS_NO_PATHCONV=1

uso() {
  echo "Uso: $0 <local|demo|tabbie> [clase de prueba] [-- <argumentos de Gradle>]" >&2
  exit 2
}

variante=${1:-}
case "$variante" in
  local|demo|tabbie) shift ;;
  *) uso ;;
esac

clase=""
if [ $# -gt 0 ] && [ "$1" != "--" ]; then
  clase=$1
  shift
fi
gradle_args=()
if [ $# -gt 0 ]; then
  [ "$1" = "--" ] || uso
  shift
  gradle_args=("$@")
fi

contrasena=${CONTRASENA_MOZO1_R1:-}
if [ -z "$contrasena" ] && command -v powershell.exe >/dev/null 2>&1; then
  contrasena=$(powershell.exe -NoProfile -Command \
    "[Environment]::GetEnvironmentVariable('CONTRASENA_MOZO1_R1','User')" | tr -d '\r\n')
fi
if [ -z "$contrasena" ]; then
  echo "Falta CONTRASENA_MOZO1_R1: cargá la contraseña de la cuenta de prueba como variable de entorno." >&2
  exit 2
fi
email=${EMAIL_MOZO1_R1:-waiterapp.mozo1.r1@example.com}

# Entre comillas simples para el shell del dispositivo.
comillas() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

V=$(printf '%s' "${variante:0:1}" | tr '[:lower:]' '[:upper:]')${variante:1}
cd "$(dirname "$0")/.." || exit 2
./gradlew --console=plain -q "install${V}Debug" "install${V}DebugAndroidTest" "${gradle_args[@]}" || exit 1

# La instalación de Gradle puede reiniciar la conexión de adb: se espera a que el dispositivo vuelva y termine
# de arrancar antes de correr las pruebas, o am instrument falla sin llegar a ellas.
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do
  sleep 1
done

argumentos="-e emailMozo $(comillas "$email") -e contrasenaMozo $(comillas "$contrasena")"
[ -n "$clase" ] && argumentos="$argumentos -e class $(comillas "$clase")"
salida=$(adb shell "am instrument -w $argumentos com.tabbie.waiter.test/androidx.test.runner.AndroidJUnitRunner" 2>&1)
unset contrasena argumentos

# La salida de am instrument no repite los argumentos; igual se filtra el email por las dudas.
printf '%s\n' "$salida" | sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/<email>/g'

if printf '%s' "$salida" | grep -qE '^OK \([0-9]+ tests?\)'; then
  exit 0
fi
exit 1
