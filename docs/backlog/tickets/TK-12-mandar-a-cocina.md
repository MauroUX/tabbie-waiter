# TK-12 · Mandar a cocina desde "Órdenes"

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [HU-04](../historias/HU-04-cocina-y-cancelacion.md) · Mandar pedidos a cocina (RF-13) |
| **Readme.md** | Ticket de frontend de la sección 6 |
| **Wireframe** | [`docs/design/ordenes.png`](../../design/ordenes.png) (DP-10; todavía no existe) |

## Objetivo

Que el mozo mande a cocina, con un toque en la tarjeta de la mesa en "Pendientes", todos los pedidos confirmados de esa mesa, sin que la acción se repita sola y sabiendo qué se mandó cuando algo falla.

## Criterios heredados

- [HU-04.c1](../historias/HU-04-cocina-y-cancelacion.md#camino-feliz-1) · Mandar a cocina.
- [HU-04.h1](../historias/HU-04-cocina-y-cancelacion.md#huecos) · El envío a cocina falla.
- [HU-04.h2](../historias/HU-04-cocina-y-cancelacion.md#huecos) · Envío a medias.
- [HU-04.h4](../historias/HU-04-cocina-y-cancelacion.md#huecos) · Pedido que llega durante el envío.
- [HU-04.h5](../historias/HU-04-cocina-y-cancelacion.md#huecos) · Doble toque. **En parte:** el envío a cocina. La cancelación se comprueba con HU-12, en la ampliación.

## Alcance

**Incluye:**

- **El botón "Mandar a cocina"** en la tarjeta de cada mesa, en la pestaña "Pendientes", solo en las mesas con pedidos `confirmed`. No pide confirmación (RNF-9).
- **La acción**, con las reglas comunes de Acciones (0007), que este ticket deja escritas para las acciones que vienen después ([TK-15](TK-15-confirmar-o-eliminar-solicitud.md) y [TK-16](TK-16-cerrar-mesa.md)):
  - **revisión previa:** actualiza la mesa (T05) antes de actuar. Si ya no tiene pedidos `confirmed`, avisa y no actúa;
  - **bloqueo:** mientras la acción está en curso, el botón de esa mesa no está disponible (HU-04.h5);
  - **sin reintentos:** usa el cliente de las acciones de [TK-07](TK-07-cliente-de-acciones.md);
  - **actualización posterior:** al terminar, actualiza mesas y solicitudes (T05 y T06). Si la acción falla o no responde, las actualiza antes de dejar intentarla de nuevo.
- **Qué pedidos manda** (HU-04.h4): los que el mozo veía al tocar el botón y que, en la revisión previa, siguen `confirmed` (DP-31).
- **Una petición por pedido** (C5): un `PUT /orders/:id/send-to-kitchen` sin body por cada uno de esos pedidos. Van en serie y siguen aunque una falle; al final, la app actualiza la mesa y avisa cuáles no salieron, sin reintentos (RNF-6, DP-32).
- **El resultado, por pedido:**
  - **todos salen bien:** los pedidos pasan a "Ingresadas" con la actualización posterior;
  - **algunos fallan:** los que salieron bien pasan a "Ingresadas", los otros siguen en "Pendientes", y la app avisa cuántos no se mandaron (HU-04.h2);
  - **falla o no responde en 10 s:** la app avisa que no se pudo confirmar el envío, no lo repite y actualiza las mesas antes de habilitar el botón otra vez (HU-04.h1).
- **El pedido que llega durante el envío** queda en "Pendientes", con su aviso, y no se manda sin que el mozo lo haya visto (HU-04.h4, DP-31).
- **Los estados de la tarjeta durante la acción:** en curso, terminada, a medias y fallida, con sus mensajes en español.
- **Registro de diagnóstico:** cada envío y su resultado por pedido, por ID y sin cuerpos (PA-6).

**No incluye:**

- Cancelar pedidos: HU-12, en la ampliación.
- El aviso de pedido confirmado y el contador que parpadea: HU-03, en la ampliación. HU-03.h5 usa los envíos de este ticket.
- Cambios en `backend/`: el envío es el `PUT` que ya existe (T08).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `salon/`, donde viven la pantalla "Órdenes" y sus acciones, con sus pruebas en `test/` y `androidTest/`. Usa, sin cambiarlo, el cliente de `comun/red/`.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Acciones (reglas comunes y "Mandar a cocina"), Pantalla "Órdenes", Salón (revisión previa y actualización) y Cobros (actualización de solicitudes).
- **Wireframe:** [`docs/design/ordenes.png`](../../design/ordenes.png), el botón y los estados de la tarjeta.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad):

- **T08:** `PUT /orders/:id/send-to-kitchen`, sin body, uno por pedido.
- **T05:** la revisión previa y la actualización de mesas.
- **T06:** la actualización de solicitudes.

## Requisitos de prueba del backlog

- **Una forma de provocar fallos parciales al mandar a cocina:**
  - **fallo, falta de respuesta o demora de una sola petición** (HU-04.h1, HU-04.h2 y HU-04.h4): en la app, con MockWebServer (DP-20; [infraestructura.md](../../architecture/infraestructura.md), sección 4);
  - **fallo de negocio** (HU-04.h2), en el dispositivo: el simulador cancela, como comensal, uno de los pedidos justo antes del envío ([TK-08](TK-08-simulador-ordenes.md)); la réplica rechaza ese y acepta los demás.

## Dependencias

- [TK-09](TK-09-ordenes.md): "Órdenes" con sus pestañas.
- [TK-07](TK-07-cliente-de-acciones.md): el cliente de las acciones.
- [TK-08](TK-08-simulador-ordenes.md): ESC-7, para el fallo de negocio de HU-04.h2.

## Pasos

1. Crear el cambio de OpenSpec, con un scenario por cada criterio heredado, con el `PUT` de T08 y las respuestas de la réplica.
2. Escribir las pruebas primero, y verlas fallar:
   - **locales**, de Acciones con MockWebServer (DP-20): todos bien, uno que falla y los siguientes que salen igual (DP-32), ninguno responde, el bloqueo, la actualización antes de habilitar otra vez, y el pedido nuevo que llega durante una petición demorada y no entra (HU-04.h4, DP-31);
   - **en el dispositivo**, contra la réplica local: HU-04.c1 con las mesas 4 y 5; HU-04.h2 con ESC-7; HU-04.h5 con dos toques seguidos.
3. Escribir las reglas comunes de Acciones: revisión previa, bloqueo y actualización posterior.
4. Escribir la acción "Mandar a cocina": qué pedidos manda, una petición por pedido en serie y el resultado de cada uno.
5. Escribir el botón y los estados de la tarjeta, con sus mensajes, siguiendo el wireframe.
6. Pasar todas las pruebas, en la tablet de referencia y en la mínima.
7. Comprobar que qué pedidos se mandan y las peticiones en serie siguen lo que dicen DP-31 y DP-32 en [componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14), y corregirlo ahí si la implementación encontró algo que lo contradice.
8. Abrir el PR desde una rama `mc`, con capturas de los estados de la tarjeta.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app).
- **Propio del ticket:**
  - El registro de diagnóstico de cada prueba muestra una sola petición por pedido, también cuando la acción no respondió.
  - Las reglas comunes de Acciones quedan en un solo lugar, listas para confirmar y eliminar solicitudes, cerrar una mesa y las acciones de la ampliación.
  - Las pruebas comprueban DP-31 y DP-32, tal como están escritas en [componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14).

## Riesgos y decisiones

- **C5:** el envío es un `PUT` por pedido, así que un envío puede salir a medias, y un pedido que ya no está `confirmed` se rechaza.
- **0007, Consecuencias:** "Si una acción no responde, la app no sabe si se registró. El mozo decide si repetirla después de ver el estado actualizado".
- **Decidido (DP-31):** "Mandar a cocina" manda los pedidos que el mozo veía al tocar el botón y que, en la revisión previa, siguen `confirmed`. Los que llegaron durante el envío quedan en "Pendientes" con su aviso ([componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14)).
- **Decidido (DP-32):** las peticiones van en serie y siguen aunque una falle. Al final, la app actualiza la mesa y avisa cuáles no salieron, sin reintentos (RNF-6).
- **Decidido (DP-20 y DP-04):** el fallo de una sola petición se prueba en la app con MockWebServer. Los cortes de punta a punta con Toxiproxy van en la ampliación.
