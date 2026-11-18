# Réplica

- **La réplica es propia (0010, DP-48):** un proyecto NestJS en `replica/src/`, con el stack de 0003. No es una copia: se construye desde el contrato y el comportamiento del contexto (`docs/context/panel-mozos-actual.md`, secciones 0 a 5 y 7).
  - **El código de Tabbie no se lee,** ni para confirmar nada. Si al contexto le falta un dato del contrato, se marca como hueco y lo resuelve el humano.
  - **Solo lo de DP-49:** las filas de la columna "Waiter App" del inventario, los tres eventos de `/sse/waiters` y los endpoints del comensal que usa el simulador. Cada uno lo construye el ticket del reparto de DP-53 (`docs/backlog/tickets/README.md`).
  - **O1 a O4 se reproducen a propósito (DP-50):** cada uno con su scenario y su prueba de contrato, que dicen ese motivo. Si uno no se reproduce, se corrige la réplica.
  - **Sin endpoints solo de prueba:** los vencimientos cortos y los fallos provocados salen de variables de entorno, datos y el simulador.
- **El esquema sale de las migraciones** de TypeORM en `replica/src/migrations/`, escritas desde `docs/architecture/modelo-de-datos.md`, con `synchronize` desactivado. Cada una dice cómo se deshace (DP-51).
- **Las pruebas** son Jest + Supertest, por HTTP contra la réplica levantada con Docker Compose, con MySQL y Redis reales, en `replica/tests/` (DP-14). Se escriben primero y corren solo contra la réplica.
- **`docs/api/openapi.yaml` se genera** desde el código con `@nestjs/swagger`, con los campos sensibles marcados `x-sensitive: true`. Las pruebas de contrato validan las respuestas contra él, y la CI falla si el generado difiere del commiteado (DP-52).
- **La CI corre sin Firebase** (DP-43): la réplica arranca con `USE_FIREBASE` desactivada y JWT firmados con un `JWT_SECRET` de prueba.
