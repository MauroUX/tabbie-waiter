# TK-15 · Confirmar o eliminar una solicitud de cobro

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [HU-07](../historias/HU-07-confirmar-o-eliminar-solicitud.md) · Confirmar o eliminar una solicitud de cobro (RF-24, RF-25, RF-26) |
| **Wireframe** | [`docs/design/pagos.png`](../../design/pagos.png) (DP-10; todavía no existe), el ítem y el diálogo de confirmación |

## Objetivo

Que el mozo confirme las solicitudes de cobro que cobra en persona, con un diálogo que muestra qué está confirmando, y elimine las que no corresponden, sin que un cobro se registre dos veces.

## Criterios heredados

- [HU-07.c1](../historias/HU-07-confirmar-o-eliminar-solicitud.md#criterios-de-aceptación) · Diálogo de confirmación.
- [HU-07.c2](../historias/HU-07-confirmar-o-eliminar-solicitud.md#criterios-de-aceptación) · Confirmar el pago. "El ítem queda marcado como pagado" se comprueba con HU-13, en la ampliación; acá se comprueba que lo pagado de la mesa sube y que la solicitud deja de verse (DP-38).
- [HU-07.c3](../historias/HU-07-confirmar-o-eliminar-solicitud.md#criterios-de-aceptación) · Eliminar una solicitud.
- [HU-07.h1](../historias/HU-07-confirmar-o-eliminar-solicitud.md#criterios-de-aceptación) · Confirmar o eliminar falla.
- [HU-07.h2](../historias/HU-07-confirmar-o-eliminar-solicitud.md#criterios-de-aceptación) · Con dos tablets: la misma solicitud se confirma en las dos.
- [HU-07.h4](../historias/HU-07-confirmar-o-eliminar-solicitud.md#criterios-de-aceptación) · Cancelar el diálogo.
- [HU-07.h5](../historias/HU-07-confirmar-o-eliminar-solicitud.md#criterios-de-aceptación) · Solicitud sin comensal identificado.

## Alcance

**Incluye:**

- **"Confirmar pago"** en el ítem de cada solicitud presencial que identifica al comensal (RF-24).
- **El diálogo de confirmación** (RNF-9): el comensal, el monto, la propina y el tipo de pago de la solicitud; se puede cancelar sin cambiar nada (HU-07.h4).
- **Confirmar** (T12), con las reglas comunes de Acciones de [TK-12](TK-12-mandar-a-cocina.md):
  - **revisión previa:** revisa que la solicitud siga en T06 antes de confirmar; si ya no está, avisa y no confirma (HU-07.h2);
  - **bloqueo, sin reintentos y actualización posterior**, como en TK-12.
- **Solicitud sin comensal identificado** (RF-25): no la confirma, y explica que se registre el monto como cobro manual y después se elimine la solicitud (backlog, "Solicitud que no identifica al comensal").
- **"Eliminar"** (T13) en todas las solicitudes que muestra "Pagos", sin confirmación (RF-26, HU-07.c3).
- **El resultado:** si la acción falla o no responde, la app avisa, no la repite y actualiza mesas y solicitudes antes de dejar intentarla de nuevo (HU-07.h1).

**No incluye:**

- El cobro manual que sugiere RF-25: HU-05, en la ampliación.
- La lista de cobros registrados de cada mesa y las solicitudes de MercadoPago, con HU-07.c4 y HU-07.h3: HU-13, en la ampliación (DP-38).
- "Cerrar mesa": [TK-16](TK-16-cerrar-mesa.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `cobros/`, donde viven "Pagos" y sus acciones, con sus pruebas. Usa, sin cambiarlos, el cliente de `comun/red/` y las reglas comunes de Acciones.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Acciones ("Confirmar una solicitud" y "Eliminar una solicitud"), Pantalla "Pagos", Cobros y Salón (actualización).
- **Wireframe:** [`docs/design/pagos.png`](../../design/pagos.png).

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T12 (confirmar), T13 (eliminar), T06 (revisión previa y actualización) y T05 (actualización de mesas).

## Requisitos de prueba del backlog

- **Una forma de crear una solicitud sin comensal identificado:** ESC-6, de [TK-13](TK-13-simulador-pagos.md), para HU-07.h5.
- **El montaje de dos tablets:** HU-07.h2 se prueba con dos tablets, con los dos mozos del restaurante 1 de [TK-02](TK-02-datos-iniciales.md).

## Dependencias

- [TK-14](TK-14-pagos-solicitudes.md): "Pagos" con sus ítems.
- [TK-12](TK-12-mandar-a-cocina.md): las reglas comunes de Acciones.
- [TK-07](TK-07-cliente-de-acciones.md): el cliente de las acciones.
- [TK-13](TK-13-simulador-pagos.md): ESC-6.

## Pasos

1. Crear el cambio de OpenSpec, con un scenario por cada criterio heredado, con T12, T13 y las respuestas de la réplica.
2. Escribir las pruebas primero, y verlas fallar:
   - **locales**, de Acciones con MockWebServer: confirmar, eliminar, la falla y la falta de respuesta, y la solicitud que ya no está en la revisión previa;
   - **en el dispositivo**, contra la réplica local: HU-07.c1 a HU-07.c3, HU-07.h4 y HU-07.h5; HU-07.h2 con dos tablets.
3. Escribir "Confirmar pago" con su diálogo y su revisión previa.
4. Escribir la regla de RF-25 para la solicitud sin comensal identificado.
5. Escribir "Eliminar".
6. Pasar todas las pruebas, en la tablet de referencia y en la mínima.
7. Abrir el PR desde una rama `mc`, con capturas del diálogo y la de las dos pantallas de HU-07.h2.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app).
- **Propio del ticket:**
  - En HU-07.h2, la réplica registra un solo cobro: lo pagado de la mesa sube una sola vez.
  - El registro de diagnóstico de cada prueba muestra una sola petición por acción.

## Riesgos y decisiones

- **RA-5** ([seguridad.md](../../architecture/seguridad.md)), "Confirmar la misma solicitud en dos tablets": confirmar no revisa que la solicitud siga existiendo (0007). La revisión previa lo acota, pero queda un margen que la app no cierra.
- **C11:** `/pay` escribe los montos antes de validar `userId`, así que una solicitud sin comensal identificado no se confirma.
- **Decidido (DP-38):** HU-07.c4 y HU-07.h3 pasaron a HU-13, y la parte de HU-07.c2 que pide la lista de cobros se comprueba con HU-13 ([índice](README.md#decisiones-tomadas-2026-11-14)).
