# HU-07. Confirmar o eliminar una solicitud de cobro

| | |
|---|---|
| **Épica** | E5. Cobros |
| **Prioridad** | Must |
| **RF que cubre** | RF-24, RF-26 |
| **RNF y reglas que la condicionan** | RNF-3, RNF-6, RNF-9, RNF-10, RF-9 |
| **Complejidad** | M: toca cobros, con confirmación y sin repeticiones automáticas, y confirmar la misma solicitud en dos tablets no puede duplicar el cobro. Eliminar una solicitud tiene efecto en las demás tablets. |

## Historia

**Como** mozo,
**quiero** confirmar las solicitudes de cobro que cobro en persona y eliminar las que no corresponden,
**para** que cada cobro quede registrado una sola vez, sin errores, y la lista de lo que falta cobrar esté al día.

## Camino feliz

- Cuando el mozo cobra en persona, aprieta "Confirmar pago" en el ítem de la solicitud.
- Aparece un diálogo de confirmación con los datos del cobro.
- Si confirma, el ítem queda marcado como pagado y lo pagado de la mesa se actualiza.
- Si la solicitud no corresponde, el mozo aprieta "Eliminar" y la solicitud desaparece.
- Las solicitudes de MercadoPago se ven, pero no tienen "Confirmar pago".

## Criterios de aceptación

### Camino feliz

**HU-07.c1 · Diálogo de confirmación**

- **Dado** que una solicitud presencial identifica al comensal
- **Cuando** el mozo aprieta "Confirmar pago" en su ítem
- **Entonces** aparece un diálogo de confirmación con el comensal, el monto, la propina y el tipo de pago de la solicitud

**HU-07.c2 · Confirmar el pago**

- **Dado** que el diálogo de confirmación está abierto
- **Cuando** el mozo confirma
- **Entonces** el ítem queda marcado como pagado
- **Y** lo pagado de la mesa sube en el monto de la solicitud sin la propina

**HU-07.c3 · Eliminar una solicitud**

- **Dado** que una solicitud no corresponde
- **Cuando** el mozo aprieta "Eliminar"
- **Entonces** la solicitud desaparece de la tarjeta de su mesa
- **Y** el número de "Pagos" baja en uno
- **Y** la app no pide confirmación antes de eliminarla

**HU-07.c4 · Solicitudes de MercadoPago**

- **Dado** que una mesa tiene una solicitud de MercadoPago
- **Cuando** el mozo mira su tarjeta en "Pagos"
- **Entonces** ve la solicitud
- **Y** la solicitud no tiene el botón "Confirmar pago"

### Huecos

**HU-07.h1 · Confirmar o eliminar falla** (RNF-6, M-2)

- **Dado** que el mozo confirmó un pago o eliminó una solicitud
- **Cuando** la acción falla o no responde
- **Entonces** la app no la repite sola
- **Y** actualiza las solicitudes antes de dejar intentarla de nuevo
- **Y** si el cobro se había registrado, el ítem aparece como pagado y ya no tiene "Confirmar pago"

**HU-07.h2 · Con dos tablets: la misma solicitud se confirma en las dos** (M-2, RNF-2, README)

- **Dado** que las tablets A y B muestran la misma solicitud
- **Cuando** la tablet A la confirma y enseguida la tablet B también
- **Entonces** queda un solo cobro registrado
- **Y** la tablet B avisa que la solicitud ya no está
- **Y** actualiza su lista

**HU-07.h3 · MercadoPago sin acciones**

- **Dado** que una solicitud es de MercadoPago
- **Cuando** el mozo mira el ítem
- **Entonces** el ítem no tiene "Confirmar pago" ni "Eliminar"

**HU-07.h4 · Cancelar el diálogo** (RNF-9)

- **Dado** que el diálogo de confirmación está abierto
- **Cuando** el mozo lo cancela
- **Entonces** no se registra ningún cobro
- **Y** la solicitud sigue en la lista, sin cambios

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actúa sobre las solicitudes que muestra HU-06. |
| Negociable | ✔ | La forma del diálogo de confirmación y de la eliminación se puede ajustar. |
| Valiosa | ✔ | Es el cobro en persona habitual, registrado una sola vez. |
| Estimable | ✔ | La confirmación, la eliminación y el comportamiento ante fallos están definidos en el PRD. |
| Pequeña | ✔ | Dos acciones sobre la misma solicitud. Entra en 1 o 2 días. |
| Testeable | ✔ | Se prueba con solicitudes presenciales y de MercadoPago. La eliminación se verifica en la tablet donde se elimina, y en las demás tablets se verifica por HU-06. HU-07.h2 se prueba con dos tablets. |

## Estimación

_Pendiente._
