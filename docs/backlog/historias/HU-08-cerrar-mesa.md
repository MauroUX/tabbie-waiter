# HU-08. Cerrar una mesa

| | |
|---|---|
| **Épica** | E6. Cierre de mesa |
| **Prioridad** | Must |
| **RF que cubre** | RF-27, RF-28, RF-29 |
| **RNF y reglas que la condicionan** | RNF-3, RNF-6, RNF-9, RNF-10 |
| **Complejidad** | S: es una sola acción, con confirmación, una advertencia si queda saldo y bloqueo mientras está en curso. |

## Historia

**Como** mozo,
**quiero** cerrar la mesa cuando los comensales se van,
**para** dejarla libre para los próximos comensales sin dejar saldo sin cobrar por descuido.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

_Pendiente._

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Solo se ofrece para las mesas activas de HU-02, y usa su saldo para advertir. |
| Negociable | ✔ | El texto de la advertencia y de la confirmación se puede ajustar. |
| Valiosa | ✔ | Libera la mesa al final de la atención. |
| Estimable | ✔ | Las condiciones del cierre están definidas en el PRD. |
| Pequeña | ✔ | Una sola acción. Entra en menos de 1 día. |
| Testeable | ✔ | Se prueba con una mesa saldada, una con saldo pendiente y un toque repetido durante el cierre. |

## Estimación

_Pendiente._
