# TK-03 · Simulador: ocupar mesas, confirmar pedidos y pedir cobros

| | |
|---|---|
| **Tipo** | Backend (réplica y simulador) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Simulador" en el alcance (ESC-1, ESC-2 y ESC-5) y el riesgo técnico "Unirse a la mesa y autenticar al comensal"; [componentes.md](../../architecture/componentes.md), sección 3 |

## Objetivo

Tener el simulador de comensales con lo mínimo que piden los criterios del skeleton: ocupar mesas, confirmar pedidos y pedir cobros presenciales, con la hora de cada petición en el registro del turno. Y construir en la réplica los endpoints que esos escenarios y el skeleton necesitan (DP-53).

## Criterios heredados

- [WS-c1](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app arranca contra la réplica. **En parte:** las dos mesas ocupadas del restaurante 1 (ESC-1). El criterio completo es de [TK-05](TK-05-eventos-y-consulta-periodica.md).
- [WS-c2](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Un pedido confirmado llega por evento. **En parte:** ESC-2 y su hora en el registro del turno. El criterio completo es de TK-05.
- [WS-c3](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Una solicitud de cobro presencial llega por evento. **En parte:** ESC-5 y su hora en el registro del turno. El criterio completo es de TK-05.

## Alcance

**Incluye:**

- **Los endpoints de la réplica que este ticket construye** (DP-53), en `replica/src/`, con las rutas, los cuerpos y los eventos del contexto, cada uno con su prueba del contrato y su entrada en `docs/api/openapi.yaml`, generada (DP-52):
  - `POST /auth/guest` (la ruta de T02): el JWT de invitado, con rol `user` y sin Firebase (DP-17);
  - `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber`, sin guard y con el comensal en el body: la mesa pasa a estar activa (DP-18);
  - `POST /orders`: el pedido nace `pending` (contexto, sección 4);
  - `PUT /orders/:id/confirm` (J + R, `admin` y `user`): fija `confirmedAt` y emite `order-confirmed-notification` (T16) por `/sse/waiters`;
  - `POST /payments/in-person-request` (J): guarda la solicitud en Redis con el vencimiento `REDIS_EXPIRATION_TIME` y emite `in-person-payment-request` (T17) (contexto, sección 3.3);
  - T06, `GET /payments/in-person-requests`: lo usan las comprobaciones de este ticket;
  - T07, `GET /table-sessions/:id/payments`, con `@Roles` y sin `RolesGuard`, como en el contexto: reproduce O2 a propósito (DP-50). Lo consulta la app desde [TK-05](TK-05-eventos-y-consulta-periodica.md).

**Incluye** también los componentes del simulador de [componentes.md](../../architecture/componentes.md), sección 3:

- **Línea de comandos:** elige el escenario y sus parámetros: restaurante, mesa, cantidad de comensales y de pedidos, montos.
- **Sesión del comensal:** obtiene el JWT con que el comensal llama a la réplica: entra como invitado, con `POST /auth/guest` y un `guestId` generado (DP-17).
- **Cliente HTTP del comensal:** llama a la URL de la réplica.
- **Escenarios:**
  - **ESC-1 · Ocupar una mesa:** uno o más comensales se unen a una mesa libre, que pasa a estar activa, con `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber` (DP-18). HU-02.c4 pide dos comensales en una mesa;
  - **ESC-2 · Confirmar un pedido:** crea un pedido con productos del menú y lo confirma;
  - **ESC-5 · Pedir un cobro presencial:** el comensal pide pagar en persona, con `POS` o `Cash`, un monto con o sin propina, y opcionalmente los pedidos o las líneas que cubre.
- **Registro del turno:** guarda lo que pidió el simulador, con la mesa, el comensal y la hora en que mandó cada petición. Es el "desde cuándo" de las mediciones del skeleton (sección 4).

**No incluye:**

- ESC-4, ESC-7, ESC-8 y los cobros de otra tablet: [TK-08](TK-08-simulador-ordenes.md).
- ESC-6, la solicitud de MercadoPago y el cierre desde otra tablet: [TK-13](TK-13-simulador-pagos.md).
- Las comprobaciones de O1 a O4: TK-08 y TK-13.
- ESC-3 y ESC-9 a ESC-11, y la medición de M-1 a M-3: van en la ampliación.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `replica/src/` para los endpoints y `simulator/src/`. Las pruebas a nivel de la réplica, en `replica/tests/` (DP-14).
- **Componentes:** de la réplica ([componentes.md](../../architecture/componentes.md), sección 2), `AuthModule`, `TableSessionModule`, `OrderModule` y `PaymentModule`, en lo que nombra el alcance; del simulador (sección 3), Línea de comandos, Sesión del comensal, Cliente HTTP del comensal, Escenarios y Registro del turno.

## Contrato que usa

- **Endpoints del comensal**, por su ruta ([componentes.md](../../architecture/componentes.md), sección 3; contexto, "Endpoints del comensal que usa el simulador"): `POST /auth/guest`, `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber`, `POST /orders`, `PUT /orders/:id/confirm` y `POST /payments/in-person-request`.
- **Para las comprobaciones**, por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T05 y T06, con el JWT del primer mozo del restaurante 1.
- **Eventos:** ESC-2 hace que la réplica emita T16, y ESC-5, T17.
- **Lo que construye en la réplica:** los endpoints del comensal de arriba, y T06 y T07 por su fila. Si al contexto le falta un dato (por ejemplo, el cuerpo de `POST /orders` o la respuesta de `/join`), se marca como hueco y se resuelve con el humano: el código de Tabbie no se lee (0010).

## Requisitos de prueba del backlog

Ninguno de la lista del backlog. Usa los restaurantes, las mesas y el menú de [TK-02](TK-02-datos-iniciales.md).

## Dependencias

- [TK-02](TK-02-datos-iniciales.md): los restaurantes, las mesas, el menú y las cuentas.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de la parte de WS-c1, WS-c2 y WS-c3, y una spec del contrato con una entrada por cada endpoint que construye, tomada del contexto.
2. Escribir las pruebas primero, y verlas fallar: el contrato de cada endpoint nuevo, incluido el riesgo técnico (un invitado de `POST /auth/guest` se une a la mesa con `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber`, DP-17, DP-18), y cada escenario contra la réplica local, comprobando su efecto en T05 o T06.
3. Implementar los endpoints en `replica/src/` hasta que pasen las pruebas del contrato, y regenerar `docs/api/openapi.yaml`.
4. Armar la línea de comandos, la sesión y el cliente HTTP del comensal.
5. Escribir ESC-1, ESC-2 y ESC-5, cada uno con su entrada en el registro del turno.
6. Hacer que una petición rechazada termine el escenario con un error explícito y quede en el registro.
7. Documentar cómo se corre el simulador en [infraestructura.md](../../architecture/infraestructura.md), y corregir [componentes.md](../../architecture/componentes.md) si los endpoints quedaron distintos de lo que dicen DP-17 y DP-18.
8. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Backend](../definition-of-done.md#backend-réplica-y-simulador).
- **Propio del ticket:**
  - Cada escenario se corre desde la línea de comandos con sus parámetros, sin tocar código.
  - El registro del turno tiene, de cada petición, la mesa, el comensal y la hora, en el reloj de la máquina.

## Riesgos y decisiones

- **Riesgo técnico del skeleton** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 6.1): "Unirse a la mesa y autenticar al comensal … Sin esto no hay ESC-1".
- **Decidido (DP-17 y DP-18):** el comensal entra como invitado, con `POST /auth/guest`, y se une a la mesa con `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber`. Los dos los construye este ticket en la réplica ([componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14)).
- **Decidido (DP-53):** este ticket construye los endpoints del comensal del skeleton, y T06 y T07, porque el skeleton los necesita primero ([índice](README.md#decisiones-tomadas-2026-11-17)).
- **Contexto:** `POST /table-sessions/join/...` no tiene guard; el comensal va en el body (contexto, "Endpoints del comensal que usa el simulador").
