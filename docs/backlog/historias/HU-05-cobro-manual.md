# HU-05. Registrar un cobro manual

| | |
|---|---|
| **Épica** | E5. Cobros |
| **Prioridad** | Must |
| **RF que cubre** | RF-17, RF-18, RF-19 |
| **RNF y reglas que la condicionan** | RNF-3, RNF-6, RNF-10 |
| **Complejidad** | M: toca cobros. Tiene un monto propuesto, una propina, un tope por el saldo pendiente y ninguna repetición automática. |

## Historia

**Como** mozo,
**quiero** registrar lo que un comensal me paga en persona cuando no hay una solicitud de cobro,
**para** que lo cobrado quede registrado una sola vez y la mesa muestre su saldo real.

## Camino feliz

- La tarjeta de la mesa en "Órdenes" tiene el botón "Registrar cobro".
- El diálogo propone el saldo pendiente de la mesa y permite sumar propina.
- Al registrarlo, lo pagado de la mesa se actualiza.
- En "Pagos", el cobro aparece en la mesa como "Pago manual".

## Criterios de aceptación

### Camino feliz

**HU-05.c1 · Botón en la tarjeta de la mesa**

- **Dado** que una mesa tiene saldo pendiente
- **Cuando** el mozo mira su tarjeta en "Órdenes"
- **Entonces** ve el botón "Registrar cobro"

**HU-05.c2 · El diálogo propone el saldo**

- **Dado** que una mesa tiene un total de $5000 y $2000 pagados
- **Cuando** el mozo aprieta "Registrar cobro"
- **Entonces** el diálogo propone $3000
- **Y** permite sumar una propina

**HU-05.c3 · Lo pagado se actualiza**

- **Dado** que el diálogo propone $3000 para una mesa con $2000 pagados
- **Cuando** el mozo registra el cobro
- **Entonces** lo pagado de la mesa pasa a $5000
- **Y** la app no pide una confirmación aparte

**HU-05.c4 · El cobro aparece como "Pago manual"**

- **Dado** que el mozo registró un cobro manual de $3000 en una mesa
- **Cuando** abre "Pagos"
- **Entonces** en la tarjeta de esa mesa aparece un cobro de $3000 como "Pago manual"

### Huecos

**HU-05.h1 · Tope por el saldo** (RF-18)

- **Dado** que la mesa tiene un saldo pendiente de $100
- **Cuando** el mozo intenta registrar $120 sin propina
- **Entonces** la app no registra el cobro
- **Y** le indica que el máximo es $100

**HU-05.h2 · Cobro parcial** (RF-19)

- **Dado** que la mesa tiene un saldo de $100
- **Cuando** el mozo registra $40
- **Entonces** lo pagado sube $40
- **Y** el saldo queda en $60
- **Y** los pedidos todavía no figuran como pagados

**HU-05.h3 · El cobro salda la mesa** (RF-19, RF-15)

- **Dado** que la mesa tiene un saldo de $100
- **Cuando** el mozo registra $100
- **Entonces** los pedidos de la mesa figuran como pagados
- **Y** ya no se pueden cancelar

**HU-05.h4 · La propina va aparte** (C8, M-3)

- **Dado** que la mesa tiene un saldo de $100
- **Cuando** el mozo registra $100 más $10 de propina
- **Entonces** lo pagado sube $100
- **Y** en "Pagos" el cobro figura como "Pago manual" por $110

**HU-05.h5 · Corte durante el cobro** (RNF-6, M-2)

- **Dado** que el mozo registró un cobro
- **Cuando** la acción falla o no responde
- **Entonces** la app no lo repite sola
- **Y** actualiza la mesa antes de dejar intentarlo de nuevo
- **Y** si el cobro se había registrado, lo pagado ya lo incluye y el diálogo propone el saldo nuevo

**HU-05.h6 · Doble toque** (RNF-6, M-2)

- **Dado** que un cobro manual está en curso
- **Cuando** el mozo vuelve a tocar "Registrar"
- **Entonces** la acción no está disponible hasta que termina la primera
- **Y** queda un solo cobro registrado

**HU-05.h7 · Mesa saldada**

- **Dado** que la mesa no tiene saldo pendiente
- **Cuando** el mozo mira su tarjeta
- **Entonces** "Registrar cobro" no está disponible

**HU-05.h8 · El saldo cambia con el diálogo abierto** (RF-18, RNF-2)

- **Dado** que el diálogo propone $100
- **Cuando** antes de registrar, entra un cobro de $60 desde otro lugar y el mozo registra los $100
- **Entonces** la app no registra el cobro
- **Y** muestra el saldo actual de $40

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Necesita el saldo de la mesa que muestra HU-02. |
| Negociable | ✔ | La forma de cargar el monto y la propina se puede ajustar. |
| Valiosa | ✔ | Es el cobro en persona sin solicitud, y evita los cobros duplicados (M-2). |
| Estimable | ✔ | El tope, la propina y cómo queda registrado el cobro están definidos en el PRD. |
| Pequeña | ✔ | Una sola acción con su validación y su manejo de fallos. Entra en 1 o 2 días. |
| Testeable | ✔ | Se prueba con montos menores, iguales y mayores que el saldo, con propina, con un cobro que entra desde otro lugar con el diálogo abierto y con un corte de conexión durante el cobro. |

## Estimación

_Pendiente._
