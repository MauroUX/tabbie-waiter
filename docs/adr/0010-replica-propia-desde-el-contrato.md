# 0010 · Réplica propia desde el contrato

## Contexto

- 0002 hace de la réplica una copia sin cambios de `order-pay-backend` en `c18b0f7`, importada en `backend/` por el humano, y comprobada con un `diff` vacío contra una etiqueta (DP-46, DP-47).
- El contexto ya documenta lo que la app necesita del backend: las filas de la columna "Waiter App" del inventario (T01, T05 a T09, T11 a T14), los tres eventos de `/sse/waiters`, el origen de cada evento y los endpoints del comensal que usa el simulador (contexto, secciones 2, 3, 4 y 5), con los huecos O1 a O4 (sección 7).
- Una copia trae mucho más que eso (MercadoPago, archivos, módulos que la cadena del mozo no usa), y obliga a una parada del humano, a una etiqueta y a un bloqueo de escritura solo para que nadie la toque.
- La app rodea O1 a O4 con su propio comportamiento (C3, C6, C7, C11), así que la réplica tiene que dejar provocarlos.
- 0003 fija el stack del backend: NestJS 10, TypeORM, MySQL 8, Redis 7 y Node 20.
- El humano decidió reemplazar la copia por una réplica propia (DP-48 a DP-53).

## Decisión

**Réplica propia, sin oráculo (DP-48):**

- La réplica es un proyecto NestJS propio, en `replica/` (`replica/src/`, con las pruebas de contrato en `replica/tests/`). `backend/` deja de existir.
- Se construye desde el contrato y el comportamiento que documenta el contexto. El código de Tabbie no se lee: si al contexto le falta un dato, el ticket lo marca como hueco y lo resuelve con el humano.
- Las pruebas de contrato van primero y corren solo contra la réplica.
- El stack es el de 0003, ahora elegido y no heredado: NestJS 10, TypeORM, MySQL 8, Redis 7 y Node 20.
- Lo que las pruebas necesitan (vencimientos cortos, fallos provocados) se resuelve con variables de entorno, datos y el simulador. La réplica no tiene endpoints solo de prueba.
- Siguen igual: el proyecto de Firebase de Tabbie (DP-02); las pruebas por HTTP contra MySQL y Redis reales (DP-14); el JWT de mozo firmado en las pruebas (DP-15); los datos iniciales en SQL propio, que ahora se cargan cuando terminan las migraciones (DP-16); las rutas del comensal (DP-17 a DP-19); y la CI sin credenciales de Firebase (DP-43), así que la réplica arranca sin ellas.

**Alcance del contrato (DP-49):**

- Las filas de la columna "Waiter App" del inventario (T01, T05 a T09, T11 a T14), los tres eventos de `/sse/waiters` y los endpoints del comensal que necesita el simulador para originar esos eventos y los escenarios de los tickets.
- Las rutas, los cuerpos y los eventos son los del contexto.
- No se construyen T02 a T04, T10, T15 ni T18, salvo que la ruta sea también un endpoint del comensal (`POST /auth/guest`, que es la ruta de T02). No hay otra excepción, tampoco para reproducir O1 y O3 (DP-54).

**O1 a O4 se reproducen a propósito (DP-50):** son comportamiento heredado que la app rodea. Cada uno tiene su scenario y su prueba de contrato, con ese motivo escrito, y SEG-c1 a SEG-c4 los comprueban contra la réplica, en lo que la réplica construye (DP-54).

**Migraciones propias (DP-51):** migraciones de TypeORM escritas desde [modelo-de-datos.md](../architecture/modelo-de-datos.md), solo con las 13 tablas del inventario. Cada una dice cómo se deshace. `synchronize` queda desactivado.

**OpenAPI generado (DP-52):** `docs/api/openapi.yaml` se genera desde el código con `@nestjs/swagger` y se contrasta con las specs de `openspec/`. Las pruebas de contrato validan las respuestas contra él, y la CI falla si el generado difiere del commiteado. Los campos sensibles siguen marcados `x-sensitive: true`.

**Reparto (DP-53):** TK-01 deja la réplica base (el proyecto, las migraciones, el inicio de sesión de T01 con Firebase y los guards, las mesas activas de T05 y el stream `/sse/waiters` con el JWT en el encabezado, 0008). Cada endpoint restante entra en el ticket de Backend de su grupo que lo necesita primero: TK-03, TK-08 o TK-13.

**Qué reemplaza:**

- De 0002, la parte que hace de la réplica una copia sin cambios de `c18b0f7` y la predicción del límite. El simulador, el proyecto de Firebase y los datos iniciales propios siguen como dice 0002.
- **La predicción del límite pasa a ser una intención:** "la app pasa al backend real cambiando solo la URL base". La réplica no tiene que ser 100 % igual a Tabbie. Las diferencias aparecen al conectar la app con el backend real, y se ajustan entonces. Es un riesgo aceptado.

## Estado

Aceptado.

## Consecuencias

- La réplica tiene solo lo que la cadena del mozo y el simulador usan: no tiene MercadoPago, archivos ni seeder, y arranca sin esas variables.
- O1 a O4 se reproducen a propósito. Una réplica que "arregla" un hueco rompe el contrato que la app rodea, y sus pruebas lo detectan. Si un hueco no se reproduce, se corrige la réplica, no la observación del contexto.
- SEG-c1 a SEG-c4 comprueban la réplica. Que el backend real tiene O1 a O4 sigue siendo lo observado en su código (contexto, sección 7).
- **La réplica diverge a propósito en `/attend` (DP-54):** en Tabbie responde 500 (O1); en la réplica no existe, porque la app no lo llama (C7). De O1, SEG-c1 comprueba que la ayuda no se apaga; de O3, SEG-c3 comprueba el cierre sin JWT. La lectura de los pedidos y la escucha de los eventos de una sesión sin JWT siguen documentadas como huecos de Tabbie (contexto, sección 7), pero la réplica no las tiene.
- Lo que 0008 comprueba contra la réplica (el JWT del stream en el encabezado) vale para la réplica. Para el backend real se apoya en el contexto (sección 0), y se confirma al conectar.
- El esquema sale de migraciones propias, que cada ticket de Backend que cambia una tabla tiene que escribir con su vuelta atrás.
- El contrato se genera desde el código, así que un cambio de ruta, cuerpo o evento se ve en el diff de `openapi.yaml`. Un cambio así que el ticket no pide es un hallazgo crítico de la revisión adversarial.
- No hay parada del humano para importar código, ni etiqueta `backend-base`, ni bloqueo de escritura en `backend/`: DP-46 y DP-47 quedan obsoletas.
- 0009 ya no publica código de Tabbie: el repo publica la descripción de O1 a O4 y una réplica propia que los reproduce, no el código de `order-pay-backend`.
- El riesgo nuevo: la app puede no funcionar igual contra el backend real. Se mitiga con lo que el contexto documenta del código y con la prueba de punta a punta al conectar.
- Fuente: decisión del humano en la revisión de la réplica (DP-48 a DP-53), corregida en una segunda revisión (DP-54).
