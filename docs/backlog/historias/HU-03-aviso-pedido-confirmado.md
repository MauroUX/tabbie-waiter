# HU-03. Enterarme de cada pedido confirmado

| | |
|---|---|
| **Épica** | E2. Vista del salón en tiempo real |
| **Prioridad** | Must |
| **RF que cubre** | RF-10, RF-11, RF-12 |
| **RNF y reglas que la condicionan** | RNF-1, RNF-4, RNF-7, RNF-10 |
| **Complejidad** | M: el canal y la reconexión vienen del walking skeleton, pero la historia suma al aviso un sonido propio, un contador que parpadea en dos lugares y un solo aviso por cada conjunto de pedidos. |

## Historia

**Como** mozo,
**quiero** recibir un aviso con el número de mesa cada vez que un comensal confirma un pedido,
**para** que ningún pedido quede esperando sin que me entere.

## Camino feliz

- Cuando un comensal confirma un pedido, el pedido aparece en "Pendientes", en la tarjeta de su mesa, y la app muestra un aviso con el número de mesa.
- La app emite un sonido propio de "Nuevo pedido".
- Si el mozo está en otra sección, el botón "Órdenes" parpadea de forma llamativa y muestra cuántos pedidos hay sin mandar a cocina.
- Si el mozo está en "Ingresadas", la pestaña "Pendientes" parpadea y muestra el mismo contador.

## Criterios de aceptación

### Camino feliz

**HU-03.c1 · Aviso del pedido confirmado**

- **Dado** que el mozo inició sesión
- **Cuando** un comensal de la mesa 7 confirma un pedido
- **Entonces** el pedido aparece en "Pendientes", en la tarjeta de la mesa 7
- **Y** la app muestra un aviso con el número de mesa 7

**HU-03.c2 · Sonido de "Nuevo pedido"**

- **Dado** que el mozo inició sesión
- **Cuando** un comensal confirma un pedido
- **Entonces** la app emite el sonido de "Nuevo pedido", que no se usa para ningún otro aviso

**HU-03.c3 · El botón "Órdenes" parpadea con el contador**

- **Dado** que el mozo está en "Pagos" o en la impresora virtual y hay 2 pedidos sin mandar a cocina
- **Cuando** un comensal confirma otro pedido
- **Entonces** el botón "Órdenes" parpadea
- **Y** muestra el número 3

**HU-03.c4 · La pestaña "Pendientes" parpadea con el contador**

- **Dado** que el mozo está en "Ingresadas" y hay 2 pedidos sin mandar a cocina
- **Cuando** un comensal confirma otro pedido
- **Entonces** la pestaña "Pendientes" parpadea
- **Y** muestra el número 3

### Huecos

**HU-03.h1 · Tiempo del aviso** (RNF-1)

- **Dado** que hay conexión
- **Cuando** un comensal confirma un pedido
- **Entonces** el aviso y el pedido en "Pendientes" aparecen en 2 segundos o menos

**HU-03.h2 · Hora de confirmación** (RF-11, C4)

- **Dado** que un comensal confirmó un pedido
- **Cuando** llega el aviso
- **Entonces** la hora que muestra es la hora en que el comensal lo confirmó, no la hora en que llegó a la tablet

**HU-03.h3 · Aviso ilegible** (RF-12, C4)

- **Dado** que llega un aviso de pedido que la app no puede leer
- **Cuando** la app lo recibe
- **Entonces** no muestra ningún aviso ni emite el sonido
- **Y** el pedido igual aparece en "Pendientes" en 30 segundos o menos

**HU-03.h4 · Varios pedidos confirmados juntos** ("Qué es un pedido" (PRD), C4)

- **Dado** que un comensal confirma un conjunto de tres pedidos
- **Cuando** llegan los avisos
- **Entonces** la app muestra un solo aviso con el número de mesa
- **Y** emite un solo sonido
- **Y** el contador suma tres

**HU-03.h5 · El contador baja y el parpadeo se apaga**

- **Dado** que el botón "Órdenes" parpadea con el contador
- **Cuando** no quedan pedidos sin mandar a cocina, porque se mandaron o se cancelaron, también desde otra tablet
- **Entonces** el botón deja de parpadear
- **Y** no muestra ningún contador

**HU-03.h6 · Pedidos confirmados durante un corte** (RNF-4, contexto §5)

- **Dado** que un comensal confirmó un pedido mientras la tablet estaba sin conexión
- **Cuando** vuelve la conexión
- **Entonces** el pedido aparece en "Pendientes" en 5 segundos o menos
- **Y** el contador lo incluye, aunque no se muestre el aviso de ese pedido

**HU-03.h7 · Pedido de otro restaurante** (RNF-7)

- **Dado** que un comensal de otro restaurante confirma un pedido
- **Cuando** el mozo está en cualquier sección
- **Entonces** la app no muestra ningún aviso ni emite el sonido
- **Y** el contador no cambia

### Descartados

- **HU-03.h8 · Ya está en "Pendientes":** ya lo dice el camino feliz: el parpadeo es solo cuando el mozo está en otra sección.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actualiza la mesa que muestra HU-02, y el contador baja con los envíos y las cancelaciones de HU-04 (HU-03.h5). |
| Negociable | ✔ | La forma y la duración del aviso, el sonido y el parpadeo se pueden ajustar. |
| Valiosa | ✔ | El mozo se entera de cada pedido nuevo en el tiempo de RNF-1, aunque esté en otra sección. |
| Estimable | ✔ | El canal de avisos lo deja el walking skeleton. Para HU-03.h4, el diseño define cómo se reconocen los pedidos de un mismo conjunto. |
| Pequeña | ✔ | Un único tipo de aviso, con su sonido y su contador en dos lugares. Entra en 1 o 2 días. |
| Testeable | ✔ | El simulador confirma pedidos sueltos y conjuntos de pedidos, y se mide el tiempo de RNF-1. El aviso ilegible se prueba con un aviso inválido, y el corte, sacándole la red a la tablet. HU-03.h7 se prueba con el segundo restaurante de los datos iniciales (README, requisitos de prueba). |

## Estimación

_Pendiente._
