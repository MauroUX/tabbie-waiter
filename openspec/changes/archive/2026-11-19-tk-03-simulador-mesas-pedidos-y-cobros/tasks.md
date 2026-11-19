## 0. Antes del código

- [x] 0.1 OK del humano sobre este change (gate 1), con los huecos H-1 a H-11 de `design.md` resueltos; cada uno queda como DP-72 en adelante en `docs/backlog/tickets/README.md`, y las specs citan su DP en lugar del hueco. Se verifica con `openspec validate tk-03-simulador-mesas-pedidos-y-cobros --strict` y sin ningún "hueco H-n, propuesta" en las specs.
- [x] 0.2 Rama `mc/tk-03-simulador-mesas-pedidos-y-cobros` desde `feature/entrega-2-mc`, creada con el OK del humano.
- [x] 0.3 Plan de `replica-feature` aprobado por el humano (gate 2), con las piezas de contrato del plan.
- [x] 0.4 Parada del humano: confirma que `JWT_EXPIRATION` tiene valor en `replica/entornos/pruebas.env` y `local.env` (el JWT de invitado vence con ella). El agente no los lee.

## 1. Tests primero, en rojo (`test-writer`)

Un test por scenario, con su ID o su entrada del contrato en el nombre. Cada uno se ve fallar, con su motivo, antes de implementar. El riesgo técnico va primero.

- [x] 1.1 Riesgo técnico · un invitado se une a una mesa libre y la mesa aparece en T05 · `replica/tests/contrato/join.test.ts`; se ve en rojo (404 en `/auth/guest`).
- [x] 1.2 `/auth/guest` · JWT de invitado sin Firebase, mismo `guestId`, rechazos · `replica/tests/contrato/auth-guest.test.ts`; se ven en rojo.
- [x] 1.3 `/join` · segundo comensal en la misma sesión y rechazos · `replica/tests/contrato/join.test.ts`; se ven en rojo.
- [x] 1.4 `POST /orders` · pedido `pending` con su árbol, quien no está en la sesión, cuerpo inválido o sesión que no sirve · `replica/tests/contrato/orders.test.ts`; se ven en rojo.
- [x] 1.5 `PUT /orders/:id/confirm` y T16 · confirma, recalcula y emite; el mozo no confirma; rechazos · `replica/tests/contrato/orders-confirm.test.ts`; se ven en rojo.
- [x] 1.6 `POST /payments/in-person-request` y T17 · Redis con vencimiento y evento; sin validar y envuelta; rechazos · `replica/tests/contrato/in-person-request.test.ts`; se ven en rojo.
- [x] 1.7 T06 · solicitudes del restaurante del mozo; sin solicitudes y sin restaurante · `replica/tests/contrato/t06-solicitudes.test.ts`; se ven en rojo.
- [x] 1.8 T07 · pagos de la sesión; O2 reproducido a propósito; sin JWT o sin pagos · `replica/tests/contrato/t07-pagos.test.ts`; se ven en rojo.
- [x] 1.9 Stream · los esquemas de T16 y T17 en el OpenAPI · `replica/tests/contrato/sse-eventos.test.ts` (archivo nuevo: `sse-waiters.test.ts` de TK-01 no se toca); se ve en rojo.
- [x] 1.10 Proyecto de pruebas del simulador: `simulator/test/` con `package.json`, `jest.config.ts`, `tsconfig.json`, `Dockerfile`, `apoyo/` (JWT del primer mozo, stream, T05, T06, correr la línea de comandos, leer el registro) y el `globalSetup` de la base recién cargada.
- [x] 1.11 WS-c1 (en parte), WS-c2 (en parte) y WS-c3 (en parte), en ese orden · `simulator/test/escenarios.test.ts`.
- [x] 1.12 Parámetros de la línea de comandos y argumentos inválidos · `simulator/test/linea-de-comandos.test.ts`.
- [x] 1.13 El registro del turno: cada línea con mesa, comensal y hora, sin JWT ni emails; y fuera del repo · `simulator/test/registro.test.ts`.
- [x] 1.14 Una petición rechazada termina el escenario · `simulator/test/linea-de-comandos.test.ts`.
- [x] 1.15 Rojo de la réplica: la suite entera, con cada test nuevo en 404 o con el esquema que falta, y los de TK-01 y TK-02 en verde. Gitleaks `dir` sobre `replica/tests/` y `simulator/test/`, y sin correos fuera de `example.com` en los `package-lock.json`.
- [x] 1.16 Congelar los tests: `git add` de cada archivo y `sha256sum` a `congelados.sha` en el scratchpad; la huella se muestra en el chat.

## 2. Riesgo técnico (`implementer`, fase 1)

- [x] 2.1 `POST /auth/guest` en `AuthModule`; se verifica con 1.2.
- [x] 2.2 `/join` en `TableSessionModule`, con la mesa bloqueada en una transacción; se verifica con 1.1 y 1.3. Si el riesgo no se despeja, se para y se le lleva al humano.

## 3. Resto de la réplica (`implementer`, fase 2)

- [x] 3.1 `REDIS_EXPIRATION_TIME` en `config/entorno.ts` (DP-80); se verifica con 1.6 y con un arranque con un valor inválido que falla nombrando la variable.
- [x] 3.2 `POST /orders` y `PUT /orders/:id/confirm` en `OrderModule`, con el recálculo de `total` y T16; se verifica con 1.4 y 1.5.
- [x] 3.3 `POST /payments/in-person-request` y T06 en `PaymentModule`, con T17; se verifica con 1.6 y 1.7.
- [x] 3.4 T07 en `TableSessionModule`, con `@Roles` y sin `RolesGuard` (O2); se verifica con 1.8.
- [x] 3.5 Los esquemas de los eventos y las entradas nuevas en el OpenAPI, regenerado; se verifica con 1.9 y con las validaciones de 1.1 a 1.8.

## 4. Simulador (`implementer`, fase 3)

- [x] 4.1 Proyecto `simulator/` (`package.json`, `tsconfig.json`, `Dockerfile`) y `.gitignore` con `simulator/registros/`; esqueleto de la línea de comandos que reconoce los argumentos y sale con "sin implementar". Segundo rojo: cada test de `simulator/test/` falla por lo que falta, no por la imagen ni por la conexión.
- [x] 4.2 Sesión del comensal, cliente HTTP sin reintentos y registro del turno; se verifica con 1.13.
- [x] 4.3 ESC-1, ESC-2 y ESC-5; se verifica con 1.11 y 1.12.
- [x] 4.4 Errores explícitos al primer rechazo; se verifica con 1.14.
- [x] 4.5 `compose.yaml` con `simulador` y `pruebas-simulador`; se verifica corriendo los dos servicios.

## 5. Verde, CI y detector

- [x] 5.1 Desde cero (`carga-desde-cero.sh`), la suite de la réplica y después la del simulador, enteras, corridas por la sesión principal; `sha256sum -c congelados.sha` en OK.
- [x] 5.2 Los tres escenarios corridos a mano con los comandos de `design.md`, D7, con su registro como evidencia en el PR (sin JWT).
- [x] 5.3 `.github/workflows/replica.yml` con el paso "Suite del simulador"; se verifica en la CI del PR.
- [x] 5.4 `docs/api/openapi.yaml` regenerado sin diferencias, y gitleaks sobre todo el historial y todas las ramas.

## 6. Documentación y cierre

- [x] 6.1 `infraestructura.md` (cómo se corre el simulador, el registro del turno y cómo comparar el reloj del contenedor con el de la máquina), `estructura.md` (`simulator/test/` y `simulator/registros/`), la sección "Comandos" de `AGENTS.md`, y `componentes.md` si los endpoints quedaron distintos de DP-17 y DP-18. Se verifica releyendo cada uno contra lo que se corrió.
- [x] 6.2 `/opsx:verify` sin hallazgos críticos.

## 7. Revisión adversarial del PR (DP-83 a DP-87)

- [x] 7.1 Decisiones delegadas por el humano, como DP-83 a DP-87 en `docs/backlog/tickets/README.md`, y las specs y el diseño (D9, D10) actualizados.
- [x] 7.2 Tests nuevos y cambiados (`test-writer`): concurrencia de `/join` y de `confirm`, `/join` solo para comensales, total con precio de opciones y con dos opciones, cantidad fuera de rango, `body` que no es JSON, cuerpo de entrada y marcas de nombres en el OpenAPI, T06 con un valor que no es JSON, el arranque con `REDIS_EXPIRATION_TIME` inválido, la primera línea de stderr con argumentos inválidos, la hora de antes de mandar y la línea de una respuesta con otra forma. Rojo y nueva huella.
- [x] 7.3 Arreglos (`implementer`): D9, D10, DP-83, DP-84, DP-86, DP-87, y la descripción de `confirmedAt` en el OpenAPI como DP-78.
- [x] 7.4 Verde desde cero en las dos suites, huella, OpenAPI regenerado sin diferencias, gitleaks, y el paso del script de arranque en la CI.
