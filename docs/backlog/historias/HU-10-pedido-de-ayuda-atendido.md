# HU-10. Dar por atendido un pedido de ayuda

| | |
|---|---|
| **Épica** | E4. Pedidos de ayuda |
| **Prioridad** | Should |
| **RF que cubre** | RF-16 |
| **RNF y reglas que la condicionan** | RNF-8, RNF-10 |
| **Complejidad** | S: es una sola acción, pero tiene comportamiento entre tablets y es el único dato de la operación que queda guardado en la tablet. |

## Historia

**Como** mozo,
**quiero** dar por atendido un pedido de ayuda,
**para** que el aviso deje de llamarme la atención y pueda concentrarme en las mesas que sí me necesitan.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

_Pendiente._

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actúa sobre el aviso de pedido de ayuda que muestra HU-02. |
| Negociable | ✔ | La forma de la acción y del aviso se puede ajustar. |
| Valiosa | ✔ | Hoy el aviso queda encendido hasta que se cierra la mesa. |
| Estimable | ✔ | El alcance (solo esa tablet, hasta que se cierra la mesa) está definido en el PRD. |
| Pequeña | ✔ | Una sola acción. Entra en menos de 1 día. |
| Testeable | ✔ | El simulador pide ayuda, y se prueba con dos tablets según el README: la tablet B sigue mostrando el aviso pasados 30 segundos. |

## Estimación

_Pendiente._
