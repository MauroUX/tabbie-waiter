## Context

- Fuera de `docs/` no hay código: `replica/` tiene solo su `CLAUDE.md`, y no existen `compose.yaml`, `docs/api/` ni `.github/`. Ver `proposal.md` para el porqué.
- La réplica es propia y se construye desde el contexto (0010, DP-48). El código de Tabbie no se lee: lo que el contexto no fija es un hueco y lo decide el humano (sección "Huecos del contrato").
- La máquina de desarrollo tiene Node 24, Docker 28.4 y no tiene gitleaks. 0003 fija Node 20.
- El hook `datos-que-no-salen` bloquea en cada commit `JWT_SECRET`, `FIREBASE_PRIVATE_KEY` y `REDIS_PASSWORD` con valor, y todo archivo de variables que no sea `*.env.example` (`.gitignore`).

## Goals / Non-Goals

**Goals:**

- Un solo camino para correr todo (réplica, suite, generador del OpenAPI y detector), igual en la máquina y en la CI, con Node 20 aunque la máquina tenga otro.
- Pruebas de contrato que no ven el código de la réplica: viven en su propio proyecto en `replica/tests/` y hablan solo HTTP, MySQL y Redis (DoD de Backend).
- El OpenAPI sale del código y es reproducible byte a byte, para que la CI pueda compararlo.

**Non-Goals:**

- Ver `proposal.md`, "No-alcance". Además: no hay ktlint ni tests de la app en la CI hasta que exista `android/` (TK-04); el workflow los deja para ese ticket.

## Decisions

### D1 · Node 20 sin instalarlo en la máquina

- **Dockerfile de `replica/`:** multi-etapa (`build` y `runtime`) sobre la imagen oficial `node:20-bookworm-slim`, fijada por su versión exacta 20.x y su digest. La versión exacta se confirma en el plan con `docker manifest inspect`, sin descargar nada.
- **Proyecto:** `replica/package.json` y `replica/tests/package.json` con `"engines": {"node": ">=20 <21"}`, y `.nvmrc` con `20` en la raíz. Sin `engine-strict`: así un `npm install` en la máquina, con Node 24, sirve al editor para los tipos, pero nada se **ejecuta** ahí.
- **Dónde corre la suite:** en un contenedor de Node 20, el servicio `pruebas` de `compose.yaml`, bajo el perfil de Compose `pruebas`, construido desde `replica/tests/`. La CI usa el mismo servicio.
- **Alternativas:** instalar Node 20 con nvm-windows o fnm (pide instalar algo y deja dos Node en la máquina); correr la suite en la máquina con Node 24 (rompe 0003 sin decirlo); `actions/setup-node` en la CI y contenedor en local (dos caminos que pueden divergir).

### D2 · Detector de secretos (SEG-c10)

- **gitleaks** desde su imagen oficial `ghcr.io/gitleaks/gitleaks`, con la versión 8.x fijada; la exacta se confirma en el plan con `docker manifest inspect` y no se descarga sin el OK del humano.
- **Local, todo el historial y todas las ramas:** `git fetch --all --prune`, y después `gitleaks git` sobre el repo montado en el contenedor, con `--log-opts="--all"` (incluye `refs/remotes/origin/*`) y `--redact`, así un hallazgo no imprime el valor.
- **CI:** el mismo contenedor en un job propio, con `actions/checkout` y `fetch-depth: 0` y un `git fetch` de todas las ramas.
- **Valores de cada entorno:** gitleaks busca formas conocidas, no los valores del archivo local. El criterio pide buscar esos valores, así que se agrega `replica/scripts/buscar-valores-de-secretos.sh <archivo>`: lee el archivo local, busca cada valor con `git log --all -S` y `git grep` sobre todas las ramas, e imprime solo el nombre de la variable y "no aparece" o "APARECE". **Lo corre el humano**, porque el agente no lee ese archivo.
- **Control positivo:** la prueba crea un repo temporal con un secreto de mentira con forma de clave privada, generado en el momento y nunca commiteado en este repo, y comprueba que gitleaks lo detecta.
- **La prueba de SEG-c10** vive en `replica/tests/seguridad/` y nace en rojo porque todavía no existen `replica/entornos/*.env.example` con los nombres; la parte de gitleaks sobre el historial ya está limpia hoy y lo que prueba que detecta es el control positivo.
- **Alternativas:** `gitleaks-action` (en una cuenta personal no pide licencia, pero es otro camino distinto del local); instalar el binario en Windows (pide instalar).

### D3 · `x-sensitive: true` con `@nestjs/swagger`

- **Qué campos:** los de O4 (`restaurant.mercadoPagoToken`, `restaurant.mercadoPagoRefreshToken`, `user.email`), `access_token` de la respuesta de T01 y `firebaseIdToken` del body de T01, porque son credenciales.
- **Cómo:** un decorador propio `@CampoSensible()` en `replica/src/openapi/` que aplica `@ApiProperty` y registra el campo en metadatos. El generador recorre `components.schemas` del documento y agrega `x-sensitive: true` a cada propiedad registrada. No depende de que la versión de `@nestjs/swagger` copie las extensiones `x-` de `@ApiProperty`.
- **Cómo se comprueba:** la prueba del contrato de T05 y la de T01 leen `docs/api/openapi.yaml` y exigen la marca en esos campos.
- **Alternativa:** pasar `'x-sensitive': true` dentro de `@ApiProperty`. Más corto, pero si la versión instalada no copia la extensión, la marca se pierde sin error. Se descarta para no depender de eso.

### D4 · Generación del OpenAPI (DP-52)

- Un script `replica/src/scripts/generar-openapi.ts` arma la app con `NestFactory.create(AppModule, { preview: true })`, que no instancia proveedores ni abre conexiones, así no hace falta MySQL ni Redis. Escribe YAML con orden de claves estable y fin de línea LF.
- Corre en el contenedor de la réplica, con `docs/api/` montado: `docker compose run --rm --no-deps openapi`, un servicio del perfil `herramientas`.
- **CI:** regenera y corre `git diff --exit-code -- docs/api/openapi.yaml`; si difiere, falla.
- **Entidades como esquema:** T05 devuelve las entidades sin serializar (O4), así que las entidades llevan `@ApiProperty` y son el esquema de la respuesta. Los `decimal` y el `bigint` se declaran `string`.
- **El stream:** `text/event-stream`, con la lista de eventos en la descripción; el esquema de cada evento lo agrega el ticket que lo emite.

### D5 · Migraciones (DP-51)

- Una sola migración inicial, `replica/src/migrations/<timestamp>-esquema-inicial.ts`, con las 13 tablas, índices, únicos y FK de `modelo-de-datos.md`, sin el `@Check` de los umbrales (no existe en MySQL, 2.1).
- **Cómo se deshace:** su `down` borra las FK y las 13 tablas en el orden inverso. Y siempre se puede recrear la base desde cero con `docker compose down -v`.
- **Al arrancar:** `migrationsRun: true` y `synchronize: false`. Si una migración falla, la réplica no arranca y lo dice en el registro.
- **Alternativa:** una migración por tabla. Más archivos sin ganancia: ningún ticket del lote 1 cambia una tabla.

### D6 · Variables y perfiles (`replica/entornos/`)

- **Ejemplos versionados:** `replica/entornos/local.env.example` (normal) y `replica/entornos/pruebas.env.example` (pruebas), con **solo los nombres** de `infraestructura.md`, sección 5. Los valores sugeridos que no son secretos (por ejemplo, el vencimiento corto de `REDIS_EXPIRATION_TIME` del perfil de pruebas, para HU-06.h4) van como comentario, no como valor; los secretos llevan el comentario "secreto: no se versiona".
- **Archivos locales**, ignorados por `.gitignore`: `replica/entornos/local.env` y `replica/entornos/pruebas.env`. El perfil se elige con `docker compose --env-file replica/entornos/<perfil>.env`: así las variables llegan a la réplica y también a la interpolación de `compose.yaml`, de donde MySQL y Redis toman su contraseña. `USE_FIREBASE` se activa solo con el valor `true`; vacía, ausente o `false`, queda desactivada.
- **CI:** el job escribe `replica/entornos/pruebas.env` en el momento, con `JWT_SECRET` y las contraseñas de MySQL y Redis generadas con `openssl rand` en cada corrida, y `USE_FIREBASE` desactivada (DP-43). Ningún valor queda en el repo ni en el registro.

### D7 · Pruebas de contrato (DP-14, DP-15)

- **Proyecto propio** en `replica/tests/`: `package.json`, `jest.config`, `tsconfig` y su `Dockerfile` de Node 20. No importa nada de `replica/src/`.
- **Datos:** cada prueba inserta lo que necesita en MySQL (restaurante con su uuid, mesa, sesión, usuarios, pedidos y árbol de ítems) con valores sintéticos y emails de `example.com`, y lo borra al terminar.
- **JWT:** firma el del mozo con el `JWT_SECRET` del perfil, con los claims de DP-57 (DP-15). El vencido se firma con `exp` en el pasado.
- **Validación contra el OpenAPI:** Ajv sobre `docs/api/openapi.yaml`; cada respuesta se valida contra el esquema de su ruta y su código.
- **Pruebas locales:** las que necesitan Firebase (T01 con `USE_FIREBASE` activada) se saltean salvo con `PRUEBAS_LOCALES=1`, y no corren en la CI (DP-43).

### D8 · CI (`.github/workflows/replica.yml`, DP-11)

En cada PR: (1) gitleaks sobre todo el historial; (2) build de la imagen y regeneración del OpenAPI sin diferencias; (3) `compose.yaml` levantado desde cero con el perfil de pruebas y la suite en el servicio `pruebas`; al final, `docker compose down -v`.

### D9 · Comandos para `AGENTS.md`

Se confirman en el plan y se escriben al cerrar, con la salida real:

```powershell
docker compose --env-file replica/entornos/local.env up -d --build                           # réplica, MySQL y Redis, perfil normal
docker compose --env-file replica/entornos/pruebas.env up -d --build                         # perfil de pruebas
docker compose --env-file replica/entornos/pruebas.env down -v                               # volver a empezar desde cero
docker compose --env-file replica/entornos/pruebas.env --profile pruebas run --rm pruebas    # la suite de la réplica
docker compose --profile herramientas run --rm --no-deps openapi                             # regenerar docs/api/openapi.yaml
git fetch --all --prune; docker run --rm -v "${PWD}:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 git /repo --log-opts="--all" --redact
```

## Huecos del contrato

Lo que el contexto no fija en T01, T05 y el stream. El humano aprobó las propuestas: H-1 a H-7 son DP-55 a DP-61 en `docs/backlog/tickets/README.md`, y la spec cita cada DP. Las dos lecturas de D2 y D6 son DP-62 (SEG-c10) y DP-63 (ejemplos de `replica/entornos/`). No se leyó el código de Tabbie.

| Hueco | Qué falta | Decisión | Alternativa descartada |
|---|---|---|---|
| **H-1** · T01, código de éxito | 200 o 201 | **201**, el de un `POST` en NestJS sin `@HttpCode`. La app acepta cualquier 2xx | 200 |
| **H-2** · T01, cuerpo de la respuesta | Los demás campos de `user` | `{"access_token": "<jwt>", "user": {"id", "email", "name", "role", "restaurantId"}}`, con `restaurantId` string y `"-1"` sin restaurante | Solo `access_token` y `user: {role, restaurantId}` |
| **H-3** · claims del JWT propio y usuario inexistente | Algoritmo, nombres de los claims y qué pasa si el `userId` no está en `user` | HS256 con `JWT_SECRET`; claims `{userId, role, iat, exp}`; el guard usa solo `userId`, y si no está en `user` responde **401** | `sub` en lugar de `userId` |
| **H-4** · T01, errores | Body sin `firebaseIdToken`, ID token inválido o vencido, token sin `email` | **401** en los tres casos, con un mensaje que nombra el motivo; nunca emite JWT | 400 para el body sin el campo y 401 para el resto |
| **H-5** · T01 con `USE_FIREBASE` desactivada | Qué responde el login sin Firebase | **503** con el mensaje "Firebase desactivado (USE_FIREBASE)", sin JWT: un error explícito y no un 401 que la app leería como credenciales incorrectas | 401 |
| **H-6** · T05, forma del JSON | La forma de arriba, el nombre de la sesión activa, mesa sin pedidos y orden | Un **arreglo de mesas**: cada una con sus columnas, `restaurant` (fila completa) y `activeSession` con sus columnas, `users[]` (cada uno con `restaurant`) y `orders[]` (cada uno con `user` con `restaurant` e `items[]` → `product`, `selectedOptions[]` → `productOption`, `values[]`). Mesa sin pedidos: `orders: []`. Mesas por `number` ascendente y pedidos por `createdAt` ascendente. Sin mesas ocupadas: `[]` | Un arreglo de sesiones activas, cada una con su `table` |
| **H-7** · T05, códigos de rechazo | Restaurante distinto y rol fuera de `@Roles` | **403** en los dos casos | 401 para el rol, 403 para el restaurante |

## Risks / Trade-offs

- **[Node 20 terminó su soporte el 2026-04-30]** → 0003 lo fija y este ticket lo respeta; sin parches de seguridad, el riesgo queda en la imagen. Cambiar de versión es un ADR nuevo, no una decisión del ticket. Lo dejo anotado para el humano.
- **[La parte de gitleaks de SEG-c10 nace en verde]** → el historial ya está limpio. El rojo de la prueba viene de los ejemplos que faltan, y el control positivo prueba que el detector detecta.
- **[El canje real de T01 no se prueba en este ticket]** → necesita una cuenta de prueba de Firebase, que crea TK-02 (DP-15). Acá se prueba el rechazo de un token inválido con Firebase activada, en local, junto con el humano.
- **[`preview: true` puede no alcanzar si algún módulo abre conexiones en su fábrica]** → la prueba del OpenAPI corre el generador sin MySQL ni Redis; si falla, el generador se corre dentro del stack levantado.
- **[Las entidades como esquema acoplan el OpenAPI al modelo]** → es a propósito: T05 devuelve las entidades sin serializar (O4).

## Migration Plan

- **Desplegar:** no hay entorno desplegado. En local, `docker compose up -d --build` corre las migraciones al arrancar.
- **Deshacer:** `down` de la migración inicial, o `docker compose down -v` para recrear la base desde cero.

## Paradas del humano

1. **Gate 1:** este change y los huecos H-1 a H-7.
2. **Gate 2:** el plan de `replica-feature`, antes de lanzar `test-writer`; incluye las versiones exactas de las imágenes.
3. **Archivo local de variables:** se le pasa al humano la ruta y la lista de variables de `local.env` y `pruebas.env`, y el agente para. Los valores los carga el humano; el agente no los lee, no los muestra y no los escribe.
4. **`USE_FIREBASE` activada:** el arranque con Firebase y la prueba local de T01 se comprueban juntos, después de que el humano cargue las credenciales.
5. **Detector sobre los valores:** el humano corre el script de D2 con su archivo local.
6. **Un test que nace en verde, una disputa del `implementer` o una huella que no cuadra:** se trae tal cual.

## Open Questions

Ninguna. H-8 (el stream con un usuario sin restaurante) quedó resuelta como DP-64: 403 antes de abrir el stream.
