# HU-10. Dar por atendido un pedido de ayuda

| | |
|---|---|
| **Épica** | E4. Pedidos de ayuda |
| **Prioridad** | Should |
| **RF que cubre** | RF-16 |
| **RNF y reglas que la condicionan** | RNF-8, RNF-10 |
| **Complejidad** | S: es una sola acción, pero tiene comportamiento entre tablets y es el único dato de la operación que queda guardado en la tablet. |

## Historia

**Como** mozo,
**quiero** dar por atendido un pedido de ayuda,
**para** que el aviso deje de llamarme la atención y pueda concentrarme en las mesas que sí me necesitan.

## Camino feliz

- Cuando una mesa pide ayuda, su tarjeta muestra un ícono llamativo, en "Órdenes" y en "Pagos".
- Al tocar el ícono en cualquiera de las dos tarjetas, la ayuda queda atendida y el ícono desaparece de las dos.
- La marca vale solo en esta tablet: las demás siguen mostrando el ícono.

## Criterios de aceptación

### Camino feliz

**HU-10.c1 · Ícono de ayuda en las dos vistas**

- **Dado** que el mozo inició sesión
- **Cuando** una mesa pide ayuda
- **Entonces** la tarjeta de esa mesa muestra el ícono de ayuda en "Órdenes" y en "Pagos"

**HU-10.c2 · Dar por atendida la ayuda**

- **Dado** que una mesa muestra el ícono de ayuda
- **Cuando** el mozo toca el ícono en su tarjeta de "Órdenes" o en la de "Pagos"
- **Entonces** el ícono desaparece de las dos tarjetas
- **Y** la app no pide confirmación

**HU-10.c3 · La marca vale solo en esta tablet**

- **Dado** que el mozo de la tablet A dio por atendida la ayuda de una mesa
- **Cuando** se mira esa mesa en otra tablet
- **Entonces** la otra tablet sigue mostrando el ícono de ayuda (se prueba con dos tablets en HU-10.h1)

### Huecos

**HU-10.h1 · Con dos tablets** (RF-16, README)

- **Dado** que las tablets A y B muestran el ícono de ayuda de una mesa
- **Cuando** el mozo de la tablet A la marca como atendida
- **Entonces** la tablet A deja de mostrar el ícono
- **Y** pasados 30 segundos, la tablet B lo sigue mostrando, en "Órdenes" y en "Pagos"

**HU-10.h2 · La marca sobrevive a un reinicio** (RNF-8)

- **Dado** que el mozo marcó una mesa como atendida
- **Cuando** la app se cierra o la tablet se reinicia
- **Entonces** al volver, la mesa sigue sin el ícono

**HU-10.h3 · Mesa que se cierra y se vuelve a ocupar** (RF-16, C7)

- **Dado** que una mesa marcada como atendida se cierra y vuelve a ocuparse
- **Cuando** los nuevos comensales piden ayuda
- **Entonces** el ícono se muestra en su tarjeta

**HU-10.h4 · Límite conocido: segundo pedido de ayuda** (O1, E4)

- **Dado** que una mesa ya está marcada como atendida
- **Cuando** la misma ocupación vuelve a pedir ayuda
- **Entonces** el ícono sigue oculto en esa tablet

**HU-10.h5 · Tiempo del aviso de ayuda** (RNF-2)

- **Dado** que el mozo está en "Órdenes" o en "Pagos"
- **Cuando** un comensal pide ayuda
- **Entonces** el ícono aparece en las dos tarjetas de su mesa en 30 segundos o menos

**HU-10.h6 · Atendido sin conexión** (C7)

- **Dado** que la tablet no tiene conexión
- **Cuando** el mozo toca el ícono de ayuda
- **Entonces** la ayuda queda atendida igual
- **Y** el ícono desaparece de las dos tarjetas

**HU-10.h7 · Las marcas se conservan cuando falla la renovación de la sesión** (RF-4, RNF-8)

- **Dado** que la tablet tiene marcas de "Atendido" y la renovación de la sesión falló
- **Cuando** el mozo vuelve a entrar
- **Entonces** las mesas que tenía marcadas siguen sin el ícono de ayuda

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actúa sobre el ícono de ayuda que muestran las tarjetas de HU-02 y de HU-06. |
| Negociable | ✔ | La forma de la acción y del ícono se puede ajustar. |
| Valiosa | ✔ | Hoy el aviso queda encendido hasta que se cierra la mesa. |
| Estimable | ✔ | El alcance (solo esa tablet, hasta que se cierra la mesa, en las dos vistas) está definido en el PRD. |
| Pequeña | ✔ | Una sola acción, disponible en dos vistas. Entra en 1 día. |
| Testeable | ✔ | El simulador pide ayuda, también dos veces en la misma ocupación (HU-10.h4). Se prueba con dos tablets según el README: la tablet B sigue mostrando el ícono pasados 30 segundos. También se prueba reiniciando la app, sin conexión, con una mesa que se cierra y se vuelve a ocupar y con una renovación de la sesión que falla (HU-10.h7), usando el vencimiento corto de la sesión en la réplica. |

## Estimación

**2 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
