# HU-07. Confirmar o eliminar una solicitud de cobro

| | |
|---|---|
| **Épica** | E5. Cobros |
| **Prioridad** | Must |
| **RF que cubre** | RF-24, RF-25, RF-26 |
| **RNF y reglas que la condicionan** | RNF-3, RNF-6, RNF-9, RNF-10, RF-9 |
| **Complejidad** | M: toca cobros, con confirmación y sin repeticiones automáticas, y antes de confirmar revisa que la solicitud siga pendiente, para no duplicar el cobro si ya se confirmó en otra tablet. Eliminar una solicitud tiene efecto en las demás tablets, y las solicitudes que no identifican al comensal no se confirman. |

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

**HU-07.h2 · Con dos tablets: la misma solicitud se confirma en las dos** (M-2, RNF-2, README: comportamientos entre tablets y riesgos aceptados)

- **Dado** que las tablets A y B muestran la misma solicitud
- **Cuando** la tablet A la confirma y, antes de que la tablet B se actualice, el mozo de la tablet B también la confirma
- **Entonces** la tablet B actualiza las solicitudes antes de confirmar
- **Y** como la solicitud ya no está, no la confirma
- **Y** avisa que la solicitud ya no está
- **Y** queda un solo cobro registrado

**HU-07.h3 · MercadoPago solo se elimina** (RF-26, C12)

- **Dado** que una solicitud es de MercadoPago
- **Cuando** el mozo mira el ítem
- **Entonces** el ítem no tiene "Confirmar pago"
- **Y** sí tiene "Eliminar", igual que las solicitudes presenciales

**HU-07.h4 · Cancelar el diálogo** (RNF-9)

- **Dado** que el diálogo de confirmación está abierto
- **Cuando** el mozo lo cancela
- **Entonces** no se registra ningún cobro
- **Y** la solicitud sigue en la lista, sin cambios

**HU-07.h5 · Solicitud sin comensal identificado** (RF-25, C11, README)

- **Dado** que una solicitud no identifica al comensal
- **Cuando** el mozo intenta confirmarla
- **Entonces** la app no la confirma
- **Y** le explica que registre el monto como cobro manual y después elimine la solicitud
- **Y** lo pagado de la mesa no cambia

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actúa sobre las solicitudes que muestra HU-06. |
| Negociable | ✔ | La forma del diálogo de confirmación, de la eliminación y de la explicación de RF-25 se puede ajustar. |
| Valiosa | ✔ | Es el cobro en persona habitual, registrado una sola vez. Además, evita que una confirmación que falla sume el monto igual (problema 2 del PRD). |
| Estimable | ✔ | La confirmación, la eliminación, la regla de RF-25 y el comportamiento ante fallos están definidos en el PRD. |
| Pequeña | ✔ | Dos acciones sobre la misma solicitud, más un bloqueo con un mensaje para las que no identifican al comensal. Entra en 1 o 2 días. |
| Testeable | ✔ | Se prueba con solicitudes presenciales, de MercadoPago y sin comensal identificado, que crea el simulador. La eliminación se verifica en la tablet donde se elimina, y en las demás tablets se verifica por HU-06. HU-07.h2 se prueba con dos tablets. |

## Estimación

**5 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
