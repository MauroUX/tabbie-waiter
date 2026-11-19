# simulador-comensales Specification

## Purpose
El simulador de comensales: una línea de comandos en TypeScript sobre Node 20, en contenedor (0003), que hace contra la réplica lo que hace el comensal, con los endpoints del comensal (DP-17, DP-18), y anota cada petición en el registro del turno ([componentes.md](../../../docs/architecture/componentes.md), sección 3). TK-03 trajo ESC-1, ESC-2 y ESC-5; TK-08 y TK-13 suman los demás escenarios del lote 1.

**Origen de cada requirement.** Los que llevan un ID (WS-c1, WS-c2, WS-c3) son criterios heredados del ticket "en parte", con su texto copiado tal cual (DP-08); cada uno dice qué parte prueba este cambio. Los demás no son criterios: son la Definition of Done propia de TK-03, el paso 6 del ticket o los criterios extra que pidió el humano para este ticket, y cada uno nombra su origen.

**Cómo se prueba.** Las pruebas viven en `simulator/test/`, no importan el código del simulador y lo corren por su línea de comandos contra la réplica levantada con sus datos iniciales recién cargados. Comprueban el efecto con T05 y T06 y abriendo `/sse/waiters`, con el JWT del primer mozo del restaurante 1 (`userId` 1, rol `waiter`, DP-71) firmado por la prueba con el `JWT_SECRET` del perfil de pruebas (DP-15, DP-57), sin Firebase. Corren en la CI.

## Requirements

### Requirement: WS-c1 · Las dos mesas ocupadas del restaurante 1 (en parte)

El simulador SHALL ocupar mesas libres del restaurante 1 con ESC-1, y la réplica SHALL devolverlas en T05 al primer mozo del restaurante 1.

Criterio heredado, copiado tal cual de [walking-skeleton.md](../../../docs/architecture/walking-skeleton.md#5-criterios-de-aceptación) (DP-08). **En parte:** este cambio prueba solo "el restaurante 1 tiene dos mesas ocupadas", generadas con ESC-1 desde la línea de comandos, y que la réplica las devuelve en T05 (ticket TK-03). El criterio completo, con la app, es de TK-05.

> **WS-c1 · La app arranca contra la réplica** (0002, 0004, 0006; HU-01 y HU-02, lo mínimo)
>
> - **Dado** que la réplica corre con sus datos iniciales, y el restaurante 1 tiene dos mesas ocupadas
> - **Cuando** la app arranca e inicia sesión con la cuenta de prueba del primer mozo del restaurante 1
> - **Entonces** la app muestra en su lista sin diseño las dos mesas que devuelve la réplica para el restaurante 1
> - **Y** el registro anota la conexión de eventos abierta y la primera consulta de mesas, solicitudes y cobros

#### Scenario: WS-c1 (en parte) · ESC-1 deja dos mesas ocupadas en el restaurante 1

- **GIVEN** la réplica con sus datos iniciales recién cargados, y T05 del primer mozo del restaurante 1 devuelve `[]`
- **WHEN** se corre `simulador esc-1 --mesa 1 --comensales 2` y después `simulador esc-1 --mesa 2`, con un archivo de registro de la prueba
- **THEN** las dos corridas terminan con código 0
- **AND** T05 del primer mozo del restaurante 1 devuelve exactamente las mesas 1 y 2, la 1 con dos invitados en `users[]` y la 2 con uno
- **AND** el registro tiene una línea por cada `POST /auth/guest` y cada `/join`, con la mesa, el comensal (`userId` y `guestId`) y la hora

### Requirement: WS-c2 · ESC-2 confirma un pedido y deja su hora en el registro (en parte)

El simulador SHALL crear y confirmar un pedido con ESC-2, la réplica SHALL emitir `order-confirmed-notification` (T16) por `/sse/waiters`, y el registro del turno SHALL anotar la hora en que el simulador mandó la confirmación.

Criterio heredado, copiado tal cual de [walking-skeleton.md](../../../docs/architecture/walking-skeleton.md#5-criterios-de-aceptación) (DP-08). **En parte:** este cambio prueba ESC-2, el evento que emite la réplica y la hora de la confirmación en el registro del turno, que es el "desde cuándo" de la medición (walking-skeleton.md, sección 4) (ticket TK-03). La medición de los 2 s, las 20 repeticiones y el estado de la app son de TK-05.

> **WS-c2 · Un pedido confirmado llega por evento** (RNF-1, 0006)
>
> - **Dado** que la app inició sesión y hay comunicación
> - **Cuando** el simulador confirma un pedido en una mesa del restaurante 1 (ESC-2)
> - **Entonces** el pedido está en el estado de la app en 2 s o menos desde que el simulador mandó la confirmación
> - **Y** el registro indica que llegó por un evento, no por la consulta periódica
> - Se repite 20 veces.

#### Scenario: WS-c2 (en parte) · ESC-2 confirma un pedido, T16 llega por `/sse/waiters` y la hora queda en el registro

- **GIVEN** la réplica con sus datos iniciales y `/sse/waiters` abierto con el JWT del primer mozo del restaurante 1 en el encabezado
- **WHEN** se corre `simulador esc-2 --mesa 3`
- **THEN** la corrida termina con código 0
- **AND** el registro tiene la línea de `PUT /orders/:id/confirm` con la mesa 3, el comensal, el `orderId`, `resultado: "ok"` y la `hora` en UTC con milisegundos
- **AND** el stream recibe `order-confirmed-notification` cuyo `data.body` trae ese `orderId`, `tableNumber` 3, el `tableSessionId` de la mesa, el restaurante 1 y `confirmedAt`
- **AND** T05 del primer mozo muestra ese pedido `confirmed` en la mesa 3

### Requirement: WS-c3 · ESC-5 pide un cobro presencial y deja su hora en el registro (en parte)

El simulador SHALL pedir un cobro presencial con ESC-5, la réplica SHALL emitir `in-person-payment-request` (T17) por `/sse/waiters`, y el registro del turno SHALL anotar la hora en que el simulador lo pidió.

Criterio heredado, copiado tal cual de [walking-skeleton.md](../../../docs/architecture/walking-skeleton.md#5-criterios-de-aceptación) (DP-08). **En parte:** este cambio prueba ESC-5, el evento que emite la réplica y la hora de la solicitud en el registro del turno (ticket TK-03). La medición de los 2 s, las 20 repeticiones y el estado de la app son de TK-05.

> **WS-c3 · Una solicitud de cobro presencial llega por evento** (RNF-1, 0006)
>
> - **Dado** que la app inició sesión y hay comunicación
> - **Cuando** el simulador pide un cobro presencial en una mesa del restaurante 1 (ESC-5)
> - **Entonces** la solicitud está en el estado de la app en 2 s o menos desde que el simulador la pidió
> - **Y** el registro indica que llegó por un evento
> - Se repite 20 veces.

#### Scenario: WS-c3 (en parte) · ESC-5 pide un cobro, T17 llega por `/sse/waiters` y la hora queda en el registro

- **GIVEN** la réplica con sus datos iniciales y `/sse/waiters` abierto con el JWT del primer mozo del restaurante 1 en el encabezado
- **WHEN** se corre `simulador esc-5 --mesa 4 --monto 2000 --propina 200 --metodo Cash`
- **THEN** la corrida termina con código 0
- **AND** el registro tiene la línea de `POST /payments/in-person-request` con la mesa 4, el comensal, el `requestId`, el monto, `resultado: "ok"` y la `hora`
- **AND** el stream recibe `in-person-payment-request` con ese `id`, `amount` 2200, `noTipAmount` 2000, `method` `Cash`, `tableNumber` 4, el restaurante 1 y el `userId` del comensal
- **AND** T06 del primer mozo devuelve esa solicitud

### Requirement: Cada escenario se corre desde la línea de comandos con sus parámetros

Cada escenario SHALL correrse desde la línea de comandos con sus parámetros (restaurante, mesa, cantidad de comensales y de pedidos, productos, montos, método), sin tocar código. Los argumentos inválidos SHALL terminar con un mensaje de uso, sin mandar ninguna petición.

Origen: Definition of Done propia de TK-03 ("Cada escenario se corre desde la línea de comandos con sus parámetros, sin tocar código") y el alcance del ticket ("Línea de comandos"). La forma de la línea de comandos está en `design.md`, D2.

#### Scenario: Los parámetros cambian lo que hace el escenario

- **GIVEN** la réplica con sus datos iniciales
- **WHEN** se corre `simulador esc-2 --mesa 5 --pedidos 2 --productos 3x2,6`
- **THEN** la corrida termina con código 0 y el registro tiene dos confirmaciones
- **AND** T05 del primer mozo muestra en la mesa 5 dos pedidos `confirmed`, cada uno con dos unidades del producto 3 y una del producto 6

#### Scenario: Argumentos inválidos

- **WHEN** se corre `simulador esc-5 --mesa 1 --monto 100 --metodo Tarjeta`, y otra vez `simulador esc-9`
- **THEN** las dos corridas terminan con código 2, y la primera línea de stderr, antes del uso, nombra el argumento y su valor (`--metodo` y `Tarjeta`) o el escenario (`esc-9`), sin agregar ninguna línea al registro

### Requirement: El registro del turno

El registro del turno SHALL tener, de cada petición que manda el simulador, la mesa, el comensal y la hora en que la mandó, en el reloj de la máquina, y nunca el JWT ni emails. SHALL guardarse fuera del repo.

Origen: Definition of Done propia de TK-03 ("El registro del turno tiene, de cada petición, la mesa, el comensal y la hora, en el reloj de la máquina") y el alcance del ticket ("Registro del turno"). El formato está en `design.md`, D3.

#### Scenario: Cada petición tiene su línea con la mesa, el comensal y la hora

- **GIVEN** el registro que dejaron los scenarios de WS-c1, WS-c2 y WS-c3
- **WHEN** se lee línea por línea
- **THEN** cada línea es un JSON con `hora` (ISO 8601 en UTC con milisegundos), `escenario`, `peticion`, `restaurantId`, `mesa`, `comensal` (con `userId`, salvo la de `/auth/guest`, y `guestId`) y `resultado`
- **AND** las horas de una corrida van en orden y cada una está entre el momento en que la prueba lanzó la corrida y el momento en que terminó, con un margen de 2 s en las dos cosas: el reloj de la VM de Docker Desktop se reajusta solo y puede retroceder durante una corrida (design.md, Risks)
- **AND** ninguna línea tiene un JWT (`eyJ…`), un encabezado `Authorization` ni un email

#### Scenario: El registro no entra al repo

- **WHEN** se mira `.gitignore` y el árbol versionado
- **THEN** `simulator/registros/` está ignorada y no hay ningún archivo de registro versionado

#### Scenario: La hora es la de antes de mandar la petición

- **GIVEN** un servidor HTTP de la prueba que tarda 3 s en contestar `POST /auth/guest` y responde 500
- **WHEN** se corre `simulador esc-1 --mesa 1 --replica <ese servidor>`
- **THEN** la corrida termina con código 1, y la `hora` de la línea de `/auth/guest` es al menos 2 s anterior al momento en que terminó la corrida (1 s de margen por los reajustes del reloj de la VM de Docker Desktop; una hora tomada después de la respuesta queda a menos de 1 s del fin)

#### Scenario: Una respuesta exitosa con otra forma también deja su línea

- **GIVEN** un servidor HTTP de la prueba que responde 201 a `POST /auth/guest` con un cuerpo sin `access_token` ni `user`
- **WHEN** se corre `simulador esc-1 --mesa 1 --replica <ese servidor>`
- **THEN** la corrida termina con código 1, con un mensaje en stderr que nombra `esc-1`, la petición y lo que le falta a la respuesta
- **AND** el registro tiene la línea de `/auth/guest` con `estado: 201`, `resultado: "rechazada"` y un `mensaje` que dice lo que falta, y ninguna línea después

### Requirement: Una petición rechazada termina el escenario con un error explícito

Una petición que la réplica rechaza, o que no responde, SHALL terminar el escenario en ese punto, con un error explícito y su línea en el registro. El simulador no SHALL reintentarla (RNF-6).

Origen: paso 6 del ticket ("Hacer que una petición rechazada termine el escenario con un error explícito y quede en el registro") y la Definition of Done de Backend ("Los errores se manejan … nunca en silencio").

#### Scenario: Una mesa que no existe

- **WHEN** se corre `simulador esc-1 --mesa 99`
- **THEN** la corrida termina con código 1 y un mensaje en stderr que nombra `esc-1`, la petición `/join`, el código 404 y el mensaje de la réplica
- **AND** el registro tiene la línea de `/auth/guest` con `resultado: "ok"` y la de `/join` con `estado: 404` y `resultado: "rechazada"`, una sola vez, y ninguna línea después

### Requirement: Criterios extra del humano para TK-03

Origen: los criterios extra que el humano pidió para este ticket, además de la DoD.

- El riesgo técnico del skeleton SHALL probarse primero: un invitado de `POST /auth/guest` se une a una mesa libre y la mesa aparece en T05. Lo cubre el scenario "Riesgo técnico" de la entrada de `/join` en la spec `contrato-replica`, que es la primera tarea de `tasks.md`.
- Con la réplica cargada desde cero, ESC-1, ESC-2 y ESC-5 SHALL correrse desde la línea de comandos, y T16 y T17 SHALL llegar por `/sse/waiters`.

#### Scenario: Con la réplica cargada desde cero, los tres escenarios corren y T16 y T17 llegan por `/sse/waiters`

- **GIVEN** la réplica recién cargada (`carga-desde-cero.sh`) y la comprobación inicial de la suite: T05 del primer mozo del restaurante 1 devuelve `[]`
- **WHEN** corren, en orden, los scenarios de WS-c1, WS-c2 y WS-c3
- **THEN** los tres pasan: ESC-1, ESC-2 y ESC-5 se corrieron por su línea de comandos, y T16 y T17 llegaron por `/sse/waiters`
- **AND** si la base no estaba recién cargada, la suite falla antes de correr ningún escenario, con el mensaje "la suite del simulador supone una base recién cargada: corré carga-desde-cero.sh"
