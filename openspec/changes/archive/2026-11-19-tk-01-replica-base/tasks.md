## 0. Antes del código

- [x] 0.1 El humano confirma los huecos H-1 a H-7 (`design.md`); cada uno queda como DP-55 en adelante en `docs/backlog/tickets/README.md`, y la spec `contrato-replica` cita su DP en lugar del hueco. Se verifica con `openspec validate tk-01-replica-base` y sin ningún "HUECO" abierto en la spec, salvo H-8.
- [x] 0.2 Plan de `replica-feature` aprobado por el humano (gate 2), con las versiones exactas de las imágenes confirmadas con `docker manifest inspect`.

## 1. Tests primero, en rojo (`test-writer`)

Un test por scenario, con su ID o su entrada del contrato en el nombre. Cada uno se ve fallar, con su motivo, antes de implementar.

- [x] 1.1 SEG-c10 · test en `replica/tests/seguridad/` (gitleaks sobre todo el historial, los ejemplos con nombres y sin valores, ningún otro archivo de variables versionado, y el control positivo); se ve en rojo porque faltan los ejemplos.
- [x] 1.2 WS-c1 (en parte) · test en `replica/tests/arranque/` (migraciones registradas, las 13 tablas con sus columnas, y T01, T05 y el stream sin 404); se ve en rojo por conexión rechazada.
- [x] 1.3 T01 es público · test en `replica/tests/contrato/`; se ve en rojo.
- [x] 1.4 T01 con `USE_FIREBASE` desactivada · test; se ve en rojo.
- [x] 1.5 T01 rechaza un ID token inválido · test marcado local (`PRUEBAS_LOCALES=1`); se ve en rojo en local.
- [x] 1.6 Guards · JWT por encabezado o por query param · test; se ve en rojo.
- [x] 1.7 Guards · sin JWT, vencido o con otra firma · test; se ve en rojo.
- [x] 1.8 T05 devuelve las mesas ocupadas del restaurante del mozo · test; se ve en rojo.
- [x] 1.9 T05 trae los campos de O4 a propósito · test; se ve en rojo.
- [x] 1.10 T05 rechaza otro restaurante · test; se ve en rojo.
- [x] 1.11 T05 rechaza un rol que no está en `@Roles` · test; se ve en rojo.
- [x] 1.12 T05 sin mesas ocupadas · test; se ve en rojo.
- [x] 1.13 Stream abre con el JWT en el encabezado · test; se ve en rojo.
- [x] 1.14 Stream responde 401 con un JWT vencido antes de abrirse · test; se ve en rojo.
- [x] 1.16 T01 rechaza un body sin `firebaseIdToken` (local) · test agregado tras la revisión; su rojo se comprueba por mutación, porque la implementación ya existe.
- [x] 1.17 El stream responde 403 a un usuario sin restaurante (DP-64) · test agregado tras la revisión; su rojo se comprueba por mutación.
- [x] 1.15 Congelar los tests: `git add` de cada archivo y `sha256sum` a `congelados.sha` en el scratchpad; la huella se muestra en el chat.

## 2. Proyecto, migraciones y entorno (`implementer`)

- [x] 2.1 Proyecto NestJS 10 en `replica/` con su Dockerfile de Node 20, `engines` y `.nvmrc`; se verifica con `docker compose build`.
- [x] 2.2 Migración inicial con las 13 tablas y su `down`; se verifica con el test 1.2 y con un `down` seguido de un `up` en una base de prueba.
- [x] 2.3 `replica/entornos/local.env.example` y `pruebas.env.example`, solo con nombres; se verifica con el test 1.1.
- [x] 2.4 Parada del humano: se le pasa la ruta y la lista de variables de `replica/entornos/local.env` y `pruebas.env`, y el humano carga los valores.
- [x] 2.5 `compose.yaml` con la réplica, MySQL 8, Redis 7 y los servicios `pruebas` y `openapi`; se verifica con el test 1.2 desde cero (`docker compose down -v` y `up`).

## 3. Contrato (`implementer`)

- [x] 3.1 `FirebaseAdminModule` y T01, con `USE_FIREBASE` desactivada y activada; se verifica con los tests 1.3 y 1.4 en la suite, y 1.5 en local.
- [x] 3.2 `JwtAuthGuard` y `RolesGuard`; se verifica con los tests 1.6 y 1.7.
- [x] 3.3 T05 con su árbol de ítems y los campos de O4; se verifica con los tests 1.8 a 1.12.
- [x] 3.4 `SseModule` y el stream; se verifica con los tests 1.13 y 1.14.
- [x] 3.5 `@CampoSensible()` y el generador del OpenAPI; se verifica con `docs/api/openapi.yaml` generado, con T01, T05 y el stream, la marca `x-sensitive` y las validaciones de los tests 1.4, 1.8 y 1.9.

## 4. Verde, CI y detector

- [x] 4.1 Suite entera en verde, corrida por la sesión principal, y `sha256sum -c congelados.sha` en OK.
- [x] 4.2 Parada del humano: arranque con `USE_FIREBASE` activada y test 1.5 en local, juntos.
- [x] 4.3 `.github/workflows/replica.yml` con gitleaks, el control del OpenAPI y la suite; se verifica en la CI del PR.
- [x] 4.4 gitleaks sobre todo el historial y todas las ramas en local, en verde; y el humano corre `replica/scripts/buscar-valores-de-secretos.sh` con su archivo local, sin hallazgos.

## 5. Documentación y cierre

- [x] 5.1 `infraestructura.md` con los comandos reales, `estructura.md` si una carpeta quedó distinta, la sección "Comandos" de `AGENTS.md` y los tres endpoints de la sección 4 del `Readme.md`; se verifica releyendo cada uno contra lo que se corrió.
- [x] 5.2 `/opsx:verify` sin hallazgos críticos.
