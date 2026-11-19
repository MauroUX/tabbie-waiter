## Context

Ver `proposal.md` ("Why"). La réplica de TK-01 arranca con `compose.yaml`, corre su migración inicial (13 tablas, `synchronize` desactivado, DP-51) antes de abrir el puerto (`migrationsRun`) y queda vacía. MySQL no publica puerto; el healthcheck de la réplica solo comprueba que el puerto 3000 acepta conexiones (DP-48). La suite (`replica/tests/`, servicio `pruebas`) corre en serie (`--runInBand`) y en la CI con `USE_FIREBASE` desactivada; lo que necesita Firebase corre solo con `PRUEBAS_LOCALES=1` y `local.env` (DP-43).

Restricciones que dan forma al diseño:

- **La base no controla varias reglas** (`modelo-de-datos.md`, sección 4): `restaurant.id` es un `varchar(36)` sin valor por defecto, el `@Check` de los umbrales no existe en MySQL, los precios son `decimal(10,0)` y MySQL redondea en silencio, y casi todas las FK aceptan nulos. Por eso los controles se hacen **contra la base real después de cargar**.
- **Los mozos tienen que existir antes de su primer inicio de sesión:** T01 inserta a un email desconocido con rol `user` y sin restaurante.
- **El repo es público y las cuentas viven en el proyecto de Firebase de Tabbie** (RA-7, 0009): ninguna contraseña entra al repo, y el script no lee ninguna cuenta que no sea de sus datos.
- **Las pruebas de TK-01 están congeladas** y siguen en verde con los datos cargados: siembran con uuid y correos al azar, y borran lo que insertan.
- **T01 ya rechaza un ID token sin `email`** desde TK-01: el test de DP-58 nace en verde y su rojo se comprueba por mutación.

Los huecos del modelo de datos los resolvió el humano en el gate 2: DP-66 (`paymentStyle`), DP-67 (umbrales), DP-68 (`limit` de las opciones), DP-69 (`mercadoPagoUserId`), DP-70 (tamaño) y DP-71 (claves, marcas, emails y variables).

## Goals / Non-Goals

**Goals:**

- Una carga determinista: dos cargas desde cero dan la misma foto de la base, valor por valor.
- Una sola fuente de verdad para las cuentas: el script deriva su lista de los datos cargados y el nombre de la variable de cada contraseña del email; no hay una segunda lista a mano.
- Lo que se puede probar sin Firebase corre en la CI; lo que no, queda marcado local, con evidencia en el PR.

**Non-Goals:**

- Ninguna migración nueva ni cambio de esquema.
- Ningún endpoint nuevo ni cambio del contrato; `docs/api/openapi.yaml` no cambia.
- Ninguna escritura desde el script sobre cuentas que ya existen (ni contraseñas, ni claims, ni bajas).
- `dbhub` (D10).

## Decisions

### D1 · Los emails son `waiterapp.<papel>@example.com`

`example.com` es el que nombra PR-3, y el hook `datos-que-no-salen` ya lo deja pasar (sus casos L1 y L3). El prefijo `waiterapp.` evita chocar con una cuenta `example.com` que ya exista en el proyecto de Tabbie con una contraseña desconocida. Los papeles: `mozo1.r1`, `mozo2.r1`, `mozo1.r2`, `usuario.r1` y `comensal` (DP-71).
**Alternativa:** `mozo1@example.com`. Se descarta: es un nombre tan común que puede existir ya en el proyecto.

### D2 · Valores de mentira de MercadoPago con la marca `FALSO-NO-ES-MERCADOPAGO-`

Por ejemplo, `FALSO-NO-ES-MERCADOPAGO-token-r1` y `FALSO-NO-ES-MERCADOPAGO-refresh-r1`. No tienen la forma de un token real (`APP_USR-…` o `TEST-…`), que el hook bloquea, y SEG-c11 los reconoce por el prefijo (DP-71). `mercadoPagoUserId` va en `NULL` (DP-69).
**Alternativa:** valores con la forma real y dígitos inventados. Se descarta: no se reconocen como de mentira (PR-2) y el hook los bloquea, con razón.

### D3 · El SQL fija todas las claves

`replica/datos-iniciales/datos-iniciales.sql` escribe los uuid de los restaurantes (`11111111-1111-4111-8111-111111111111` y `22222222-2222-4222-8222-222222222222`) y los ID de todas las filas con autoincremento. Así la foto de dos cargas es idéntica, y las pruebas y el simulador nombran el restaurante 1 por su uuid. Contenido: DP-66, DP-67, DP-68 y DP-70.
**Alternativa:** dejar que MySQL asigne los ID. Se descarta: la recarga no se podría comparar valor por valor.

### D4 · Un servicio `carga` de una sola vez, con el cliente de MySQL

Usa la misma imagen fijada de MySQL de `compose.yaml`, monta solo `replica/datos-iniciales/` de solo lectura y corre `replica/datos-iniciales/cargar.sh`, con la contraseña en `MYSQL_PWD` (nunca en la línea de comandos):

1. **Espera:** `depends_on` de la réplica con `service_healthy`; la réplica migra antes de abrir el puerto.
2. **Migraciones:** si la tabla `migrations` no existe o no registra la migración inicial, sale con 1 y un mensaje que lo dice (DP-51).
3. **Guardia:** si los dos uuid de los datos ya están, dice "ya estaban" y sale con 0; si hay otro restaurante, sale con 1 y un mensaje que lo dice, sin insertar.
4. **Carga:** el SQL en una sola transacción.

Con `docker compose up -d --wait`, Compose v2.39 falla si un servicio termina, aunque sea con 0, salvo que otro servicio del mismo `up` dependa de él con `service_completed_successfully`. Por eso hay un servicio `carga-lista` (la misma imagen, con `tail -f /dev/null`) que depende de `carga` así: si la carga sale con error, `carga-lista` no arranca y `up --wait` falla; si sale con 0, `up --wait` termina en 0. Así el comando de siempre (`up -d --build --wait`) sigue igual, y `carga` vuelve a correr, con su guardia, en cada `up`. Decisión del humano sobre una propuesta del `implementer`, que lo comprobó con un compose mínimo. El servicio `pruebas` depende de `carga` con `service_completed_successfully`, así la suite siempre corre con los datos; un `run` que la vuelve a arrancar pasa por la guardia.
**Alternativa:** un seeder dentro de la réplica. Se descarta: DP-16 lo prohíbe, y la réplica no tiene código solo de prueba (DP-48).

### D5 · Cómo se deshace

**Solo recreando la base** (`docker compose … down -v` y `up`), como dice el ticket. Eso vacía también lo que generó el simulador. Las cuentas de Firebase no se tocan. No hay migración nueva, así que no hay `down` que escribir (DP-51).

### D6 · El servicio `cuentas` de `replica/firebase/`

Un proyecto Node 20 propio en `replica/firebase/` (con `firebase-admin` 13.10.0 y `mysql2` 3.24.6, las versiones de la réplica), con su Dockerfile, y el servicio `cuentas` de `compose.yaml` en el perfil `firebase`. Lee de MySQL las filas `user` que no son invitados, y falla en alto si un email no es de `example.com`. Tres modos:

- **`lista`:** imprime los emails, sin Firebase; lo usa la parte de SEG-c11 que corre en la CI.
- **`plan`:** busca cada email en Firebase Admin y dice cuáles crearía y cuáles ya existen, sin escribir.
- **`crear`:** crea solo las que faltan, con la contraseña de `CONTRASENA_<PAPEL>`, e informa cuántas creó y cuántas ya existían.

Nunca lista todas las cuentas del proyecto ni actualiza o borra una existente. La variable sale del email: `CONTRASENA_` más la parte local sin `waiterapp.`, en mayúsculas y con `_` en lugar de cada carácter que no es letra ni número.

### D7 · Dónde viven las pruebas

En `replica/tests/` (DP-14):

- `seguridad/seg-c11.test.ts`: la parte de SEG-c11 sobre la base, MercadoPago y la carga.
- `datos/modelo.test.ts` y `datos/contenido.test.ts`: los controles de Datos, con `mysql2` directo a MySQL.
- `datos/carga-desde-cero.sh`: un script de bash que corre en la máquina (y como paso de la CI), porque el contenedor de pruebas no puede recrear la base. Un bloque por scenario, con su ID en el nombre: la recarga desde cero, el `up` sobre una base cargada, la falla en alto (sin migraciones y con un restaurante ajeno), y la lista del script de SEG-c11. La foto son los conteos de las 13 tablas y un `mysqldump --no-create-info --order-by-primary --skip-dump-date --skip-comments --skip-extended-insert` de las 6 tablas que carga el SQL, sacados con `docker compose exec mysql` y la contraseña del propio contenedor. Control positivo: la foto tiene que tener los dos restaurantes. El script hace `down -v` con el perfil de pruebas y termina con el stack recién cargado.
- `cuentas/*.test.ts` (locales): WS-c1, el canje de cada cuenta, cada fila con su cuenta y la segunda corrida.
- `contrato/t01-sin-email.test.ts` (local): DP-58.

### D8 · Contraseñas y Web API key

- **Contraseñas:** en `replica/entornos/cuentas.env`, con su `cuentas.env.example` solo de nombres. Lo cargan solo `cuentas` y `pruebas`, con `env_file` y `required: false`; la réplica no las ve, y en la CI el archivo no existe. Lo cubren `.gitignore` (`*.env`), la regla de lectura `Read(**/*.env)`, la regla 1 del hook (archivo que no se versiona) y su regla 5, con `valores-prohibidos.local` (una contraseña por línea, que llena el humano).
- **Web API key:** `FIREBASE_WEB_API_KEY`, en `local.env` (y su nombre en `local.env.example`), solo para `pruebas`. La regla 2 del hook bloquea las claves `AIza…`.

### D9 · Los ID tokens de las pruebas locales

- **Con email y contraseña:** REST `accounts:signInWithPassword` con `FIREBASE_WEB_API_KEY`, con el `fetch` de Node 20. `accounts:lookup` da la fecha de creación y la de la última contraseña.
- **Sin `email` (DP-58):** la prueba firma un custom token RS256 con `jsonwebtoken` y la cuenta de servicio (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`), para el uid fijo `waiterapp-dp58-sin-email`, y lo canjea con `accounts:signInWithCustomToken`. La primera vez crea esa cuenta sin email en el proyecto; las siguientes la reusan.

Ninguna dependencia nueva en `replica/tests/`.

### D10 · `dbhub` queda fuera de TK-02

Encenderlo con un usuario de solo lectura pide un script de inicio de MySQL con el usuario `lectura` (solo `SELECT`), una variable `DB_LECTURA_PASSWORD` en los dos perfiles, un servicio `dbhub` con su imagen fijada y `--readonly`, y un `.mcp.json` que lo lance con `docker compose --env-file … run --rm -i dbhub`, para que la contraseña la lea Compose del archivo local. El MCP se carga al reiniciar la sesión, y eso demora el ticket. Lo reemplazan los tests de Datos (D7), que son la evidencia y corren en la CI. El diseño queda en `docs/ia/harness.md`, "Pendiente".

## Risks / Trade-offs

- **[Las pruebas congeladas de TK-01 chocan con los datos cargados]** → Siembran con uuid y correos al azar y borran lo que insertan, y la suite corre en serie. Los datos usan uuid, `qrCode` y emails que no se pisan con esos.
- **[El script crea cuentas reales en el proyecto de Firebase de Tabbie]** (RA-7) → Corre solo con el OK del humano, primero en modo `plan`; solo crea, nunca actualiza ni borra; busca por email y no lista el proyecto. Si `plan` encuentra una cuenta antes de la primera creación, se para y se le lleva al humano.
- **[Una contraseña o la Web API key entran al repo o al chat]** → D8; el agente no abre ni lista esos archivos.
- **[DP-58 crea una cuenta sin email en el proyecto]** → Un uid fijo y reconocible, que se reusa; la primera corrida va con el OK del humano.
- **[`carga-desde-cero.sh` borra la base local]** → Lo dice al empezar, usa solo `pruebas.env` y termina con el stack recién cargado.
- **[MySQL redondea un precio con decimales en silencio]** → El control de precios mira el SQL y compara cada valor de la base con el del SQL.

## Migration Plan

1. `docker compose --env-file replica/entornos/pruebas.env down -v` y `up -d --build --wait`: la réplica migra y `carga` carga los datos.
2. Con el OK del humano, `cuentas` en modo `plan`, después en modo `crear`, con `local.env`.
3. **Vuelta atrás:** `down -v` vacía la base (D5). Las cuentas de Firebase quedan; no se borran (ticket, "Cómo se deshace").
