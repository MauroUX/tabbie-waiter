# HU-11. Consultar la impresora virtual

| | |
|---|---|
| **Épica** | E7. Impresora virtual de comandas |
| **Prioridad** | Should |
| **RF que cubre** | RF-30, RF-31, RF-32 |
| **RNF y reglas que la condicionan** | RNF-1, RNF-2, RNF-7, RNF-10 |
| **Complejidad** | S: es solo de consulta, usa los mismos datos de las mesas activas y se llega a ella desde la navegación principal. |

## Historia

**Como** mozo,
**quiero** consultar los pedidos confirmados que todavía no se mandaron a cocina,
**para** revisar en un solo lugar lo que falta mandar a cocina en todo el salón, sin recorrer mesa por mesa.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

_Pendiente._

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Usa los datos de las mesas activas de HU-02. |
| Negociable | ✔ | La forma de la lista y del detalle se puede ajustar. |
| Valiosa | ✔ | Hoy la impresora virtual existe, pero no se llega a ella desde ninguna pantalla. |
| Estimable | ✔ | El acceso y el contenido están definidos en el README y en el PRD. |
| Pequeña | ✔ | Una lista con su detalle, sin acciones. Entra en menos de 1 día. |
| Testeable | ✔ | El simulador confirma pedidos en varias mesas y se compara con la lista. Además se verifica que no hay acciones que cambien datos. |

## Estimación

_Pendiente._
