# TK-16 · Cerrar una mesa

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [HU-08](../historias/HU-08-cerrar-mesa.md) · Cerrar una mesa (RF-27, RF-28, RF-29) |
| **Wireframe** | [`docs/design/pagos.png`](../../design/pagos.png) (DP-10; todavía no existe), el botón y el diálogo de cierre |

## Objetivo

Que el mozo cierre una mesa activa desde "Pagos", con un diálogo que muestra el total, lo pagado y el saldo, advierte si queda saldo, y no cierra dos veces la misma mesa.

## Criterios heredados

- [HU-08.c1](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · Botón "Cerrar mesa".
- [HU-08.c2](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · Confirmación de una mesa que pagó el total.
- [HU-08.c3](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · Advertencia de saldo pendiente.
- [HU-08.c4](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · La mesa deja de estar activa.
- [HU-08.h1](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · Cancelar el diálogo.
- [HU-08.h2](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · Doble toque.
- [HU-08.h3](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · El cierre falla.
- [HU-08.h4](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · Mesa ya cerrada en otra tablet.
- [HU-08.h5](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · Solicitudes pendientes al cerrar.
- [HU-08.h6](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · Montos en el diálogo.
- [HU-08.h7](../historias/HU-08-cerrar-mesa.md#criterios-de-aceptación) · Diferencia por redondeo.

## Alcance

**Incluye:**

- **"Cerrar mesa"** en la tarjeta de cada mesa activa de "Pagos" (backlog, "Navegación principal y ubicación de las acciones"). Solo para las sesiones que vienen en T05 (RF-27). En el lote 1 va al pie de la tarjeta, debajo de las solicitudes; cuando llega HU-13, los cobros se suman encima (DP-39).
- **El diálogo de cierre** (RNF-9): el total, lo pagado y el saldo de la mesa (RF-28, HU-08.h6); la advertencia si queda saldo, salvo una diferencia de $0,01 o menos (`amountPaid >= total - 0.01`, HU-08.h7); se puede cancelar sin cambiar nada (HU-08.h1).
- **Cerrar** (T14), con las reglas comunes de Acciones de [TK-12](TK-12-mandar-a-cocina.md):
  - **revisión previa:** actualiza las mesas antes de cerrar; si la mesa ya no está activa, avisa y la quita, sin cerrarla (HU-08.h4);
  - **bloqueo:** mientras el cierre está en curso, ni el botón ni la confirmación se pueden volver a tocar (RF-29, HU-08.h2);
  - **sin reintentos y actualización posterior:** la mesa deja de verse en "Órdenes" y en "Pagos", y sus solicitudes desaparecen con ella (HU-08.c4, HU-08.h5).
- **El resultado:** si el cierre falla o no responde, la app avisa, no lo repite y actualiza las mesas antes de dejar intentarlo de nuevo (HU-08.h3).

**No incluye:**

- La lista de cobros sobre la que el panel actual pone "Cerrar mesa": HU-13, en la ampliación.
- Registrar el saldo como cobro manual antes de cerrar: HU-05, en la ampliación.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `cobros/`, con sus pruebas. Usa, sin cambiarlos, el cliente de `comun/red/` y las reglas comunes de Acciones.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Acciones ("Cerrar una mesa"), Pantalla "Pagos", Salón y Cobros (actualización).
- **Wireframe:** [`docs/design/pagos.png`](../../design/pagos.png).

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T14 (cerrar), T05 (revisión previa, montos del diálogo y actualización) y T06 (actualización de solicitudes).

## Requisitos de prueba del backlog

- **El montaje de dos tablets:** HU-08.h4 se prueba con dos tablets, con los dos mozos del restaurante 1 de [TK-02](TK-02-datos-iniciales.md), o con el cierre desde otra tablet del simulador ([TK-13](TK-13-simulador-pagos.md)).

## Dependencias

- [TK-14](TK-14-pagos-solicitudes.md): "Pagos" con sus tarjetas.
- [TK-12](TK-12-mandar-a-cocina.md): las reglas comunes de Acciones.
- [TK-07](TK-07-cliente-de-acciones.md): el cliente de las acciones.
- [TK-08](TK-08-simulador-ordenes.md): el cobro de otra tablet, para una mesa que pagó el total (HU-08.c2), una con saldo (HU-08.c3) y una a $0,01 del total (HU-08.h7).
- [TK-13](TK-13-simulador-pagos.md): el cierre desde otra tablet, para HU-08.h4.

## Pasos

1. Crear el cambio de OpenSpec, con un scenario por cada criterio heredado, con T14 y las respuestas de la réplica.
2. Escribir las pruebas primero, y verlas fallar:
   - **locales**, de Acciones con MockWebServer: el cierre, la falla y la falta de respuesta, el doble toque y la mesa que ya no está activa en la revisión previa; y del diálogo, los montos y la diferencia por redondeo;
   - **en el dispositivo**, contra la réplica local: HU-08.c1 a HU-08.c4, HU-08.h1, HU-08.h5, HU-08.h6 y HU-08.h7; HU-08.h4 con dos tablets.
3. Escribir el botón y el diálogo de cierre, siguiendo el wireframe.
4. Escribir la acción "Cerrar mesa" sobre las reglas comunes de Acciones.
5. Pasar todas las pruebas, en la tablet de referencia y en la mínima.
6. Abrir el PR desde una rama `mc`, con capturas del diálogo con y sin saldo.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app).
- **Propio del ticket:**
  - Ninguna prueba deja una mesa cerrada dos veces en la réplica: `closedAt` se escribe una sola vez.
  - El registro de diagnóstico de cada prueba muestra una sola petición de cierre.

## Riesgos y decisiones

- **C13 y RA-5** ([seguridad.md](../../architecture/seguridad.md)), "Cerrar una mesa dos veces": el cierre no controla si la sesión ya estaba cerrada. La revisión previa lo acota, pero queda un margen que la app no cierra.
- **C9:** el cierre borra las solicitudes de la mesa sin emitir evento.
- **Decidido (DP-39):** "Cerrar mesa" va al pie de la tarjeta de la mesa; con HU-13 queda "al pie de los cobros", como dice el backlog ("Navegación principal y ubicación de las acciones").
- **Decidido (DP-40):** HU-08 va después de HU-07, así la confirmación de HU-07 deja también una mesa que pagó el total para HU-08.c2.
