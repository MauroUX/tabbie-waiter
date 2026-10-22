# TK-12 · Simulador: cancelar un pedido como comensal

| | |
|---|---|
| **Tipo** | Backend (réplica y simulador) |
| **Origen** | ESC-7 de [componentes.md](../../architecture/componentes.md), sección 3; [infraestructura.md](../../architecture/infraestructura.md), sección 4, "Fallos parciales al mandar a cocina y al cancelar" |

## Objetivo

Sumar al simulador la cancelación de un pedido como comensal, para que el mozo vea desaparecer el pedido y para provocar los fallos de negocio de un envío a cocina o una cancelación a medias.

## Criterios heredados

- [HU-02.h8](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · El comensal cancela un pedido. **En parte:** que, después de ESC-7, T05 ya no trae el pedido y el total de la mesa bajó en su importe. El criterio completo es de [TK-13](TK-13-ordenes.md).
- [HU-04.h2](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Envío a medias. **En parte:** que un pedido cancelado por el comensal hace fallar su envío a cocina (T08) y los demás pedidos de la mesa se aceptan. El criterio completo es de [TK-16](TK-16-mandar-a-cocina.md).
- [HU-04.h3](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Cancelación que falla o sale a medias. **En parte:** que un pedido cancelado por el comensal hace fallar su cancelación por el mozo (T09) y los demás se aceptan. El criterio completo es de [TK-17](TK-17-cancelar-pedidos.md).

## Alcance

**Incluye:**

- **ESC-7 · Cancelar un pedido:** el comensal cancela un pedido `pending` o `confirmed` desde su app, con el endpoint que se compruebe en la copia.
- **Cancelar a pedido de la prueba:** la línea de comandos permite cancelar un pedido dado en el momento en que la prueba lo pide, "justo antes de la acción del mozo" ([infraestructura.md](../../architecture/infraestructura.md), sección 4).
- Cada cancelación, con su hora en el registro del turno.

**No incluye:**

- Las demoras y la falta de respuesta, que se provocan con Toxiproxy: [TK-01](TK-01-replica.md) deja las formas de corte; quién las activa sigue pendiente.
- Lo que muestra la app: [TK-13](TK-13-ordenes.md), [TK-16](TK-16-mandar-a-cocina.md) y [TK-17](TK-17-cancelar-pedidos.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `simulator/src/`. Las pruebas a nivel de la réplica, donde se decida que viven las pruebas de integración.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 3): Línea de comandos, Escenarios y Registro del turno.

## Contrato que usa

- **Endpoint del comensal para cancelar:** pendiente; el contexto describe qué puede cancelar el comensal (sección 4), pero no nombra el endpoint.
- **Para comprobar**, por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T05; T08 y T09 con la cuenta del segundo mozo, sobre el pedido cancelado y sobre otro de la misma mesa (C5, C6).

## Requisitos de prueba del backlog

- **Una forma de provocar fallos parciales al mandar a cocina y al cancelar:** la parte de los fallos de negocio. "La app todavía lo muestra, y el backend rechaza ese pedido y acepta los demás, porque la app manda una petición por pedido, y un pedido ya cancelado no se puede cancelar ni mandar a cocina" ([infraestructura.md](../../architecture/infraestructura.md), sección 4).

## Dependencias

- [TK-03](TK-03-simulador-mesas-y-pedidos.md): la base del simulador, ESC-1 y ESC-2.

## Pasos

1. Encontrar en el código de la copia el endpoint con que el comensal cancela un pedido, y documentarlo en [componentes.md](../../architecture/componentes.md) y en el contexto.
2. Crear el cambio de OpenSpec, con los scenarios de la parte de HU-02.h8, HU-04.h2 y HU-04.h3.
3. Escribir las pruebas primero, y verlas fallar: ESC-7 y su efecto en T05; T08 y T09 sobre una mesa con un pedido cancelado por el comensal y otro no.
4. Escribir ESC-7 y la cancelación a pedido de la prueba.
5. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Backend](../definition-of-done.md#backend-réplica-y-simulador).
- **Propio del ticket:**
  - El endpoint de ESC-7 queda documentado y sale de "Decisiones pendientes" de [componentes.md](../../architecture/componentes.md).
  - Una cancelación que la réplica rechaza, por ejemplo de un pedido `in_kitchen`, termina el escenario con un error explícito.

## Riesgos y decisiones pendientes

- **Pendiente:** "Cancelar como comensal (ESC-7): el contexto describe qué puede cancelar el comensal (sección 4), pero no nombra el endpoint que usa" ([componentes.md](../../architecture/componentes.md), "Decisiones pendientes").
- **Pendiente:** "Quién provoca los cortes y los fallos: … cómo se hace fallar una sola petición de varias. El backlog los deja para el plan de pruebas" ([componentes.md](../../architecture/componentes.md)).
- **Pendiente:** dónde viven las pruebas de integración de la réplica ([índice](README.md#decisiones-pendientes)).
