#!/usr/bin/env bash
# Tests de .claude/hooks/datos-que-no-salen.sh.
#
# Cada caso arma un repo temporal, deja ahí lo que el commit traería y le pasa
# al hook el JSON que manda Claude Code (tool_name y tool_input.command).
# Un caso de bloqueo pasa si el hook sale con 2, nombra la regla y el archivo,
# deja la fila en el registro y no muestra el valor ni en stderr ni en el registro.
# Un caso limpio pasa si el hook sale con 0 y no crea el registro.
#
# Los datos falsos se arman concatenando partes en tiempo de ejecución, para
# que este archivo no dispare el hook ni gitleaks.
#
# Uso: bash .claude/hooks/tests/datos-que-no-salen.test.sh
set -uo pipefail

HOOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/datos-que-no-salen.sh"
REGISTRO="docs/seguridad/registro-de-bloqueos.md"
BASE=$(mktemp -d)
trap 'rm -rf "$BASE"' EXIT
total=0
fallos=0
R=""
rc=0

# --- Datos falsos, armados por partes --------------------------------------------

SUFIJO="$RANDOM$RANDOM"
VALOR_ENV="valor-falso-$SUFIJO"
CLAVE_GOOGLE="AI""za""Sy0123456789""abcdefghijklmnopqrstuvw"
TOKEN_MP="APP""_USR-""1234567890123456""-012345-""0123456789abcdef""0123456789abcdef""-123456789"
PUBLICA_MP="TE""ST-""0a1b2c3d-4e5f-6a7b-8c9d-""0e1f2a3b4c5d"
PEM="-----BEGIN ""PRIVATE"" KEY-----"
CUERPO_PEM="MIIEvQIBADANBgkqhkiG9w0B$SUFIJO"
JWT="JWT""_SECRET"
FIREBASE="FIREBASE""_PRIVATE_KEY"
REDIS="REDIS""_PASSWORD"
CORREO_REAL="persona""@""dominio-real"".com"
CORREO_EJEMPLO="mozo""@""example"".com"
CORREO_EJEMPLO_ORG="comensal""@""example"".org"
CORREO_GITHUB="12345+mc""@""users.noreply.github"".com"
CONTRASENA="Clave""Prueba-$SUFIJO"
TIPO_CUENTA='"type": "service''_account"'
CLAVE_PRIVADA_JSON='"private''_key": '

# --- Utilidades -------------------------------------------------------------------

nuevo_repo() {
  R="$BASE/$1"
  mkdir -p "$R"
  git -C "$R" init -q
  git -C "$R" config user.name "Prueba"
  git -C "$R" config user.email "prueba@example.com"
  git -C "$R" config core.autocrlf false
  echo "# Repo de prueba" > "$R/README.md"
  git -C "$R" add README.md
  git -C "$R" commit -qm "inicial"
}

escribir() {
  mkdir -p "$(dirname "$R/$1")"
  printf '%s\n' "$2" > "$R/$1"
}

stagear() { git -C "$R" add -f -- "$@"; }

correr() {
  jq -n --arg t "$1" --arg c "$2" '{tool_name: $t, tool_input: {command: $c}}' \
    | (cd "$R" && CLAUDE_PROJECT_DIR="$R" bash "$HOOK") >"$R.out" 2>"$R.err"
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
    sed 's/^/         stderr: /' "$R.err"
  fi
}

# bloquea <id> <regla> <archivo> <valor> <herramienta> <comando>
bloquea() {
  local id=$1 regla=$2 archivo=$3 valor=$4 problema=""
  correr "$5" "$6"
  [ "$rc" -eq 2 ] || problema+="; salió con $rc, se esperaba 2"
  grep -qF "regla $regla (" "$R.err" || problema+="; stderr no nombra la regla $regla"
  grep -qF "archivo: $archivo" "$R.err" || problema+="; stderr no nombra $archivo"
  grep -qF -- "$valor" "$R.err" && problema+="; stderr muestra el valor"
  if [ -f "$R/$REGISTRO" ]; then
    grep -F "| regla $regla ·" "$R/$REGISTRO" | grep -qF "\`$archivo\`" \
      || problema+="; el registro no tiene la fila de la regla $regla y $archivo"
    grep -qF -- "$valor" "$R/$REGISTRO" && problema+="; el registro muestra el valor"
  else
    problema+="; no se creó el registro"
  fi
  local fila=""
  [ -f "$R/$REGISTRO" ] && fila=$(grep -F "| regla $regla ·" "$R/$REGISTRO" | head -1)
  informar "$id" "regla $regla · $archivo · $5 · bloqueado (exit $rc)" "$problema"
  [ -z "$problema" ] && printf '           registro: %s\n' "$fila"
}

# pasa <id> <descripción> <herramienta> <comando>
pasa() {
  local id=$1 problema=""
  correr "$3" "$4"
  [ "$rc" -eq 0 ] || problema+="; salió con $rc, se esperaba 0"
  [ -f "$R/$REGISTRO" ] && problema+="; creó el registro"
  informar "$id" "$2 · pasa (exit $rc)" "$problema"
}

COMMIT='git commit -m "prueba"'

echo "Hook: $HOOK"
echo

# --- Regla 1: archivos que no se versionan -------------------------------------------

nuevo_repo 1a
escribir .env "$JWT=$VALOR_ENV"
stagear .env
bloquea 1a 1 .env "$VALOR_ENV" Bash "$COMMIT"

nuevo_repo 1b
escribir replica/entornos/local.env "$REDIS=$VALOR_ENV"
bloquea 1b 1 replica/entornos/local.env "$VALOR_ENV" Bash "git add -A && $COMMIT"

nuevo_repo 1c
escribir .gitignore '.env*'
stagear .gitignore
git -C "$R" commit -qm "gitignore"
escribir .env "$JWT=$VALOR_ENV"
bloquea 1c 1 .env "$VALOR_ENV" PowerShell "git add -f .env; $COMMIT"

nuevo_repo 1d
printf 'contenido-de-keystore-%s\0\1\2' "$SUFIJO" > "$R/release.jks"
stagear release.jks
bloquea 1d 1 release.jks "contenido-de-keystore-$SUFIJO" Bash "$COMMIT"

nuevo_repo 1e
escribir android/app/google-services.json "{ \"project_info\": { \"project_id\": \"proyecto-$SUFIJO\" } }"
stagear android/app/google-services.json
bloquea 1e 1 android/app/google-services.json "proyecto-$SUFIJO" Bash "$COMMIT"

nuevo_repo 1f
escribir firebase/cuenta.json "{
  $TIPO_CUENTA,
  \"project_id\": \"proyecto-$SUFIJO\"
}"
stagear firebase/cuenta.json
bloquea 1f 1 firebase/cuenta.json "proyecto-$SUFIJO" Bash "$COMMIT"

nuevo_repo 1g
escribir config/credenciales.json "{ $CLAVE_PRIVADA_JSON\"clave-$SUFIJO\" }"
stagear config/credenciales.json
bloquea 1g 1 config/credenciales.json "clave-$SUFIJO" Bash "$COMMIT"

# --- Regla 2: claves con forma reconocible -------------------------------------------

nuevo_repo 2a
escribir android/app/src/main/res/values/claves.xml "<string name=\"maps\">$CLAVE_GOOGLE</string>"
stagear android/app/src/main/res/values/claves.xml
bloquea 2a 2 android/app/src/main/res/values/claves.xml "$CLAVE_GOOGLE" Bash "$COMMIT"

nuevo_repo 2b
escribir replica/datos/restaurantes.ts "mercadoPagoToken: '$TOKEN_MP',"
stagear replica/datos/restaurantes.ts
bloquea 2b 2 replica/datos/restaurantes.ts "$TOKEN_MP" Bash "$COMMIT"

nuevo_repo 2c
escribir simulator/config.ts "publicKey: '$PUBLICA_MP',"
stagear simulator/config.ts
bloquea 2c 2 simulator/config.ts "$PUBLICA_MP" PowerShell "$COMMIT"

nuevo_repo 2d
escribir replica/clave.pem "$PEM
$CUERPO_PEM"
stagear replica/clave.pem
bloquea 2d 2 replica/clave.pem "$CUERPO_PEM" Bash "$COMMIT"

# --- Regla 3: variables secretas con valor -------------------------------------------

nuevo_repo 3a
escribir replica/entornos/notas.txt "$JWT=$VALOR_ENV"
stagear replica/entornos/notas.txt
bloquea 3a 3 replica/entornos/notas.txt "$VALOR_ENV" Bash "$COMMIT"

nuevo_repo 3b
escribir compose.yaml "services:
  replica:
    environment:
      $FIREBASE: \"$VALOR_ENV\""
stagear compose.yaml
bloquea 3b 3 compose.yaml "$VALOR_ENV" Bash "$COMMIT"

nuevo_repo 3c
escribir scripts/levantar.ps1 "\$env:$REDIS = \"$VALOR_ENV\""
stagear scripts/levantar.ps1
bloquea 3c 3 scripts/levantar.ps1 "$VALOR_ENV" PowerShell "git -C . commit -m \"prueba\""

# --- Regla 4: correos fuera de los dominios de ejemplo --------------------------------

nuevo_repo 4a
escribir replica/datos/usuarios.ts "email: '$CORREO_REAL',"
stagear replica/datos/usuarios.ts
bloquea 4a 4 replica/datos/usuarios.ts "$CORREO_REAL" Bash "$COMMIT"

nuevo_repo 4b
escribir docs/contacto.md "Contacto: pendiente."
stagear docs/contacto.md
git -C "$R" commit -qm "contacto"
escribir docs/contacto.md "Contacto: $CORREO_REAL"
bloquea 4b 4 docs/contacto.md "$CORREO_REAL" Bash 'git commit -am "prueba"'

# --- Regla 5: contraseñas de las cuentas de prueba ------------------------------------

nuevo_repo 5a
escribir .claude/hooks/valores-prohibidos.local "
$CONTRASENA

"
escribir replica/firebase/cuentas.ts "password: '$CONTRASENA',"
stagear replica/firebase/cuentas.ts
bloquea 5a 5 replica/firebase/cuentas.ts "$CONTRASENA" Bash "$COMMIT"

# --- Casos limpios -----------------------------------------------------------------

nuevo_repo L1
escribir replica/entornos/local.env.example "$JWT=
$FIREBASE=
$REDIS=
MOZO_EMAIL=$CORREO_EJEMPLO"
pasa L1 "replica/entornos/local.env.example sin valores y correo @example.com" Bash "git add replica/entornos/local.env.example && $COMMIT"

nuevo_repo L2
escribir .github/workflows/ci.yml "env:
  $JWT: \${{ secrets.$JWT }}
  $REDIS: \"\""
escribir replica/src/config.ts "const secreto = process.env.$JWT;
const redis = \${$REDIS:-};"
stagear .github/workflows/ci.yml replica/src/config.ts
pasa L2 "regla 3: el nombre solo, \${{ secrets }}, process.env y valor vacío" Bash "$COMMIT"

nuevo_repo L3
escribir docs/autores.md "Co-Authored-By: MC <$CORREO_GITHUB>
Comensal: $CORREO_EJEMPLO_ORG"
stagear docs/autores.md
pasa L3 "regla 4: @users.noreply.github.com y @example.org" PowerShell "$COMMIT"

nuevo_repo L4
escribir replica/firebase/cuentas.ts "password: '$CONTRASENA',"
stagear replica/firebase/cuentas.ts
pasa L4 "regla 5: el mismo texto de 5a, sin valores-prohibidos.local" Bash "$COMMIT"

nuevo_repo L5
escribir .claude/hooks/valores-prohibidos.local "

otro-valor-$SUFIJO
"
escribir replica/firebase/cuentas.ts "password: process.env.CLAVE_MOZO,"
stagear replica/firebase/cuentas.ts
pasa L5 "regla 5: .local con líneas vacías y un valor que no aparece" Bash "$COMMIT"

nuevo_repo L6
escribir .env "$JWT=$VALOR_ENV"
stagear .env
pasa L6 "git status no es un commit: no revisa nada" Bash "git status"

echo
echo "Casos: $total · fallan: $fallos"
[ "$fallos" -eq 0 ]
