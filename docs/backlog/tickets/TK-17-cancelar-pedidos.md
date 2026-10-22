# TK-17 · Cancelar pedidos sin tocar lo cobrado

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [HU-04](../historias/HU-04-cocina-y-cancelacion.md) · Mandar a cocina y cancelar pedidos (RF-14, RF-15) |

## Objetivo

Que el mozo cancele uno, varios o todos los pedidos de una mesa, sin poder cancelar los que tienen algo cobrado, y sepa cuáles no se cancelaron cuando algo falla.

## Criterios heredados

- [HU-04.c2](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Cancelar pedidos.
- [HU-04.c3](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · No se cancela lo que tiene algo cobrado.
- [HU-04.h3](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Cancelación que falla o sale a medias.
- [HU-04.h5](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Doble toque. **En parte:** la cancelación. El envío a cocina es de [TK-16](TK-16-mandar-a-cocina.md).
- [HU-04.h6](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Selección mixta.
- [HU-04.h7](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Cobro que llega durante la selección.
- [HU-04.h8](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Cancelar en "Ingresadas".

## Alcance

**Incluye:**

- **La acción para eliminar pedidos** en la tarjeta de cada mesa, en "Pendientes" y en "Ingresadas": el mozo elige uno, varios o todos los platos de la mesa y los cancela, sin confirmación (HU-04.c2, RNF-9).
- **"Todos"** selecciona solo los pedidos sin nada cobrado, y la app explica por qué los otros no se pueden cancelar (HU-04.h6).
- **La regla de lo cobrado** (RF-15): un pedido con `isPaid` o con alguna línea con `quantityPaid > 0` no se cancela, y la app lo explica.
- **La acción**, con las reglas comunes de Acciones que deja [TK-16](TK-16-mandar-a-cocina.md):
  - **revisión previa:** actualiza los cobros de los pedidos elegidos (T05) antes de cancelar; si uno recibió un cobro, no lo cancela y lo explica (HU-04.h7);
  - **bloqueo, sin reintentos y actualización posterior**, como en TK-16.
- **Una petición por pedido** (C6): un `PUT /orders/:id/cancel` con `{"reason":"Cancelada por el restaurante"}` en la raíz del body.
- **El resultado, por pedido:** los cancelados dejan de verse y el total baja en su importe; el que falló sigue visible, y la app avisa cuál no se canceló, sin reintentarlo (HU-04.h3).
- **Registro de diagnóstico:** cada cancelación y su resultado por pedido, por ID y sin cuerpos (PA-6).

**No incluye:**

- Mandar a cocina y las reglas comunes de Acciones: [TK-16](TK-16-mandar-a-cocina.md).
- Revertir un cobro: el backend no lo hace (C6), y la app no cancela lo cobrado.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `salon/`, con sus pruebas. Usa, sin cambiarlo, el cliente de `comun/red/`.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Acciones ("Cancelar pedidos"), Pantalla "Órdenes" y Salón.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad):

- **T09:** `PUT /orders/:id/cancel`, con `reason` en la raíz del body, uno por pedido.
- **T05:** la revisión previa de los cobros de cada pedido y la actualización de mesas.
- **T06:** la actualización de solicitudes.

## Requisitos de prueba del backlog

- **Una forma de provocar fallos parciales al mandar a cocina y al cancelar:** el simulador cancela, como comensal, uno de los pedidos elegidos justo antes de la acción del mozo ([TK-12](TK-12-simulador-cancelar-pedido.md)); Toxiproxy, para la falta de respuesta ([TK-01](TK-01-replica.md)).
- **Pedidos con algo cobrado:** la mesa de [TK-15](TK-15-mesa-con-pedidos-cobrados.md) para HU-04.c3 y HU-04.h6, y el cobro de otra tablet de [TK-04](TK-04-simulador-cobros.md) para HU-04.h7. "HU-04.h7 necesita un cobro. Como HU-05 llega después, se prueba con un cobro del comensal" (backlog, "Orden del backlog").

## Dependencias

- [TK-16](TK-16-mandar-a-cocina.md): las reglas comunes de Acciones y los pedidos en "Ingresadas" de HU-04.h8.
- [TK-15](TK-15-mesa-con-pedidos-cobrados.md): la mesa con pedidos cobrados.
- [TK-04](TK-04-simulador-cobros.md): el cobro durante la selección.
- [TK-12](TK-12-simulador-cancelar-pedido.md): el fallo de negocio de HU-04.h3.

## Pasos

1. Crear el cambio de OpenSpec, con un scenario por cada criterio heredado, con el `PUT` de T09 y las respuestas de la réplica.
2. Escribir las pruebas primero, y verlas fallar: pruebas locales de la selección, de la regla de lo cobrado y del resultado por pedido; pruebas en el dispositivo contra la réplica con la carga de TK-15, el cobro de TK-04 durante la selección, ESC-7 antes de cancelar y dos toques seguidos.
3. Escribir la regla de lo cobrado y la selección, con "todos".
4. Escribir la acción "Cancelar pedidos" sobre las reglas comunes de Acciones.
5. Escribir la selección en la tarjeta, en las dos pestañas, con sus mensajes.
6. Pasar todas las pruebas, en la tablet de referencia y en la mínima.
7. Abrir el PR desde una rama `mc`, con capturas de la selección mixta y del aviso de lo cobrado.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app).
- **Propio del ticket:**
  - Ninguna prueba termina con un pedido cobrado en estado `canceled` en la réplica.
  - El registro de diagnóstico de cada prueba muestra una sola petición por pedido.

## Riesgos y decisiones pendientes

- **RA-5** ([seguridad.md](../../architecture/seguridad.md)), "Cancelar un pedido que acaba de recibir un cobro": "Cancelar no revierte `isPaid`, `quantityPaid` ni `amountPaid` (C6)". Entre la revisión previa y la cancelación queda un margen que la app no cierra.
- **Pendiente:** "Varias peticiones por acción (HU-04.h2, HU-04.h3): … si van en serie o en paralelo, y si un fallo detiene los que faltan" ([componentes.md](../../architecture/componentes.md)). Lo decide [TK-16](TK-16-mandar-a-cocina.md), y este ticket lo sigue.
- **Pendiente:** si la confirmación con la cuenta del segundo mozo es el "cobro del comensal" con que el backlog prueba HU-04.h7 ([índice](README.md#decisiones-pendientes)).
- **Pendiente:** quién provoca los fallos y cómo se hace fallar una sola petición de varias ([componentes.md](../../architecture/componentes.md)).
