# TK-04 · Simulador: solicitudes de cobro, cobros de otra tablet y el otro restaurante

| | |
|---|---|
| **Tipo** | Backend (réplica y simulador) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Simulador" en el alcance (ESC-5, el cobro con la cuenta del segundo mozo y la solicitud de MercadoPago en Redis) y el riesgo técnico "La solicitud de MercadoPago escrita a mano"; ESC-8 de [componentes.md](../../architecture/componentes.md); [seguridad.md](../../architecture/seguridad.md), sección 4.2 |

## Objetivo

Sumar al simulador las solicitudes de cobro presencial, los cobros que registra otra tablet, las solicitudes de MercadoPago y los pedidos en el segundo restaurante, y comprobar O2 con ellos.

## Criterios heredados

- [SEG-c2](../../architecture/seguridad.md#43-criterios-nuevos) · O2: los cobros aceptan cualquier JWT, de cualquier restaurante.
- [WS-c3](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Una solicitud de cobro presencial llega por evento. **En parte:** ESC-5 y su hora en el registro del turno. El criterio completo es de [TK-06](TK-06-eventos-y-consulta-periodica.md).
- [WS-c4](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Los cambios que no emiten evento llegan por la consulta periódica. **En parte:** el cobro manual con la cuenta del segundo mozo y la solicitud de MercadoPago escrita en Redis. El criterio completo es de TK-06.
- [WS-c8](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Lo emitido durante un corte aparece después. **En parte:** la solicitud y el cobro que el simulador genera durante el corte. El criterio completo es de [TK-07](TK-07-cortes-y-recuperacion.md).
- [HU-04.h7](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Cobro que llega durante la selección. **En parte:** el cobro que recibe el pedido "desde otro lugar". El criterio completo es de [TK-17](TK-17-cancelar-pedidos.md).

## Alcance

**Incluye:**

- **ESC-5 · Pedir un cobro presencial:** el comensal pide pagar en persona, con `POS` o `Cash`, un monto con o sin propina, y opcionalmente los pedidos o las líneas que cubre.
- **Cobros de otra tablet**, con la cuenta del segundo mozo del restaurante 1, "como si fuera otra tablet" (skeleton, sección 2):
  - un cobro manual por un monto (T11), que deja lo pagado de la mesa en un valor dado o la salda; HU-02.c4 pide $2000 pagados y HU-02.h4 una mesa saldada;
  - la confirmación de una solicitud de ESC-5 que cubre las líneas de un pedido (T12), que deja ese pedido con algo cobrado, para HU-04.h7.
- **Solicitud de MercadoPago:** escrita directo en Redis, con la clave y el formato que usa la copia (`mp-<userId>-<sessionId>-<timestamp>`, `method = 'Mercadopago'`; [modelo-de-datos.md](../../architecture/modelo-de-datos.md), sección 3.1), así no se toca el código de la réplica (0002). Vence a los 60 s.
- **ESC-8 · Pedido en el otro restaurante:** ESC-1 y ESC-2 en el restaurante 2, para HU-01.h6 y HU-02.h7.
- **La comprobación de O2** (SEG-c2), desde la máquina, con un JWT de invitado y con el del mozo del restaurante 2, guardando la evidencia.
- Cada acción nueva, con su entrada en el registro del turno.

**No incluye:**

- ESC-1, ESC-2, ESC-4, la sesión del comensal y el registro del turno: ya los deja [TK-03](TK-03-simulador-mesas-y-pedidos.md).
- ESC-6, la solicitud sin comensal identificado: la piden HU-06 y HU-07, fuera de esta descomposición.
- Los cobros de MercadoPago y el webhook: siguen pendientes y no los pide ningún criterio de esta descomposición.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `simulator/src/`. La comprobación de O2, donde se decida que viven las pruebas de integración de la réplica.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 3): Línea de comandos, Escenarios y Registro del turno. Para los cobros de otra tablet, el simulador inicia sesión con la cuenta del segundo mozo.

## Contrato que usa

- **Endpoint del comensal:** `POST /payments/in-person-request`, que hace que la réplica emita T17.
- **Cobros de otra tablet**, por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T01 (inicio de sesión del segundo mozo), T11 y T12.
- **Para las comprobaciones:** T02 (JWT de invitado), T05, T06, T07, T11 y T12 (SEG-c2).
- **Redis:** la clave `in-person-request:restaurant-<restaurantId>:<requestId>` ([modelo-de-datos.md](../../architecture/modelo-de-datos.md), sección 3.1).

## Requisitos de prueba del backlog

- **Datos iniciales con dos restaurantes, y dos mozos en el primero:** usa el segundo mozo del restaurante 1 y el restaurante 2 de [TK-02](TK-02-datos-iniciales.md).

## Dependencias

- [TK-03](TK-03-simulador-mesas-y-pedidos.md): la base del simulador, ESC-1 y ESC-2.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de SEG-c2 y de la parte de WS-c3, WS-c4, WS-c8 y HU-04.h7.
2. Escribir las pruebas primero, y verlas fallar: cada acción contra la réplica local, comprobando su efecto en T05, T06 o T07, y la comprobación de O2.
3. Escribir ESC-5.
4. Escribir los cobros de otra tablet: el inicio de sesión del segundo mozo, el cobro manual y la confirmación de una solicitud con sus líneas.
5. Generar una solicitud de MercadoPago con la copia y compararla con la escrita a mano; ajustar el formato hasta que T06 la devuelva igual.
6. Escribir ESC-8.
7. Correr SEG-c2 y guardar la evidencia. Si el hueco no se reproduce, corregir la observación del contexto y revisar RA-2 en [seguridad.md](../../architecture/seguridad.md).
8. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Backend](../definition-of-done.md#backend-réplica-y-simulador).
- **Propio del ticket:**
  - T06 devuelve la solicitud de MercadoPago escrita a mano igual que una generada por la copia, dentro de sus 60 s.
  - El cobro de otra tablet deja en T05 lo pagado que se pidió, y la confirmación deja `quantityPaid > 0` en las líneas del pedido.
  - La evidencia de SEG-c2 queda guardada, con solo datos sintéticos (PR-2).

## Riesgos y decisiones pendientes

- **Riesgo técnico del skeleton:** "La solicitud de MercadoPago escrita a mano: … Si el formato no coincide, la réplica no la devuelve en T06" ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 6).
- **Pendiente:** "MercadoPago (HU-06.h2, HU-06.h8): … Falta decidir cómo se generan, en las pruebas, las solicitudes y los cobros de MercadoPago" ([componentes.md](../../architecture/componentes.md)). Este ticket genera solo la solicitud, como pide el skeleton.
- **Pendiente:** si la confirmación con la cuenta del segundo mozo es el "cobro del comensal" con que el backlog prueba HU-04.h7 ([índice](README.md#decisiones-pendientes)).
- **Pendiente:** dónde viven las pruebas de integración de la réplica ([índice](README.md#decisiones-pendientes)).
