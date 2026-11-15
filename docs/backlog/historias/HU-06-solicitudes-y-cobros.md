# HU-06. Ver las solicitudes de cobro presencial de cada mesa

| | |
|---|---|
| **Épica** | E5. Cobros |
| **Prioridad** | Must |
| **Lote** | Lote 1 (DP-03) |
| **RF que cubre** | RF-20, RF-21, RF-22 |
| **RNF y reglas que la condicionan** | RNF-1, RNF-2, RNF-4, RNF-7, RNF-10, RF-9 |
| **Complejidad** | M: depende de los avisos en tiempo real y tiene comportamiento entre tablets, pero muestra una sola lista. |

> **Partición:** en la revisión de la Entrega 1, los cobros registrados de cada mesa (RF-23) y lo que llega por MercadoPago pasaron a [HU-13](HU-13-cobros-y-mercadopago.md), que va en la ampliación (DP-03). Los criterios que quedan acá conservan su ID. En el lote 1, "Pagos" muestra solo las solicitudes presenciales: las de MercadoPago no se ven ni se cuentan hasta HU-13 (DP-38).

## Historia

**Como** mozo,
**quiero** ver las solicitudes de cobro presencial de cada mesa,
**para** saber a qué mesa tengo que ir a cobrar.

## Camino feliz

- En "Pagos" hay una tarjeta por cada mesa activa. Si la mesa no tiene solicitudes, la tarjeta aparece vacía.
- Cuando un comensal pide pagar en persona, en la tarjeta de su mesa aparece un ítem con los datos de la solicitud (comensal, monto y tipo de pago) y los botones "Confirmar pago" y "Eliminar".
- El botón "Pagos" de la navegación muestra cuántas solicitudes hay, sin contar las de MercadoPago.

## Criterios de aceptación

### Camino feliz

**HU-06.c1 · Una tarjeta por mesa activa**

- **Dado** que hay dos mesas activas y una de ellas no tiene solicitudes ni cobros
- **Cuando** el mozo abre "Pagos"
- **Entonces** ve una tarjeta por cada mesa activa
- **Y** la tarjeta de la mesa sin solicitudes ni cobros aparece vacía

**HU-06.c2 · Ítem de una solicitud presencial**

- **Dado** que el mozo está en "Pagos"
- **Cuando** un comensal pide pagar en persona $1500
- **Entonces** en la tarjeta de su mesa aparece un ítem con el nombre del comensal, $1500 y el tipo de pago que eligió
- **Y** el ítem tiene los botones "Confirmar pago" y "Eliminar"

### Huecos

**HU-06.h1 · Tiempo de una solicitud** (RNF-1)

- **Dado** que hay conexión
- **Cuando** un comensal pide pagar en persona
- **Entonces** el ítem aparece en la tarjeta de su mesa en 2 segundos o menos
- **Y** el número de "Pagos" sube en uno

**HU-06.h3 · Con dos tablets: eliminación** (RF-22, README)

- **Dado** que las tablets A y B muestran la misma solicitud
- **Cuando** el mozo de la tablet A la elimina
- **Entonces** la tablet B deja de mostrarla en 30 segundos o menos
- **Y** su número de "Pagos" baja en uno

**HU-06.h4 · Solicitud resuelta por otra vía** (RF-22, C9, RNF-2)

- **Dado** que una mesa tiene una solicitud pendiente
- **Cuando** la solicitud se resuelve por otra vía: un cobro que deja la mesa saldada, el cierre de la mesa o el vencimiento de la solicitud
- **Entonces** deja de verse en 30 segundos o menos
- **Y** el número de "Pagos" baja

**HU-06.h5 · Solicitud creada durante un corte** (RNF-4)

- **Dado** que un comensal pidió pagar en persona mientras la tablet estaba sin conexión
- **Cuando** vuelve la conexión
- **Entonces** el ítem aparece en 5 segundos o menos
- **Y** el número de "Pagos" lo cuenta

**HU-06.h6 · Sin datos sensibles** (RF-9, O4)

- **Dado** que hay solicitudes y cobros en una mesa
- **Cuando** el mozo mira su tarjeta
- **Entonces** cada comensal aparece por su nombre
- **Y** no se ve ningún email

**HU-06.h7 · Solicitud sin comensal identificado**

- **Dado** que una solicitud no identifica al comensal
- **Cuando** el mozo mira el ítem
- **Entonces** en lugar del nombre dice "Comensal sin identificar"

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Agrupa las solicitudes por las mesas de HU-02. |
| Negociable | ✔ | La forma de agrupar y de mostrar el indicador se puede ajustar. |
| Valiosa | ✔ | Es como el mozo sabe que tiene que ir a cobrar. |
| Estimable | ✔ | El canal de avisos lo deja el walking skeleton. La lista y el indicador están definidos en el PRD. |
| Pequeña | ✔ | Es solo de consulta, con una lista por mesa y el indicador. Entra en 1 o 2 días porque no construye el canal de avisos. |
| Testeable | ✔ | El simulador crea solicitudes presenciales, con y sin comensal identificado. Lo que pasa en otra tablet se prueba con dos tablets (HU-06.h3), según el README. El vencimiento de una solicitud (HU-06.h4) necesita un vencimiento corto en la réplica (README, requisitos de prueba). |

## Estimación

**5 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
