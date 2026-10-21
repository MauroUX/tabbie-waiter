# HU-02. Ver las mesas activas y sus pedidos

| | |
|---|---|
| **Épica** | E2. Vista del salón en tiempo real |
| **Prioridad** | Must |
| **RF que cubre** | RF-5, RF-6, RF-7, RF-8, RF-9 |
| **RNF y reglas que la condicionan** | RNF-2, RNF-3, RNF-4, RNF-7, RNF-8, RNF-10 |
| **Complejidad** | M: es la vista central del turno, con muchos datos por mesa, un cronómetro con los umbrales del restaurante y sin datos sensibles. |

## Historia

**Como** mozo,
**quiero** ver las mesas ocupadas con sus pedidos, sus comensales, el total, lo pagado y la demora,
**para** saber en todo momento qué mesa necesita atención y darle prioridad a la que más espera.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

_Pendiente._

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✔ | Solo necesita la sesión de HU-01. |
| Negociable | ✔ | La forma de presentar cada mesa y la demora se puede ajustar. |
| Valiosa | ✔ | Es la vista con la que el mozo sigue el salón. |
| Estimable | ✔ | Los datos de cada mesa y los umbrales están definidos en el PRD. |
| Pequeña | ✔ | Es solo de consulta, sin acciones que cambien datos. Entra en 1 o 2 días. |
| Testeable | ✔ | El simulador ocupa mesas y confirma pedidos, y se compara lo que muestra la tablet. |

## Estimación

_Pendiente._
