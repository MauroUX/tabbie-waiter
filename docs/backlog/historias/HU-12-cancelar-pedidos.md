# HU-12. Cancelar pedidos

| | |
|---|---|
| **Épica** | E3. Gestión de pedidos |
| **Prioridad** | Must |
| **Lote** | Ampliación (DP-03) |
| **RF que cubre** | RF-14, RF-15 |
| **RNF y reglas que la condicionan** | RNF-2, RNF-3, RNF-6, RNF-10 |
| **Complejidad** | M: es una acción que cambia datos, sin repeticiones automáticas, y no deja cancelar lo que ya tiene algo cobrado. |

> **Origen:** sale de la partición de HU-04 en la revisión de la Entrega 1 (DP-03). Sus criterios anotan el ID que tenían en HU-04.

## Historia

**Como** mozo,
**quiero** cancelar los pedidos que no van,
**para** que la cuenta de la mesa refleje solo lo que se sirve, sin descuadrar lo ya cobrado.

## Camino feliz

- La tarjeta de cada mesa tiene una acción para eliminar pedidos: el mozo elige uno, varios o todos los platos de la mesa y los cancela.
- Los pedidos cancelados dejan de verse y el total de la mesa se actualiza.
- Un pedido que ya tiene algo cobrado no se puede cancelar, y la app explica por qué.

## Criterios de aceptación

### Camino feliz

**HU-12.c1 · Cancelar pedidos** (antes HU-04.c2)

- **Dado** que una mesa tiene pedidos sin nada cobrado
- **Cuando** el mozo elige uno, varios o todos con la acción para eliminar pedidos y los cancela
- **Entonces** los pedidos cancelados dejan de verse
- **Y** el total de la mesa baja en la suma de sus importes
- **Y** la app no pide confirmación antes de cancelar

**HU-12.c2 · No se cancela lo que tiene algo cobrado** (antes HU-04.c3)

- **Dado** que un pedido tiene algo cobrado, total o parcialmente
- **Cuando** el mozo intenta cancelarlo
- **Entonces** la app no lo cancela
- **Y** le explica que ese pedido ya tiene algo cobrado

### Huecos

**HU-12.h1 · Cancelación que falla o sale a medias** (C6, RNF-6) (antes HU-04.h3)

- **Dado** que el mozo cancela varios pedidos
- **Cuando** falla la cancelación de alguno
- **Entonces** los que se cancelaron dejan de verse
- **Y** el que falló sigue visible
- **Y** la app avisa cuál no se canceló, sin reintentarlo sola

**HU-12.h2 · Selección mixta** (RF-15, C6) (antes HU-04.h6)

- **Dado** que una mesa tiene pedidos con algo cobrado y pedidos sin cobrar
- **Cuando** el mozo elige "todos" para cancelar
- **Entonces** quedan seleccionados solo los que no tienen nada cobrado
- **Y** la app explica por qué los otros no se pueden cancelar

**HU-12.h3 · Cobro que llega durante la selección** (RF-15, RNF-2, README: riesgos aceptados) (antes HU-04.h7)

- **Dado** que el mozo eligió un pedido para cancelarlo
- **Cuando** antes de cancelarlo, ese pedido recibe un cobro desde otro lugar, y el mozo confirma la cancelación
- **Entonces** la app actualiza los cobros del pedido antes de cancelar
- **Y** como el pedido ya tiene algo cobrado, no lo cancela
- **Y** explica por qué

**HU-12.h4 · Cancelar en "Ingresadas"** (RF-14, C6) (antes HU-04.h8)

- **Dado** que un pedido está en "Ingresadas" y no tiene nada cobrado
- **Cuando** el mozo lo cancela
- **Entonces** deja de verse
- **Y** el total de la mesa baja en su importe

**Doble toque:** [HU-04.h5](HU-04-cocina-y-cancelacion.md#huecos) nombra el envío a cocina y la cancelación. Queda en HU-04, y la parte de la cancelación se comprueba con esta historia.

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actúa sobre las pestañas "Pendientes" e "Ingresadas" de HU-02, y usa las reglas comunes de las acciones que deja HU-04. HU-12.h3 necesita un cobro, de HU-05 o de otra tablet: el simulador con la cuenta del segundo mozo (DP-21). |
| Negociable | ✔ | La forma de seleccionar los pedidos y de explicar el bloqueo se puede ajustar. |
| Valiosa | ✔ | Cancelar corrige los pedidos que no van, sin tocar lo cobrado. |
| Estimable | ✔ | Los estados, la regla de bloqueo y el comportamiento ante fallos están definidos en el PRD. |
| Pequeña | ✔ | Una acción sobre los pedidos de la mesa, con su regla de lo cobrado y su manejo de fallos parciales. Entra en 1 o 2 días. |
| Testeable | ✔ | Se prueba con pedidos confirmados, pedidos en cocina y pedidos con un cobro parcial. La cancelación a medias (HU-12.h1) necesita provocar el fallo de una sola petición: se prueba en la app con MockWebServer (DP-20). |

## Estimación

**5 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
