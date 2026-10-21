# HU-04. Mandar a cocina y cancelar pedidos

| | |
|---|---|
| **Épica** | E3. Gestión de pedidos |
| **Prioridad** | Must |
| **RF que cubre** | RF-13, RF-14, RF-15 |
| **RNF y reglas que la condicionan** | RNF-3, RNF-6, RNF-10 |
| **Complejidad** | M: son dos acciones que cambian datos, sin repeticiones automáticas. Además, no deja cancelar lo que ya tiene algo cobrado. |

## Historia

**Como** mozo,
**quiero** mandar a cocina los pedidos confirmados de una mesa y cancelar los que no van,
**para** que la cocina reciba a tiempo lo que tiene que preparar y la cuenta de la mesa refleje solo lo que se sirve, sin descuadrar lo ya cobrado.

## Camino feliz

- En "Pendientes", la tarjeta de cada mesa tiene el botón "Mandar a cocina", que manda todos los pedidos confirmados de esa mesa.
- Al mandarlos, los pedidos pasan de "Pendientes" a "Ingresadas".
- La tarjeta de cada mesa tiene una acción para eliminar pedidos: el mozo elige uno, varios o todos los platos de la mesa y los cancela.
- Los pedidos cancelados dejan de verse y el total de la mesa se actualiza.
- Un pedido que ya tiene algo cobrado no se puede cancelar, y la app explica por qué.

## Criterios de aceptación

### Camino feliz

**HU-04.c1 · Mandar a cocina**

- **Dado** que la mesa 4 tiene tres pedidos en "Pendientes" y la mesa 5 tiene uno
- **Cuando** el mozo aprieta "Mandar a cocina" en la tarjeta de la mesa 4
- **Entonces** los tres pedidos de la mesa 4 dejan de verse en "Pendientes" y aparecen en "Ingresadas"
- **Y** el pedido de la mesa 5 sigue en "Pendientes"

**HU-04.c2 · Cancelar pedidos**

- **Dado** que una mesa tiene pedidos sin nada cobrado
- **Cuando** el mozo elige uno, varios o todos con la acción para eliminar pedidos y los cancela
- **Entonces** los pedidos cancelados dejan de verse
- **Y** el total de la mesa baja en la suma de sus importes
- **Y** la app no pide confirmación antes de cancelar

**HU-04.c3 · No se cancela lo que tiene algo cobrado**

- **Dado** que un pedido tiene algo cobrado, total o parcialmente
- **Cuando** el mozo intenta cancelarlo
- **Entonces** la app no lo cancela
- **Y** le explica que ese pedido ya tiene algo cobrado

### Huecos

**HU-04.h1 · El envío a cocina falla** (RNF-6)

- **Dado** que el mozo apretó "Mandar a cocina"
- **Cuando** la acción falla o no responde
- **Entonces** la app avisa que no se pudo confirmar el envío
- **Y** no lo repite sola
- **Y** actualiza las mesas antes de dejar intentarlo de nuevo

**HU-04.h2 · Envío a medias** (C5, RNF-6)

- **Dado** que una mesa tiene tres pedidos en "Pendientes"
- **Cuando** el envío a cocina sale bien para dos y falla para uno
- **Entonces** los dos quedan en "Ingresadas"
- **Y** el otro sigue en "Pendientes"
- **Y** la app avisa que un pedido no se mandó

**HU-04.h3 · Cancelación que falla o sale a medias** (C6, RNF-6)

- **Dado** que el mozo cancela varios pedidos
- **Cuando** falla la cancelación de alguno
- **Entonces** los que se cancelaron dejan de verse
- **Y** el que falló sigue visible
- **Y** la app avisa cuál no se canceló, sin reintentarlo sola

**HU-04.h4 · Pedido que llega durante el envío**

- **Dado** que el mozo apretó "Mandar a cocina"
- **Cuando** un comensal de esa mesa confirma un pedido mientras el envío está en curso
- **Entonces** ese pedido queda en "Pendientes"
- **Y** no se manda a cocina sin que el mozo lo haya visto

**HU-04.h5 · Doble toque**

- **Dado** que un envío a cocina o una cancelación están en curso
- **Cuando** el mozo vuelve a tocar la misma acción
- **Entonces** la acción no está disponible hasta que termina la primera

**HU-04.h6 · Selección mixta** (RF-15, C6)

- **Dado** que una mesa tiene pedidos con algo cobrado y pedidos sin cobrar
- **Cuando** el mozo elige "todos" para cancelar
- **Entonces** quedan seleccionados solo los que no tienen nada cobrado
- **Y** la app explica por qué los otros no se pueden cancelar

**HU-04.h7 · Cobro que llega durante la selección** (RF-15, RNF-2, README: riesgos aceptados)

- **Dado** que el mozo eligió un pedido para cancelarlo
- **Cuando** antes de cancelarlo, ese pedido recibe un cobro desde otro lugar, y el mozo confirma la cancelación
- **Entonces** la app actualiza los cobros del pedido antes de cancelar
- **Y** como el pedido ya tiene algo cobrado, no lo cancela
- **Y** explica por qué

**HU-04.h8 · Cancelar en "Ingresadas"** (RF-14, C6)

- **Dado** que un pedido está en "Ingresadas" y no tiene nada cobrado
- **Cuando** el mozo lo cancela
- **Entonces** deja de verse
- **Y** el total de la mesa baja en su importe

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actúa sobre las pestañas "Pendientes" e "Ingresadas" de HU-02. HU-04.h7 necesita un cobro, de HU-05 o del comensal. |
| Negociable | ✔ | La forma de seleccionar los pedidos y de explicar el bloqueo se puede ajustar. |
| Valiosa | ✔ | Sin mandar a cocina, el pedido no llega a la cocina. Cancelar corrige los pedidos que no van. |
| Estimable | ✔ | Los estados, la regla de bloqueo y el comportamiento ante fallos están definidos en el PRD. |
| Pequeña | ✔ | Dos acciones sobre los mismos pedidos de la mesa, con su manejo de fallos parciales. Está en el límite: si al estimarla se pasa, se separa la cancelación (RF-14 y RF-15). |
| Testeable | ✔ | Se prueba con pedidos confirmados, pedidos en cocina y pedidos con un cobro parcial. Los fallos parciales (HU-04.h2 y HU-04.h3) y el pedido que llega durante el envío (HU-04.h4) necesitan una forma de provocar el fallo o la demora de una sola acción, que se define en el plan de pruebas. |

## Estimación

**8 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
