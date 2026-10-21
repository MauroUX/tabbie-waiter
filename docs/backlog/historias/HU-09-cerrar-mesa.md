# HU-09. Cerrar una mesa

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

- En "Pagos", la tarjeta de cada mesa tiene el botón "Cerrar mesa".
- Al apretarlo, aparece un diálogo de confirmación que informa si la mesa pagó el total.
- Si queda saldo pendiente, el diálogo muestra una advertencia clara, pero deja cerrar.
- Al confirmar, la mesa deja de aparecer entre las activas.

## Criterios de aceptación

### Camino feliz

**HU-09.c1 · Botón "Cerrar mesa"**

- **Dado** que el mozo está en "Pagos"
- **Cuando** mira la tarjeta de una mesa activa
- **Entonces** ve el botón "Cerrar mesa" al pie de los cobros de esa mesa

**HU-09.c2 · Confirmación de una mesa que pagó el total**

- **Dado** que una mesa pagó el total
- **Cuando** el mozo aprieta "Cerrar mesa"
- **Entonces** aparece un diálogo de confirmación que informa que la mesa pagó el total

**HU-09.c3 · Advertencia de saldo pendiente**

- **Dado** que una mesa tiene un saldo pendiente de $1000
- **Cuando** el mozo aprieta "Cerrar mesa"
- **Entonces** el diálogo advierte que quedan $1000 sin cobrar
- **Y** la acción de confirmar el cierre sigue disponible

**HU-09.c4 · La mesa deja de estar activa**

- **Dado** que el diálogo de cierre está abierto
- **Cuando** el mozo confirma
- **Entonces** la mesa deja de aparecer en "Órdenes" y en "Pagos"

### Huecos

**HU-09.h1 · Cancelar el diálogo** (RNF-9)

- **Dado** que el diálogo de cierre está abierto
- **Cuando** el mozo lo cancela
- **Entonces** la mesa sigue activa, en "Órdenes" y en "Pagos"

**HU-09.h2 · Doble toque** (RF-29, C13)

- **Dado** que el cierre de una mesa está en curso
- **Cuando** el mozo vuelve a tocar "Cerrar mesa" o confirmar
- **Entonces** la acción no está disponible
- **Y** al terminar, la mesa deja de verse en "Órdenes" y en "Pagos"

**HU-09.h3 · El cierre falla** (RNF-6)

- **Dado** que el mozo confirmó el cierre
- **Cuando** la acción falla o no responde
- **Entonces** la app no la repite sola
- **Y** actualiza las mesas
- **Y** la mesa deja de verse si se cerró, o sigue con "Cerrar mesa" disponible si no se cerró

**HU-09.h4 · Mesa ya cerrada en otra tablet** (C13, RNF-2)

- **Dado** que la tablet A tiene abierto el diálogo de cierre de una mesa
- **Cuando** la tablet B ya la cerró y el mozo de la tablet A confirma
- **Entonces** la app no la vuelve a cerrar
- **Y** avisa que la mesa ya estaba cerrada
- **Y** la quita de la lista

**HU-09.h5 · Solicitudes pendientes al cerrar** (C9, RF-22)

- **Dado** que la mesa tiene solicitudes de cobro pendientes
- **Cuando** el mozo la cierra
- **Entonces** sus solicitudes dejan de verse
- **Y** el número de "Pagos" baja

**HU-09.h6 · Montos en el diálogo**

- **Dado** que el mozo aprieta "Cerrar mesa"
- **Cuando** se abre el diálogo
- **Entonces** el diálogo muestra el total, lo pagado y el saldo pendiente de la mesa

**HU-09.h7 · Diferencia por redondeo** (contexto §4, M-3)

- **Dado** que a la mesa le faltan $0,01 o menos para el total
- **Cuando** se abre el diálogo de cierre
- **Entonces** el diálogo informa que la mesa pagó el total, sin advertencia

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Solo se ofrece para las mesas activas de HU-02, y usa su saldo para advertir. |
| Negociable | ✔ | El texto de la advertencia y de la confirmación se puede ajustar. |
| Valiosa | ✔ | Libera la mesa al final de la atención. |
| Estimable | ✔ | Las condiciones del cierre están definidas en el PRD. |
| Pequeña | ✔ | Una sola acción con su confirmación y su manejo de fallos. Entra en 1 día. |
| Testeable | ✔ | Se prueba con una mesa saldada, una con saldo pendiente, una a la que le faltan $0,01, un toque repetido durante el cierre y una mesa cerrada desde otra tablet (HU-09.h4). |

## Estimación

_Pendiente._
