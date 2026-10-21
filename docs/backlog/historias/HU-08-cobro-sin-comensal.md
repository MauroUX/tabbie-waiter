# HU-08. Cobrar una solicitud que no identifica al comensal

| | |
|---|---|
| **Épica** | E5. Cobros |
| **Prioridad** | Must |
| **RF que cubre** | RF-25 |
| **RNF y reglas que la condicionan** | RNF-3, RNF-6, RNF-9, RNF-10 |
| **Complejidad** | M: toca cobros. Registra un cobro manual y elimina la solicitud con una sola confirmación, y resuelve los dos casos en que la eliminación no sale como se espera. |

## Historia

**Como** mozo,
**quiero** cobrar en persona una solicitud que no identifica al comensal,
**para** que el cobro quede registrado una sola vez aunque esa solicitud no se pueda confirmar como las demás.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

### Camino feliz

_Pendiente: se escriben cuando esté el camino feliz._

### Huecos

**HU-08.h1 · Solicitud sin comensal identificado** (RF-25, C11, README)

- **Dado** que una solicitud no identifica al comensal
- **Cuando** el mozo aprieta "Confirmar pago"
- **Entonces** la app le explica que se registrará como cobro manual, con el monto y la propina de la solicitud, y pide una sola confirmación
- **Y** al confirmar, el cobro aparece como "Pago manual"
- **Y** la solicitud desaparece

**HU-08.h2 · Esa solicitud supera el saldo** (RF-25, RF-18)

- **Dado** que una solicitud sin comensal identificado pide, sin propina, más que el saldo pendiente
- **Cuando** el mozo aprieta "Confirmar pago"
- **Entonces** la app no registra el cobro
- **Y** le indica el saldo pendiente

**HU-08.h3 · El cobro se registra y la solicitud no se elimina** (decisión del README sobre RF-25, RNF-6)

- **Dado** que el mozo confirmó el cobro de una solicitud sin comensal identificado
- **Cuando** el cobro se registra pero la solicitud no se puede eliminar
- **Entonces** la app avisa que el cobro quedó registrado y que la solicitud sigue en la lista
- **Y** la solicitud muestra "Eliminar"
- **Y** no se ofrece repetir el cobro

**HU-08.h4 · La solicitud ya no existe** (decisión del README sobre RF-25)

- **Dado** que el mozo confirmó el cobro de una solicitud sin comensal identificado
- **Cuando** el cobro deja la mesa saldada y el sistema ya quitó la solicitud
- **Entonces** la app confirma el cobro sin mostrar ningún error
- **Y** la solicitud ya no aparece en la lista

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actúa sobre las solicitudes que muestra HU-06, parte del "Confirmar pago" de HU-07 y registra el cobro como el cobro manual de HU-05. |
| Negociable | ✔ | La forma de explicar por qué no se confirma y de ofrecer el cobro manual se puede ajustar. |
| Valiosa | ✔ | Evita los cobros que fallan y aun así suman el monto. |
| Estimable | ✔ | El camino de RF-25 y sus dos casos de falla están definidos en el README. |
| Pequeña | ✔ | Un solo camino de cobro con dos casos de falla. Entra en 1 o 2 días. |
| Testeable | ✔ | El simulador crea solicitudes sin comensal identificado, con montos menores y mayores que el saldo. HU-08.h3 necesita provocar que falle la eliminación después de registrar el cobro, con una forma que se define en el plan de pruebas. |

## Estimación

_Pendiente._
