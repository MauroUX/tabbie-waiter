# TK-13 · Simulador: lo que piden "Pagos"

| | |
|---|---|
| **Tipo** | Backend (réplica y simulador) |
| **Origen** | [HU-06](../historias/HU-06-solicitudes-y-cobros.md), [HU-07](../historias/HU-07-confirmar-o-eliminar-solicitud.md) y [HU-08](../historias/HU-08-cerrar-mesa.md): los escenarios del simulador que piden sus criterios (ESC-6, y la eliminación y el cierre desde otra tablet, de [componentes.md](../../architecture/componentes.md), sección 3); [seguridad.md](../../architecture/seguridad.md), sección 4.2 |

## Objetivo

Sumar al simulador lo que necesitan las pruebas de "Pagos": la solicitud sin comensal identificado, y la eliminación de una solicitud y el cierre de una mesa desde otra tablet. Construir en la réplica los endpoints que eso necesita (DP-53). Y comprobar O2 con ellos.

## Criterios heredados

- [SEG-c2](../../architecture/seguridad.md#43-criterios-nuevos) · O2: los cobros aceptan cualquier JWT, de cualquier restaurante.
- [HU-06.h3](../historias/HU-06-solicitudes-y-cobros.md#huecos) · Con dos tablets: eliminación. **En parte:** la eliminación desde otra tablet, con la cuenta del segundo mozo, mientras "Eliminar" no existe en la app ([TK-15](TK-15-confirmar-o-eliminar-solicitud.md)). El criterio completo es de [TK-14](TK-14-pagos-solicitudes.md).
- [HU-06.h4](../historias/HU-06-solicitudes-y-cobros.md#huecos) · Solicitud resuelta por otra vía. **En parte:** el cierre de la mesa desde otra tablet. El cobro que deja la mesa saldada es el de [TK-08](TK-08-simulador-ordenes.md), y el vencimiento, el del perfil de pruebas de [TK-01](TK-01-replica.md). El criterio completo es de [TK-14](TK-14-pagos-solicitudes.md).
- [HU-06.h7](../historias/HU-06-solicitudes-y-cobros.md#huecos) · Solicitud sin comensal identificado. **En parte:** ESC-6. El criterio completo es de TK-14.
- [HU-07.h5](../historias/HU-07-confirmar-o-eliminar-solicitud.md#criterios-de-aceptación) · Solicitud sin comensal identificado. **En parte:** ESC-6. El criterio completo es de [TK-15](TK-15-confirmar-o-eliminar-solicitud.md).

## Alcance

**Incluye:**

- **Los endpoints de la réplica que este ticket construye** (DP-53), en `replica/src/`, con las rutas, los cuerpos y los eventos del contexto, cada uno con su prueba del contrato y su entrada en `docs/api/openapi.yaml`, generada (DP-52):
  - T12, `POST /table-sessions/:id/pay`, con `@Roles` y sin `RolesGuard`: reproduce O2 a propósito (DP-50), y escribe los montos antes de validar `userId` (C11);
  - T13, `DELETE /payments/in-person-requests/:requestId` (J + R): borra la clave en Redis y emite `in-person-payment-request-deleted` por `/sse/waiters`, con `data: {requestId, restaurantId}` (contexto, C9).
- **ESC-6 · Pedir un cobro sin comensal identificado:** igual que ESC-5, con `userId: "guest"`, como lo hace la app del comensal cuando no encuentra a su usuario en la sesión (C11).
- **Eliminación y cierre desde otra tablet:** con la cuenta del segundo mozo del restaurante 1, como otra tablet, elimina una solicitud (T13) o cierra una mesa (T14). Los usan HU-06.h3, HU-06.h4 y HU-08.h4.
- **La comprobación de O2** (SEG-c2), desde la máquina, con un JWT de invitado y con el del mozo del restaurante 2, guardando la evidencia.
- Cada acción nueva, con su entrada en el registro del turno.

**No incluye:**

- ESC-5 y el registro del turno: ya los deja [TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md).
- El cobro manual de otra tablet: ya lo deja [TK-08](TK-08-simulador-ordenes.md).
- Las solicitudes y los cobros de MercadoPago: los pide HU-13, en la ampliación, con HU-07.c4 y HU-07.h3 (DP-38).
- La confirmación de una solicitud desde otra tablet: la pide HU-12, en la ampliación.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `replica/src/` para los endpoints y `simulator/src/`. La comprobación de O2, en `replica/tests/` (DP-14).
- **Componentes:** de la réplica ([componentes.md](../../architecture/componentes.md), sección 2), `TableSessionModule` y `PaymentModule`, en lo que nombra el alcance; del simulador (sección 3), Línea de comandos, Escenarios y Registro del turno.

## Contrato que usa

- **Endpoint del comensal:** `POST /payments/in-person-request`, que hace que la réplica emita T17.
- **Eliminación y cierre desde otra tablet**, por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T01 (inicio de sesión del segundo mozo), T13 y T14.
- **Para las comprobaciones:** T02 (JWT de invitado), T05, T06, T07, T11 y T12 (SEG-c2).
- **Lo que construye en la réplica:** T12 y T13, con el evento `in-person-payment-request-deleted`. Si al contexto le falta un dato, se marca como hueco y se resuelve con el humano: el código de Tabbie no se lee (0010).

## Requisitos de prueba del backlog

- **Una forma de crear una solicitud sin comensal identificado (RF-25), desde el simulador:** este ticket la cumple, con ESC-6.
- **Datos iniciales con dos restaurantes, y dos mozos en el primero:** usa el segundo mozo del restaurante 1 y el mozo del restaurante 2 de [TK-02](TK-02-datos-iniciales.md).

## Dependencias

- [TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md): la base del simulador y ESC-5.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de SEG-c2 y de la parte de HU-06.h3, HU-06.h4, HU-06.h7 y HU-07.h5, y una spec del contrato con una entrada por T12, T13 y su evento, tomada del contexto. El scenario de O2 dice que el hueco se reproduce a propósito (DP-50).
2. Escribir las pruebas primero, y verlas fallar: el contrato de T12, de T13 y de su evento; cada acción contra la réplica local, comprobando su efecto en T05 o T06; y la comprobación de O2.
3. Implementar T12 y T13 en `replica/src/` hasta que pasen las pruebas del contrato, y regenerar `docs/api/openapi.yaml`.
4. Escribir ESC-6.
5. Escribir la eliminación y el cierre desde otra tablet.
6. Correr SEG-c2 y guardar la evidencia. Si el hueco no se reproduce, se corrige la réplica, no el contexto (DP-50).
7. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Backend](../definition-of-done.md#backend-réplica-y-simulador).
- **Propio del ticket:**
  - La evidencia de SEG-c2 queda guardada, con solo datos sintéticos (PR-2).

## Riesgos y decisiones

- **Decidido (DP-38):** MercadoPago queda fuera del lote 1: HU-07.c4 y HU-07.h3 pasaron a HU-13, y la solicitud de MercadoPago escrita en Redis (DP-23) se escribe con la ampliación ([índice](README.md#decisiones-tomadas-2026-11-14)).
- **Contexto:** C11, `/pay` escribe los montos antes de validar `userId`; por eso ESC-6 importa para RF-25.
- **Decidido (DP-53):** este ticket construye T12 y T13, porque "Pagos" los necesita primero ([índice](README.md#decisiones-tomadas-2026-11-17)).
