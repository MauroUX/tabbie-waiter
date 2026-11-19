#!/bin/sh
# Carga los datos iniciales de la réplica (TK-02, D4; DP-16). Corre en la imagen de MySQL, como servicio `carga`.
#
# En orden:
#   1. Las migraciones: si la tabla `migrations` no existe o no registra la migración inicial por su nombre, sale con 1
#      (la réplica no creó el esquema, o la base no es la esperada).
#   2. La guardia: si los dos restaurantes de los datos ya están, dice "ya estaban" y sale con 0 sin tocar nada;
#      si hay otro restaurante, sale con 1 sin insertar.
#   3. La carga: datos-iniciales.sql, en una sola transacción.
#
# Variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME. La contraseña va en MYSQL_PWD, nunca en la línea de comandos.
# Un error de mysql termina con su código, nunca en silencio.
#
# Cómo se deshace: solo recreando la base (docker compose --env-file replica/entornos/pruebas.env down -v).
set -u

RESTAURANTE_1="11111111-1111-4111-8111-111111111111"
RESTAURANTE_2="22222222-2222-4222-8222-222222222222"
# El nombre que TypeORM guarda en migrations.name para replica/src/migrations/1794990000000-esquema-inicial.ts.
MIGRACION_INICIAL="EsquemaInicial1794990000000"
SQL="/datos-iniciales/datos-iniciales.sql"

faltan=""
for nombre in DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME; do
  eval "valor=\${$nombre:-}"
  [ -n "$valor" ] || faltan="$faltan $nombre"
done
if [ -n "$faltan" ]; then
  echo "carga: faltan variables de entorno:$faltan" >&2
  exit 1
fi

MYSQL_PWD="$DB_PASSWORD"
export MYSQL_PWD

# Una consulta, sin encabezados. Si mysql falla, el error sale por stderr y el código de mysql sube.
consulta() {
  mysql --default-character-set=utf8mb4 -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" "$DB_NAME" -N -B -e "$1"
}

salida=$(consulta "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'migrations'")
rc=$?
if [ "$rc" -ne 0 ]; then
  echo "carga: no se pudo consultar MySQL (código $rc)" >&2
  exit "$rc"
fi
if [ "$salida" = "0" ]; then
  echo "carga: la base no tiene la tabla de migraciones: la réplica todavía no creó el esquema, no se carga nada" >&2
  exit 1
fi
inicial=$(consulta "SELECT COUNT(*) FROM migrations WHERE name = '$MIGRACION_INICIAL'")
rc=$?
if [ "$rc" -ne 0 ]; then
  echo "carga: no se pudo leer la tabla de migraciones (código $rc)" >&2
  exit "$rc"
fi
if [ "$inicial" = "0" ]; then
  echo "carga: las migraciones no registran la inicial ($MIGRACION_INICIAL): la base no tiene el esquema esperado, no se carga nada" >&2
  exit 1
fi

ajenos=$(consulta "SELECT COUNT(*) FROM \`restaurant\` WHERE id NOT IN ('$RESTAURANTE_1', '$RESTAURANTE_2')")
rc=$?
if [ "$rc" -ne 0 ]; then
  echo "carga: no se pudo leer la tabla restaurant (código $rc)" >&2
  exit "$rc"
fi
propios=$(consulta "SELECT COUNT(*) FROM \`restaurant\` WHERE id IN ('$RESTAURANTE_1', '$RESTAURANTE_2')")
rc=$?
if [ "$rc" -ne 0 ]; then
  echo "carga: no se pudo leer la tabla restaurant (código $rc)" >&2
  exit "$rc"
fi

if [ "$ajenos" != "0" ]; then
  echo "carga: la base tiene $ajenos restaurante(s) que no son de los datos iniciales: no se carga nada." >&2
  echo "carga: para empezar de cero, recreá la base (docker compose down -v)." >&2
  exit 1
fi
if [ "$propios" = "2" ]; then
  echo "carga: los datos iniciales ya estaban cargados: no se inserta nada."
  exit 0
fi
if [ "$propios" != "0" ]; then
  echo "carga: la base tiene solo uno de los dos restaurantes de los datos iniciales: no se carga nada." >&2
  echo "carga: para empezar de cero, recreá la base (docker compose down -v)." >&2
  exit 1
fi

mysql --default-character-set=utf8mb4 -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" "$DB_NAME" < "$SQL"
rc=$?
if [ "$rc" -ne 0 ]; then
  echo "carga: mysql falló al cargar los datos iniciales (código $rc); la transacción no quedó a medias" >&2
  exit "$rc"
fi

resumen=""
for tabla in restaurant user table product product_option product_option_value; do
  filas=$(consulta "SELECT COUNT(*) FROM \`$tabla\`")
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "carga: no se pudo contar las filas de $tabla (código $rc)" >&2
    exit "$rc"
  fi
  resumen="$resumen $tabla=$filas"
done
echo "carga: datos iniciales cargados. Filas:$resumen"
