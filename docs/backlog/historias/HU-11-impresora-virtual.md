# HU-11. Consultar la impresora virtual

| | |
|---|---|
| **Épica** | E7. Impresora virtual de comandas |
| **Prioridad** | Should |
| **RF que cubre** | RF-30, RF-31, RF-32 |
| **RNF y reglas que la condicionan** | RNF-1, RNF-2, RNF-7, RNF-10 |
| **Complejidad** | S: es solo de consulta, usa los mismos datos de las mesas activas y se llega a ella desde la navegación principal. |

## Historia

**Como** mozo,
**quiero** consultar los pedidos confirmados que todavía no se mandaron a cocina,
**para** revisar en un solo lugar lo que falta mandar a cocina en todo el salón, sin recorrer mesa por mesa.

## Camino feliz

- En la navegación principal hay un botón para ir a la impresora virtual.
- La impresora lista los pedidos confirmados de todas las mesas activas que todavía no se mandaron a cocina.
- Al tocar un pedido se ve su detalle.
- Es solo de consulta: no tiene acciones.

## Criterios de aceptación

### Camino feliz

**HU-11.c1 · Acceso desde la navegación principal**

- **Dado** que el mozo está en "Órdenes" o en "Pagos"
- **Cuando** toca el botón de la impresora virtual en la navegación principal
- **Entonces** ve la impresora virtual

**HU-11.c2 · Pedidos sin mandar a cocina de todas las mesas**

- **Dado** que tres mesas activas tienen pedidos confirmados sin mandar a cocina y también pedidos en "Ingresadas"
- **Cuando** el mozo abre la impresora virtual
- **Entonces** ve todos los pedidos sin mandar a cocina de las tres mesas
- **Y** no ve ninguno de los que están en "Ingresadas"

**HU-11.c3 · Detalle de un pedido**

- **Dado** que el mozo está en la impresora virtual
- **Cuando** toca un pedido
- **Entonces** ve el detalle de ese pedido

**HU-11.c4 · Solo de consulta**

- **Dado** que el mozo está en la lista o en el detalle de la impresora virtual
- **Cuando** recorre la pantalla
- **Entonces** no encuentra ninguna acción que cambie pedidos, cobros o mesas

### Huecos

**HU-11.h1 · Pedido nuevo en la impresora** (RNF-1)

- **Dado** que el mozo está en la impresora virtual
- **Cuando** un comensal confirma un pedido
- **Entonces** el pedido aparece en la lista en 2 segundos o menos

**HU-11.h2 · Pedido mandado a cocina o cancelado** (RF-30, RNF-2)

- **Dado** que un pedido está en la impresora
- **Cuando** se manda a cocina o se cancela, también desde otra tablet
- **Entonces** deja de verse en 30 segundos o menos

**HU-11.h3 · Mesa cerrada** (C14, RF-30)

- **Dado** que una mesa tiene pedidos sin mandar a cocina
- **Cuando** se cierra la mesa
- **Entonces** sus pedidos dejan de verse en la impresora

**HU-11.h5 · Contenido del detalle** ("Qué es un pedido" (PRD), RF-30)

- **Dado** que el mozo toca un pedido
- **Cuando** se abre el detalle
- **Entonces** muestra el plato, la cantidad, las opciones elegidas, el número de mesa y la hora de confirmación

**HU-11.h7 · Sin datos sensibles** (RF-9, O4)

- **Dado** que el mozo abre el detalle de un pedido
- **Cuando** lo mira
- **Entonces** no se ve el email del comensal ni ninguna credencial del restaurante

### Descartados

- **HU-11.h4 · Qué muestra cada fila y en qué orden:** las columnas y el orden de la lista son diseño de pantalla.
- **HU-11.h6 · Lista vacía:** el estado vacío lo cubre la DoD de frontend.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Usa los datos de las mesas activas de HU-02. |
| Negociable | ✔ | La forma de la lista y del detalle se puede ajustar. |
| Valiosa | ✔ | Hoy la impresora virtual existe, pero no se llega a ella desde ninguna pantalla. |
| Estimable | ✔ | El acceso y el contenido están definidos en el README y en el PRD. |
| Pequeña | ✔ | Una lista con su detalle, sin acciones. Entra en 1 día. |
| Testeable | ✔ | El simulador confirma pedidos en varias mesas y se compara con la lista. Se manda a cocina, se cancela y se cierra una mesa, y se verifica que sus pedidos dejan de verse. Además se verifica que no hay acciones que cambien datos. |

## Estimación

**2 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
