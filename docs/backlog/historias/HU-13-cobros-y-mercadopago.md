# HU-13. Ver los cobros de cada mesa y lo que llega por MercadoPago

| | |
|---|---|
| **Épica** | E5. Cobros |
| **Prioridad** | Must |
| **Lote** | Ampliación (DP-03) |
| **RF que cubre** | RF-23 |
| **RNF y reglas que la condicionan** | RNF-2, RNF-10, RF-9, RF-21, RF-24, RF-26 |
| **Complejidad** | S: una vista acotada, solo de consulta, sin acciones ni comportamiento entre tablets. |

> **Origen:** sale de la partición de HU-06 en la revisión de la Entrega 1 (DP-03). Sus criterios anotan el ID que tenían en HU-06. El indicador de "Pagos" (RF-21) es de HU-06; esta historia comprueba que no cuenta las solicitudes de MercadoPago. Recibió también, de HU-07, los dos criterios de las solicitudes de MercadoPago (DP-38): confirmar (RF-24) y eliminar (RF-26) siguen siendo de HU-07, y acá se comprueba que una solicitud de MercadoPago solo se elimina.

## Historia

**Como** mozo,
**quiero** ver los cobros ya registrados de cada mesa y lo que llega por MercadoPago,
**para** saber qué se pagó antes de cerrarla.

## Camino feliz

- Los cobros ya registrados aparecen en la tarjeta de su mesa en "Pagos", marcados como pagados. Los manuales figuran como "Pago manual".
- Las solicitudes de MercadoPago aparecen en la tarjeta de su mesa, marcadas como MercadoPago, y el número de "Pagos" no las cuenta.
- Las solicitudes de MercadoPago no tienen "Confirmar pago", pero se pueden eliminar.

## Criterios de aceptación

### Camino feliz

**HU-13.c1 · Cobros registrados** (antes HU-06.c3)

- **Dado** que una mesa tiene un cobro de un comensal y un cobro manual
- **Cuando** el mozo mira su tarjeta en "Pagos"
- **Entonces** los dos cobros aparecen marcados como pagados
- **Y** el cobro manual figura como "Pago manual"

**HU-13.c2 · Indicador sobre "Pagos"** (antes HU-06.c4)

- **Dado** que hay dos solicitudes presenciales y una de MercadoPago
- **Cuando** el mozo mira la navegación principal
- **Entonces** el botón "Pagos" muestra el número 2

**HU-13.c3 · Solicitudes de MercadoPago** (antes HU-07.c4)

- **Dado** que una mesa tiene una solicitud de MercadoPago
- **Cuando** el mozo mira su tarjeta en "Pagos"
- **Entonces** ve la solicitud
- **Y** la solicitud no tiene el botón "Confirmar pago"

### Huecos

**HU-13.h1 · Solicitud de MercadoPago** (RF-21, RNF-2, contexto §3.3) (antes HU-06.h2)

- **Dado** que un comensal empieza a pagar con MercadoPago
- **Cuando** el mozo mira "Pagos"
- **Entonces** la solicitud aparece en la tarjeta de su mesa en 30 segundos o menos, marcada como MercadoPago
- **Y** el número de "Pagos" no cambia

**HU-13.h2 · Cobro de MercadoPago** (RF-23, RNF-2) (antes HU-06.h8)

- **Dado** que un comensal termina de pagar con MercadoPago
- **Cuando** el mozo mira "Pagos"
- **Entonces** el cobro aparece en la tarjeta de su mesa, marcado como pagado y con el nombre del comensal, en 30 segundos o menos

**HU-13.h3 · MercadoPago solo se elimina** (RF-26, C12) (antes HU-07.h3)

- **Dado** que una solicitud es de MercadoPago
- **Cuando** el mozo mira el ítem
- **Entonces** el ítem no tiene "Confirmar pago"
- **Y** sí tiene "Eliminar", igual que las solicitudes presenciales

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Agrega los cobros a las tarjetas de "Pagos" de HU-06, y el indicador es de HU-06. HU-13.h3 usa "Eliminar" de HU-07. |
| Negociable | ✔ | La forma de marcar los cobros y las solicitudes de MercadoPago se puede ajustar. |
| Valiosa | ✔ | El mozo ve qué se pagó antes de cerrar la mesa, también por MercadoPago. |
| Estimable | ✔ | La lista de cobros y la marca de MercadoPago están definidas en el PRD. |
| Pequeña | ✔ | Una lista más por mesa, una marca y la regla de no confirmar MercadoPago. Entra en 1 día. |
| Testeable | ✔ | Los cobros se generan con el simulador (un cobro del comensal y uno manual con la cuenta del segundo mozo). Lo de MercadoPago se genera sin su API: la solicitud se escribe directo en Redis y el cobro se inserta como fila en MySQL (DP-23). |

## Estimación

**3 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
