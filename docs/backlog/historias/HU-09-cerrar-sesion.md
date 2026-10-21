# HU-09. Cerrar sesión al terminar el turno

| | |
|---|---|
| **Épica** | E1. Acceso del mozo |
| **Prioridad** | Should |
| **RF que cubre** | RF-4 |
| **RNF y reglas que la condicionan** | RNF-5, RNF-8, RNF-10 |
| **Complejidad** | S: es una sola acción que vuelve al inicio de sesión y conserva las marcas de "Atendido". |

## Historia

**Como** mozo,
**quiero** cerrar mi sesión al terminar el turno,
**para** que el mozo del turno siguiente use la tablet con su propia cuenta, sin perder los pedidos de ayuda que ya se atendieron.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

_Pendiente._

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Que las marcas de "Atendido" se mantengan solo se puede verificar con HU-10. |
| Negociable | ✔ | Dónde está la acción y si pide confirmación se puede ajustar. |
| Valiosa | ✔ | Permite que varios mozos compartan la tablet entre turnos. |
| Estimable | ✔ | El comportamiento está definido en RF-4. |
| Pequeña | ✔ | Una sola acción. Entra en menos de 1 día. |
| Testeable | ✔ | Se cierra la sesión, otro mozo inicia la suya y se verifica que los avisos atendidos siguen ocultos. |

## Estimación

_Pendiente._
