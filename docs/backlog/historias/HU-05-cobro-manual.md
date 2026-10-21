# HU-05. Registrar un cobro manual

| | |
|---|---|
| **Épica** | E5. Cobros |
| **Prioridad** | Must |
| **RF que cubre** | RF-17, RF-18, RF-19 |
| **RNF y reglas que la condicionan** | RNF-3, RNF-6, RNF-9, RNF-10 |
| **Complejidad** | M: toca cobros. Tiene un monto propuesto, una propina, un tope por el saldo pendiente, confirmación y ninguna repetición automática. |

## Historia

**Como** mozo,
**quiero** registrar lo que un comensal me paga en persona cuando no hay una solicitud de cobro,
**para** que lo cobrado quede registrado una sola vez y la mesa muestre su saldo real.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

_Pendiente._

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Necesita el saldo de la mesa que muestra HU-02. |
| Negociable | ✔ | La forma de cargar el monto y la propina se puede ajustar. |
| Valiosa | ✔ | Es el cobro en persona sin solicitud, y evita los cobros duplicados (M-2). |
| Estimable | ✔ | El tope, la propina y cómo queda registrado el cobro están definidos en el PRD. |
| Pequeña | ✔ | Una sola acción con su validación. Entra en 1 o 2 días. |
| Testeable | ✔ | Se prueba con montos menores, iguales y mayores que el saldo, y con un corte de conexión durante el cobro. |

## Estimación

_Pendiente._
