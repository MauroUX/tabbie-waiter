# HU-04. Mandar a cocina y cancelar pedidos

| | |
|---|---|
| **Épica** | E3. Gestión de pedidos |
| **Prioridad** | Must |
| **RF que cubre** | RF-13, RF-14, RF-15 |
| **RNF y reglas que la condicionan** | RNF-3, RNF-6, RNF-9, RNF-10 |
| **Complejidad** | M: son dos acciones que cambian datos, sin repeticiones automáticas y con confirmación para cancelar. Además, no deja cancelar lo que ya tiene algo cobrado. |

## Historia

**Como** mozo,
**quiero** mandar a cocina los pedidos confirmados de una mesa y cancelar los que no van,
**para** que la cocina reciba a tiempo lo que tiene que preparar y la cuenta de la mesa refleje solo lo que se sirve, sin descuadrar lo ya cobrado.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

_Pendiente._

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actúa sobre las pestañas "Pendientes" e "Ingresadas" de HU-02. |
| Negociable | ✔ | La forma de seleccionar los pedidos y de explicar el bloqueo se puede ajustar. |
| Valiosa | ✔ | Sin mandar a cocina, el pedido no llega a la cocina. Cancelar corrige los pedidos que no van. |
| Estimable | ✔ | Los estados y la regla de bloqueo están definidos en el PRD. |
| Pequeña | ✔ | Dos acciones sobre los mismos pedidos de la mesa. Entra en 1 o 2 días. |
| Testeable | ✔ | Se prueba con pedidos confirmados, pedidos en cocina y pedidos con un cobro parcial. |

## Estimación

_Pendiente._
