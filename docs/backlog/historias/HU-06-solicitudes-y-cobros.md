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

- En "Pagos" hay una tarjeta por cada mesa activa. Si la mesa no tiene solicitudes ni cobros, la tarjeta aparece vacía.
- Cuando un comensal pide pagar en persona, en la tarjeta de su mesa aparece un ítem con los datos de la solicitud (comensal, monto y tipo de pago) y los botones "Confirmar pago" y "Eliminar".
- Los cobros ya registrados aparecen en la tarjeta marcados como pagados. Los manuales figuran como "Pago manual".
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

**HU-06.c3 · Cobros registrados**

- **Dado** que una mesa tiene un cobro de un comensal y un cobro manual
- **Cuando** el mozo mira su tarjeta en "Pagos"
- **Entonces** los dos cobros aparecen marcados como pagados
- **Y** el cobro manual figura como "Pago manual"

**HU-06.c4 · Indicador sobre "Pagos"**

- **Dado** que hay dos solicitudes presenciales y una de MercadoPago
- **Cuando** el mozo mira la navegación principal
- **Entonces** el botón "Pagos" muestra el número 2

### Huecos

**HU-06.h1 · Tiempo de una solicitud** (RNF-1)

- **Dado** que hay conexión
- **Cuando** un comensal pide pagar en persona
- **Entonces** el ítem aparece en la tarjeta de su mesa en 2 segundos o menos
- **Y** el número de "Pagos" sube en uno

**HU-06.h2 · Solicitud de MercadoPago** (RF-21, RNF-2, contexto §3.3)

- **Dado** que un comensal empieza a pagar con MercadoPago
- **Cuando** el mozo mira "Pagos"
- **Entonces** la solicitud aparece en la tarjeta de su mesa en 30 segundos o menos, marcada como MercadoPago
- **Y** el número de "Pagos" no cambia

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

**HU-06.h8 · Cobro de MercadoPago** (RF-23, RNF-2)

- **Dado** que un comensal termina de pagar con MercadoPago
- **Cuando** el mozo mira "Pagos"
- **Entonces** el cobro aparece en la tarjeta de su mesa, marcado como pagado y con el nombre del comensal, en 30 segundos o menos

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Agrupa las solicitudes y los cobros por las mesas de HU-02. |
| Negociable | ✔ | La forma de agrupar y de mostrar el indicador se puede ajustar. |
| Valiosa | ✔ | Es como el mozo sabe que tiene que ir a cobrar y qué falta cobrar. |
| Estimable | ✔ | El canal de avisos lo deja el walking skeleton. Las dos listas y el indicador están definidos en el PRD. |
| Pequeña | ✔ | Es la historia más grande del backlog, pero es solo de consulta. Entra en 1 o 2 días porque no construye el canal de avisos. Si al estimarla se pasa, se separa RF-23 (los cobros de cada mesa: HU-06.c3 y HU-06.h8). |
| Testeable | ✔ | El simulador crea solicitudes presenciales, de MercadoPago y sin comensal identificado. Lo que pasa en otra tablet se prueba con dos tablets (HU-06.h3), según el README. El vencimiento de una solicitud (HU-06.h4) necesita un vencimiento corto en la réplica (README, requisitos de prueba). |

## Estimación

**8 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
