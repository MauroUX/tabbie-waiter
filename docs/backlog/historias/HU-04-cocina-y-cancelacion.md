# HU-04. Mandar pedidos a cocina

| | |
|---|---|
| **Épica** | E3. Gestión de pedidos |
| **Prioridad** | Must |
| **Lote** | Lote 1 (DP-03) |
| **RF que cubre** | RF-13 |
| **RNF y reglas que la condicionan** | RNF-3, RNF-6, RNF-10 |
| **Complejidad** | M: es una acción que cambia datos, sin repeticiones automáticas, y puede salir a medias. |

> **Partición:** en la revisión de la Entrega 1, la cancelación de pedidos (RF-14 y RF-15) pasó a [HU-12](HU-12-cancelar-pedidos.md), que va en la ampliación (DP-03). Los criterios que quedan acá conservan su ID.

## Historia

**Como** mozo,
**quiero** mandar a cocina los pedidos confirmados de una mesa,
**para** que la cocina reciba a tiempo lo que tiene que preparar.

## Camino feliz

- En "Pendientes", la tarjeta de cada mesa tiene el botón "Mandar a cocina", que manda todos los pedidos confirmados de esa mesa.
- Al mandarlos, los pedidos pasan de "Pendientes" a "Ingresadas".

## Criterios de aceptación

### Camino feliz

**HU-04.c1 · Mandar a cocina**

- **Dado** que la mesa 4 tiene tres pedidos en "Pendientes" y la mesa 5 tiene uno
- **Cuando** el mozo aprieta "Mandar a cocina" en la tarjeta de la mesa 4
- **Entonces** los tres pedidos de la mesa 4 dejan de verse en "Pendientes" y aparecen en "Ingresadas"
- **Y** el pedido de la mesa 5 sigue en "Pendientes"

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

**HU-04.h4 · Pedido que llega durante el envío**

- **Dado** que el mozo apretó "Mandar a cocina"
- **Cuando** un comensal de esa mesa confirma un pedido mientras el envío está en curso
- **Entonces** ese pedido queda en "Pendientes"
- **Y** no se manda a cocina sin que el mozo lo haya visto

**HU-04.h5 · Doble toque**

- **Dado** que un envío a cocina o una cancelación están en curso
- **Cuando** el mozo vuelve a tocar la misma acción
- **Entonces** la acción no está disponible hasta que termina la primera

La parte de HU-04.h5 que nombra la cancelación se comprueba al hacer [HU-12](HU-12-cancelar-pedidos.md).

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actúa sobre las pestañas "Pendientes" e "Ingresadas" de HU-02. |
| Negociable | ✔ | La forma de avisar un envío a medias se puede ajustar. |
| Valiosa | ✔ | Sin mandar a cocina, el pedido no llega a la cocina. |
| Estimable | ✔ | Los estados y el comportamiento ante fallos están definidos en el PRD, y qué pedidos se mandan, en DP-31. |
| Pequeña | ✔ | Una sola acción sobre los pedidos confirmados de una mesa, con su manejo de fallos parciales. Entra en 1 día. |
| Testeable | ✔ | Se prueba con pedidos confirmados de dos mesas. El envío a medias (HU-04.h2) y el pedido que llega durante el envío (HU-04.h4) necesitan provocar el fallo o la demora de una sola petición: se prueban en la app con MockWebServer (DP-20). |

## Estimación

**3 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
