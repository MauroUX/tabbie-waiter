# TK-16 · Mandar a cocina desde "Órdenes"

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [HU-04](../historias/HU-04-cocina-y-cancelacion.md) · Mandar a cocina y cancelar pedidos (RF-13) |
| **Readme.md** | Ticket de frontend de la sección 6 |

## Objetivo

Que el mozo mande a cocina, con un toque en la tarjeta de la mesa en "Pendientes", todos los pedidos confirmados de esa mesa, sin que la acción se repita sola y sabiendo qué se mandó cuando algo falla.

## Criterios heredados

- [HU-04.c1](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Mandar a cocina.
- [HU-04.h1](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · El envío a cocina falla.
- [HU-04.h2](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Envío a medias.
- [HU-04.h4](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Pedido que llega durante el envío.
- [HU-04.h5](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Doble toque. **En parte:** el envío a cocina. La cancelación es de [TK-17](TK-17-cancelar-pedidos.md).

## Alcance

**Incluye:**

- **El botón "Mandar a cocina"** en la tarjeta de cada mesa, en la pestaña "Pendientes", solo en las mesas con pedidos `confirmed`. No pide confirmación (RNF-9).
- **La acción**, con las reglas comunes de Acciones (0007), que este ticket deja escritas para las acciones que vienen después:
  - **revisión previa:** actualiza la mesa (T05) antes de actuar. Si ya no tiene pedidos `confirmed`, avisa y no actúa;
  - **bloqueo:** mientras la acción está en curso, el botón de esa mesa no está disponible (HU-04.h5);
  - **sin reintentos:** usa el cliente de las acciones de [TK-09](TK-09-cliente-de-acciones.md);
  - **actualización posterior:** al terminar, actualiza mesas y solicitudes (T05 y T06). Si la acción falla o no responde, las actualiza antes de dejar intentarla de nuevo.
- **Una petición por pedido** (C5): un `PUT /orders/:id/send-to-kitchen` sin body por cada pedido `confirmed` que corresponde mandar.
- **El resultado, por pedido:**
  - **todos salen bien:** los pedidos pasan a "Ingresadas" con la actualización posterior;
  - **algunos fallan:** los que salieron bien pasan a "Ingresadas", los otros siguen en "Pendientes", y la app avisa cuántos no se mandaron (HU-04.h2);
  - **falla o no responde en 10 s:** la app avisa que no se pudo confirmar el envío, no lo repite y actualiza las mesas antes de habilitar el botón otra vez (HU-04.h1).
- **El pedido que llega durante el envío** queda en "Pendientes" y no se manda sin que el mozo lo haya visto (HU-04.h4).
- **Los estados de la tarjeta durante la acción:** en curso, terminada, a medias y fallida, con sus mensajes en español.
- **Registro de diagnóstico:** cada envío y su resultado por pedido, por ID y sin cuerpos (PA-6).

**No incluye:**

- Cancelar pedidos: [TK-17](TK-17-cancelar-pedidos.md).
- El aviso de pedido confirmado y el contador que parpadea: HU-03, fuera de esta descomposición. HU-03.h5 usa los envíos de este ticket.
- Cambios en `backend/`: el envío es el `PUT` que ya existe (T08).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `salon/`, donde viven la pantalla "Órdenes" y sus acciones, con sus pruebas en `test/` y `androidTest/`. Usa, sin cambiarlo, el cliente de `comun/red/`.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Acciones (reglas comunes y "Mandar a cocina"), Pantalla "Órdenes", Salón (revisión previa y actualización) y Cobros (actualización de solicitudes).

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad):

- **T08:** `PUT /orders/:id/send-to-kitchen`, sin body, uno por pedido.
- **T05:** la revisión previa y la actualización de mesas.
- **T06:** la actualización de solicitudes.

## Requisitos de prueba del backlog

- **Una forma de provocar fallos parciales al mandar a cocina y al cancelar:**
  - **fallo de negocio** (HU-04.h2): el simulador cancela, como comensal, uno de los pedidos justo antes del envío ([TK-12](TK-12-simulador-cancelar-pedido.md)); la réplica rechaza ese y acepta los demás;
  - **falta de respuesta** (HU-04.h1): Toxiproxy retiene la respuesta o cierra la conexión ([TK-01](TK-01-replica.md));
  - **demora** (HU-04.h4): con una demora activa en Toxiproxy, el simulador confirma un pedido en esa mesa mientras el envío está en curso ([infraestructura.md](../../architecture/infraestructura.md), sección 4).

## Dependencias

- [TK-13](TK-13-ordenes.md): "Órdenes" con sus pestañas.
- [TK-09](TK-09-cliente-de-acciones.md): el cliente de las acciones.
- [TK-12](TK-12-simulador-cancelar-pedido.md): el fallo de negocio de HU-04.h2.
- [TK-03](TK-03-simulador-mesas-y-pedidos.md): las mesas con pedidos confirmados.

## Pasos

1. Crear el cambio de OpenSpec, con un scenario por cada criterio heredado, con el `PUT` de T08 y las respuestas de la réplica.
2. Escribir las pruebas primero, y verlas fallar:
   - **locales**, de Acciones con un cliente falso: todos bien, uno que falla, ninguno responde, el bloqueo, la actualización antes de habilitar otra vez y el pedido nuevo que no entra;
   - **en el dispositivo**, contra la réplica local: HU-04.c1 con las mesas 4 y 5; HU-04.h1 con Toxiproxy; HU-04.h2 con ESC-7; HU-04.h4 con una demora y ESC-2 durante el envío; HU-04.h5 con dos toques seguidos.
3. Escribir las reglas comunes de Acciones: revisión previa, bloqueo y actualización posterior.
4. Escribir la acción "Mandar a cocina": qué pedidos manda, una petición por pedido y el resultado de cada uno.
5. Escribir el botón y los estados de la tarjeta, con sus mensajes.
6. Pasar todas las pruebas, en la tablet de referencia y en la mínima.
7. Actualizar [componentes.md](../../architecture/componentes.md) con lo que se decidió sobre qué pedidos se mandan y sobre las peticiones en serie o en paralelo.
8. Abrir el PR desde una rama `mc`, con capturas de los estados de la tarjeta.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app).
- **Propio del ticket:**
  - El registro de diagnóstico de cada prueba muestra una sola petición por pedido, también cuando la acción no respondió.
  - Las reglas comunes de Acciones quedan en un solo lugar, listas para cancelar pedidos y para las acciones de HU-05, HU-07 y HU-08.
  - Las dos decisiones pendientes de este ticket quedan escritas en [componentes.md](../../architecture/componentes.md) y salen de "Decisiones pendientes".

## Riesgos y decisiones pendientes

- **C5:** el envío es un `PUT` por pedido, así que un envío puede salir a medias, y un pedido que ya no está `confirmed` se rechaza.
- **0007, Consecuencias:** "Si una acción no responde, la app no sabe si se registró. El mozo decide si repetirla después de ver el estado actualizado".
- **Pendiente:** "Qué pedidos manda 'Mandar a cocina' (HU-04.h4): … Falta decidir si se mandan los pedidos que el mozo veía al tocar el botón o los que trae la revisión" ([componentes.md](../../architecture/componentes.md), "Decisiones pendientes").
- **Pendiente:** "Varias peticiones por acción (HU-04.h2, HU-04.h3): … Falta decidir si van en serie o en paralelo, y si un fallo detiene los que faltan" ([componentes.md](../../architecture/componentes.md)).
- **Pendiente:** "Quién provoca los cortes y los fallos: … cómo se hace fallar una sola petición de varias" ([componentes.md](../../architecture/componentes.md)).
