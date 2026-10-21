# HU-06. Ver las solicitudes y los cobros de cada mesa

| | |
|---|---|
| **Épica** | E5. Cobros |
| **Prioridad** | Must |
| **RF que cubre** | RF-20, RF-21, RF-22, RF-23 |
| **RNF y reglas que la condicionan** | RNF-1, RNF-2, RNF-4, RNF-7, RNF-10, RF-9 |
| **Complejidad** | L: depende de los avisos en tiempo real, tiene comportamiento entre tablets y junta dos listas (las solicitudes y los cobros de cada mesa). |

## Historia

**Como** mozo,
**quiero** ver las solicitudes de cobro pendientes y los cobros ya registrados de cada mesa,
**para** saber a qué mesa tengo que ir a cobrar y qué se pagó antes de cerrarla.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

_Pendiente._

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Agrupa las solicitudes y los cobros por las mesas de HU-02. |
| Negociable | ✔ | La forma de agrupar y de mostrar el indicador se puede ajustar. |
| Valiosa | ✔ | Es como el mozo sabe que tiene que ir a cobrar y qué falta cobrar. |
| Estimable | ✔ | El canal de avisos lo deja el walking skeleton. Las dos listas y el indicador están definidos en el PRD. |
| Pequeña | ✔ | Es la historia más grande del backlog, pero es solo de consulta. Entra en 1 o 2 días porque no construye el canal de avisos. Si al estimarla se pasa, se separa RF-23 (los cobros de cada mesa). |
| Testeable | ✔ | El simulador crea solicitudes presenciales y de MercadoPago. Lo que pasa en otra tablet se prueba con dos tablets, según el README. |

## Estimación

_Pendiente._
