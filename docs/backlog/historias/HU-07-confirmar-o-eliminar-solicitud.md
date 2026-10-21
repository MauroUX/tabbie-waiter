# HU-07. Confirmar o eliminar una solicitud de cobro

| | |
|---|---|
| **Épica** | E5. Cobros |
| **Prioridad** | Must |
| **RF que cubre** | RF-24, RF-25, RF-26 |
| **RNF y reglas que la condicionan** | RNF-3, RNF-6, RNF-9, RNF-10, RF-9 |
| **Complejidad** | M: toca cobros y tiene un camino alternativo para las solicitudes que no identifican al comensal, que usa el cobro manual de HU-05. Eliminar una solicitud tiene efecto en las demás tablets. |

## Historia

**Como** mozo,
**quiero** confirmar las solicitudes de cobro que cobro en persona y eliminar las que no corresponden,
**para** que cada cobro quede registrado una sola vez, sin errores, y la lista de lo que falta cobrar esté al día.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

_Pendiente._

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actúa sobre las solicitudes que muestra HU-06, y su camino alternativo usa el cobro manual de HU-05. |
| Negociable | ✔ | La forma de ofrecer el camino alternativo se puede ajustar. |
| Valiosa | ✔ | Es el cobro en persona habitual. Evita los cobros que fallan y aun así suman el monto. |
| Estimable | ✔ | El camino alternativo de RF-25 está definido en el README: precarga los datos de la solicitud y pide una sola confirmación. |
| Pequeña | ✔ | Dos acciones sobre la misma solicitud, y la tercera reutiliza HU-05. Entra en 1 o 2 días. |
| Testeable | ✔ | Se prueba con solicitudes presenciales, de MercadoPago y sin comensal identificado. La eliminación se verifica en la tablet donde se elimina, y en las demás tablets se verifica por HU-06. |

## Estimación

_Pendiente._
