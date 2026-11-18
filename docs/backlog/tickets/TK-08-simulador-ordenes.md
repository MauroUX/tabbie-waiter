# TK-08 · Simulador: lo que piden "Órdenes" y el inicio de sesión

| | |
|---|---|
| **Tipo** | Backend (réplica y simulador) |
| **Origen** | [HU-02](../historias/HU-02-mesas-activas.md), [HU-01](../historias/HU-01-iniciar-sesion.md) y [HU-04](../historias/HU-04-cocina-y-cancelacion.md): los escenarios del simulador que piden sus criterios (ESC-4, ESC-7, ESC-8 y los cobros de otra tablet, de [componentes.md](../../architecture/componentes.md), sección 3); [seguridad.md](../../architecture/seguridad.md), sección 4.2 |

## Objetivo

Sumar al simulador lo que necesitan las pruebas de "Órdenes", del inicio de sesión y de mandar a cocina: el pedido de ayuda, la cancelación del comensal, los pedidos en el segundo restaurante y los cobros que registra otra tablet. Construir en la réplica los endpoints que eso necesita (DP-53). Y comprobar con ellos O1, O3 y O4.

## Criterios heredados

- [SEG-c1](../../architecture/seguridad.md#43-criterios-nuevos) · O1: "Atendido" falla y la ayuda no se apaga.
- [SEG-c3](../../architecture/seguridad.md#43-criterios-nuevos) · O3: cerrar, leer y escuchar una sesión sin JWT.
- [SEG-c4](../../architecture/seguridad.md#43-criterios-nuevos) · O4: emails y credenciales del restaurante en las mesas activas.
- [HU-02.c4](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Datos de la tarjeta. **En parte:** dos comensales, $2000 pagados con un cobro de otra tablet y el pedido de ayuda (ESC-4). El criterio completo es de [TK-10](TK-10-tarjeta-y-cronometro.md).
- [HU-02.h4](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · El cronómetro desaparece al saldar. **En parte:** el cobro de otra tablet que salda la mesa. El criterio completo es de TK-10.
- [HU-02.h7](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Aislamiento. **En parte:** mesas ocupadas en el restaurante 2 (ESC-8). El criterio completo es de [TK-09](TK-09-ordenes.md).
- [HU-02.h8](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · El comensal cancela un pedido. **En parte:** ESC-7 y su efecto en T05. El criterio completo es de TK-09.
- [HU-01.h6](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · Solo su restaurante. **En parte:** mesas ocupadas en el restaurante 2 (ESC-8). El criterio completo es de [TK-11](TK-11-inicio-de-sesion.md).
- [HU-04.h2](../historias/HU-04-cocina-y-cancelacion.md#huecos) · Envío a medias. **En parte:** el fallo de negocio en el dispositivo: ESC-7 cancela uno de los pedidos justo antes del envío, y la réplica rechaza ese y acepta los demás. El criterio completo es de [TK-12](TK-12-mandar-a-cocina.md).

## Alcance

**Incluye:**

- **Los endpoints de la réplica que este ticket construye** (DP-53), en `replica/src/`, con las rutas, los cuerpos y los eventos del contexto, cada uno con su prueba del contrato y su entrada en `docs/api/openapi.yaml`, generada (DP-52):
  - T08, `PUT /orders/:id/send-to-kitchen` (J + R; el pedido tiene que ser del restaurante del usuario): pasa el pedido a `in_kitchen` y fija `sentToKitchenAt`;
  - T09, `PUT /orders/:id/cancel` (J, sin `@Roles`; el rol se evalúa en el servicio), con `reason` en la raíz del body: la misma ruta cancela como mozo y como comensal (DP-19, C6);
  - T11, `POST /table-sessions/:id/add-payment`, con `@Roles` y sin `RolesGuard`: reproduce O2 a propósito (DP-50);
  - T14, `PATCH /table-sessions/close/:id`, sin guard: reproduce O3 a propósito (DP-50);
  - `PUT /table-sessions/:id/request-help`: pone `requestingHelp` en `true`, y nada lo vuelve a `false` (O1);
  - **solo para reproducir O1 y O3** (DP-49, excepción; DP-50): T10, `PUT /table-sessions/:id/attend`, sin guard, que responde 500 y no apaga la ayuda; T04, `GET /table-sessions/:id/orders`, sin guard, con los pedidos y el email de los comensales; y T18, `GET /table-sessions/:id/subscribe`, sin guard y sin mirar el `token`, con el `table-session-events` de un pedido confirmado. Ninguno lo usa la app.
- **ESC-4 · Pedir ayuda** en la mesa del comensal.
- **ESC-7 · Cancelar un pedido:** el comensal cancela un pedido `pending` o `confirmed` con `PUT /orders/:id/cancel` (DP-19). La línea de comandos permite cancelar un pedido dado en el momento en que la prueba lo pide, "justo antes de la acción del mozo" ([infraestructura.md](../../architecture/infraestructura.md), sección 4).
- **ESC-8 · Pedido en el otro restaurante:** ESC-1 y ESC-2 en el restaurante 2.
- **Cobros de otra tablet:** con la cuenta del segundo mozo del restaurante 1, como otra tablet, un cobro manual por un monto (T11) que deja lo pagado de la mesa en un valor dado, la salda o la deja a $0,01 del total. HU-02.c4 pide $2000 pagados y HU-02.h4 una mesa saldada; HU-06.h4, HU-08.c2 y HU-08.h7 usan lo mismo más adelante.
- **Comensales con cuenta, solo para SEG-c3 y SEG-c4** (DP-36): el simulador inicia sesión por T01 con la cuenta de comensal sin restaurante y con la cuenta que no es de mozo, que tiene el restaurante 1, de [TK-02](TK-02-datos-iniciales.md), y con ellas ocupa la mesa y confirma el pedido. Para todo lo demás, el comensal sigue entrando como invitado (DP-17).
- **Las comprobaciones de O1, O3 y O4** (SEG-c1, SEG-c3 y SEG-c4), desde la máquina, con un cliente HTTP y el simulador, sin la app. Las peticiones y respuestas de cada corrida se guardan como evidencia ([seguridad.md](../../architecture/seguridad.md), sección 4.2).
- Cada acción nueva, con su entrada en el registro del turno.

**No incluye:**

- ESC-1, ESC-2, ESC-5, la sesión del comensal y el registro del turno: ya los deja [TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md).
- ESC-6, la solicitud de MercadoPago, el cierre desde otra tablet y la comprobación de O2: [TK-13](TK-13-simulador-pagos.md).
- La confirmación de una solicitud desde otra tablet, que pide HU-12.h3: va en la ampliación.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `replica/src/` para los endpoints y `simulator/src/`. Las comprobaciones de O1, O3 y O4, en `replica/tests/` (DP-14).
- **Componentes:** de la réplica ([componentes.md](../../architecture/componentes.md), sección 2), `OrderModule` y `TableSessionModule`, en lo que nombra el alcance; del simulador (sección 3), Línea de comandos, Escenarios y Registro del turno. Para los cobros de otra tablet, el simulador inicia sesión con la cuenta del segundo mozo.

## Contrato que usa

- **Endpoints del comensal**, por su ruta ([componentes.md](../../architecture/componentes.md), sección 3): `PUT /table-sessions/:id/request-help` y `PUT /orders/:id/cancel`, además de los de ESC-1 y ESC-2.
- **Cobros de otra tablet**, por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T01 (inicio de sesión del segundo mozo) y T11.
- **Para las comprobaciones:** T05 (con el JWT del primer mozo del restaurante 1), T10 (SEG-c1), T04, T18 y T14 (SEG-c3); T08 y T09 sobre el pedido cancelado por el comensal (C5, C6).
- **Lo que construye en la réplica:** T08, T09, T10, T11, T14, T04, T18 y `PUT /table-sessions/:id/request-help`. Si al contexto le falta un dato (por ejemplo, el código con que la réplica rechaza mandar a cocina un pedido cancelado), se marca como hueco y se resuelve con el humano: el código de Tabbie no se lee (0010).

## Requisitos de prueba del backlog

- **Una forma de provocar fallos parciales al mandar a cocina:** la parte de los fallos de negocio. "La app todavía lo muestra, y el backend rechaza ese pedido y acepta los demás, porque la app manda una petición por pedido, y un pedido ya cancelado no se puede cancelar ni mandar a cocina" ([infraestructura.md](../../architecture/infraestructura.md), sección 4).
- **Datos iniciales con dos restaurantes, y dos mozos en el primero:** usa el restaurante 2 y el segundo mozo del restaurante 1 de [TK-02](TK-02-datos-iniciales.md).

## Dependencias

- [TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md): la base del simulador, ESC-1 y ESC-2.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de SEG-c1, SEG-c3, SEG-c4 y de la parte de los criterios de HU-01, HU-02 y HU-04, y una spec del contrato con una entrada por cada endpoint que construye, tomada del contexto. Los scenarios de O1 y O3 dicen que el hueco se reproduce a propósito (DP-50).
2. Escribir las pruebas primero, y verlas fallar: el contrato de cada endpoint nuevo (incluido que el invitado unido a la mesa pide ayuda con `PUT /table-sessions/:id/request-help` y cancela con `PUT /orders/:id/cancel`, DP-18, DP-19); cada acción contra la réplica local, comprobando su efecto en T05; T08 y T09 sobre una mesa con un pedido cancelado por el comensal y otro no; y las tres comprobaciones de seguridad.
3. Implementar los endpoints en `replica/src/` hasta que pasen las pruebas del contrato, y regenerar `docs/api/openapi.yaml`.
4. Escribir ESC-4, ESC-7 con la cancelación a pedido de la prueba, y ESC-8.
5. Escribir los cobros de otra tablet: el inicio de sesión del segundo mozo y el cobro manual por un monto dado.
6. Correr SEG-c1, SEG-c3 y SEG-c4 y guardar la evidencia. Si un hueco no se reproduce, se corrige la réplica, no el contexto (DP-50).
7. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Backend](../definition-of-done.md#backend-réplica-y-simulador).
- **Propio del ticket:**
  - Una cancelación que la réplica rechaza, por ejemplo de un pedido `in_kitchen`, termina el escenario con un error explícito.
  - El cobro de otra tablet deja en T05 lo pagado que se pidió.
  - La evidencia de SEG-c1, SEG-c3 y SEG-c4 queda guardada, con solo datos sintéticos (PR-2).

## Riesgos y decisiones

- **Decidido (DP-19):** el comensal cancela con `PUT /orders/:id/cancel`, con `JwtAuthGuard` y sin restricción de rol, la misma ruta que T09 ([componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14)).
- **Decidido (DP-49, DP-50 y DP-53):** este ticket construye los endpoints que "Órdenes" necesita primero, y T04, T10 y T18 solo en lo que reproduce O1 y O3, porque SEG-c1 y SEG-c3 los usan ([índice](README.md#decisiones-tomadas-2026-11-17)).
- **Decidido (DP-14):** las comprobaciones de O1 a O4 viven en `replica/tests/`.
- **Decidido (DP-36):** SEG-c3 y SEG-c4 usan las dos cuentas de comensal de TK-02, porque el invitado no tiene email ni restaurante ([índice](README.md#decisiones-tomadas-2026-11-14)).
