#!/usr/bin/env bash
# Busca los VALORES de los secretos de un archivo de variables en todo el historial y en los archivos versionados
# (SEG-c10, design D2 del change tk-01-replica-base). gitleaks busca formas conocidas; esto busca los valores propios.
#
# Uso:   replica/scripts/buscar-valores-de-secretos.sh replica/entornos/local.env
# Lo corre el humano con su archivo local: el agente no lee esos archivos.
#
# Para JWT_SECRET, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, DB_PASSWORD y REDIS_PASSWORD con valor:
#   - `git log --all -S` busca el valor en el historial de todas las ramas (locales y remotas);
#   - `git grep -F` lo busca en los archivos versionados.
# De FIREBASE_PRIVATE_KEY busca además un fragmento central de 40 caracteres de cada una de sus líneas (así lo encuentra
# aunque se haya pegado con otro formato de saltos de línea).
# Imprime solo `NOMBRE: no aparece` o `NOMBRE: APARECE`, nunca el valor. Termina con código 1 si alguno aparece,
# con 2 si el uso es incorrecto.
#
# Antes conviene traer todas las ramas: git fetch --all --prune
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Uso: $0 <archivo de variables>" >&2
  exit 2
fi
if [ ! -f "$1" ]; then
  echo "No existe el archivo: $1" >&2
  exit 2
fi
archivo="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
raiz="$(git rev-parse --show-toplevel)"
cd "$raiz"

NOMBRES=(JWT_SECRET FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY DB_PASSWORD REDIS_PASSWORD)
FRAGMENTO=40

# El valor de una variable del archivo, sin comillas ni fin de línea de Windows. Vacío si no está o no tiene valor.
valor_de() {
  local nombre="$1" linea valor=""
  while IFS= read -r linea || [ -n "$linea" ]; do
    linea="${linea%$'\r'}"
    case "$linea" in
      "$nombre="*) valor="${linea#*=}" ;;
    esac
  done < "$archivo"
  if [ "${#valor}" -ge 2 ]; then
    case "$valor" in
      \"*\") valor="${valor:1:${#valor}-2}" ;;
      \'*\') valor="${valor:1:${#valor}-2}" ;;
    esac
  fi
  printf '%s' "$valor"
}

# Un fragmento central de 40 caracteres de cada línea del valor de al menos 40 caracteres
# (los "\n" escritos como dos caracteres cuentan como salto de línea). Imprime uno por línea.
fragmentos_centrales() {
  local valor="$1" linea
  while IFS= read -r linea; do
    if [ "${#linea}" -ge "$FRAGMENTO" ]; then
      printf '%s\n' "${linea:$(( (${#linea} - FRAGMENTO) / 2 )):$FRAGMENTO}"
    fi
  done <<< "${valor//\\n/$'\n'}"
}

# 0 si el texto aparece en el historial de todas las ramas o en los archivos versionados.
aparece() {
  local texto="$1" salida
  salida="$(git log --all --format=%H -S"$texto" | head -n 1 || true)"
  if [ -n "$salida" ]; then
    return 0
  fi
  if git grep -qF -e "$texto" 2>/dev/null; then
    return 0
  fi
  return 1
}

encontrado=0
for nombre in "${NOMBRES[@]}"; do
  valor="$(valor_de "$nombre")"
  if [ -z "$valor" ]; then
    echo "$nombre: sin valor en el archivo (no se busca)"
    continue
  fi
  aparecio=0
  if aparece "$valor"; then
    aparecio=1
  elif [ "$nombre" = "FIREBASE_PRIVATE_KEY" ]; then
    while IFS= read -r parte; do
      if [ -n "$parte" ] && aparece "$parte"; then
        aparecio=1
        break
      fi
    done < <(fragmentos_centrales "$valor")
  fi
  if [ "$aparecio" -eq 1 ]; then
    echo "$nombre: APARECE"
    encontrado=1
  else
    echo "$nombre: no aparece"
  fi
done

if [ "$encontrado" -ne 0 ]; then
  echo "Alguno de los valores aparece en el repositorio: hay que rotarlo y limpiar el historial." >&2
  exit 1
fi
