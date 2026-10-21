# HU-09. Cerrar sesión al terminar el turno

| | |
|---|---|
| **Épica** | E1. Acceso del mozo |
| **Prioridad** | Should |
| **RF que cubre** | RF-4 |
| **RNF y reglas que la condicionan** | RNF-5, RNF-8, RNF-9, RNF-10 |
| **Complejidad** | S: es una sola acción, con confirmación, que vuelve al inicio de sesión y conserva las marcas de "Atendido". |

## Historia

**Como** mozo,
**quiero** cerrar mi sesión al terminar el turno,
**para** que el mozo del turno siguiente use la tablet con su propia cuenta, sin perder los pedidos de ayuda que ya se atendieron.

## Camino feliz

- Hay un botón "Cerrar sesión".
- Al apretarlo, la app pide confirmación.
- Al confirmar, la app vuelve al inicio de sesión y otro mozo puede entrar.
- Si un mozo cierra sesión en medio del turno y vuelve a entrar, ve el salón igual que antes: las mesas, los pedidos y las marcas de "Atendido".

## Criterios de aceptación

### Camino feliz

**HU-09.c1 · Cerrar sesión pide confirmación**

- **Dado** que el mozo inició sesión
- **Cuando** aprieta "Cerrar sesión"
- **Entonces** la app le pide confirmación antes de cerrarla

**HU-09.c2 · Otro mozo puede entrar**

- **Dado** que la app pide confirmación para cerrar sesión
- **Cuando** el mozo confirma
- **Entonces** la app muestra el inicio de sesión
- **Y** otro mozo puede entrar con su cuenta

**HU-09.c3 · Volver a entrar en medio del turno**

- **Dado** que un mozo cerró sesión en medio del turno
- **Cuando** vuelve a entrar
- **Entonces** ve las mismas mesas, los mismos pedidos y las mismas marcas de "Atendido" que antes de cerrar sesión

### Huecos

**HU-09.h1 · Cancelar la confirmación** (RNF-9)

- **Dado** que la app pide confirmación para cerrar sesión
- **Cuando** el mozo la cancela
- **Entonces** sigue en la pantalla donde estaba, con la sesión iniciada

**HU-09.h2 · Sin vuelta atrás** (RF-4, RNF-8)

- **Dado** que el mozo cerró sesión
- **Cuando** alguien usa el botón "Atrás" de la tablet o vuelve a abrir la app
- **Entonces** se ve el inicio de sesión
- **Y** no se ve ninguna pantalla de la operación

**HU-09.h3 · Sin avisos después de cerrar sesión**

- **Dado** que nadie inició sesión en la tablet
- **Cuando** un comensal confirma un pedido o pide pagar en persona
- **Entonces** la app no muestra ningún aviso ni emite ningún sonido

**HU-09.h4 · Cerrar sesión sin conexión**

- **Dado** que la tablet no tiene conexión
- **Cuando** el mozo cierra sesión y confirma
- **Entonces** la app vuelve igual al inicio de sesión

**HU-09.h5 · Otro mozo ve las mismas marcas** (RF-4)

- **Dado** que el mozo A marcó como atendida una mesa y cerró sesión
- **Cuando** el mozo B entra en la misma tablet
- **Entonces** esa mesa sigue sin el ícono de ayuda

### Descartados

- **HU-09.h6 · Dónde está el botón:** dónde está el botón es diseño de pantalla.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Que las marcas de "Atendido" se mantengan (HU-09.c3 y HU-09.h5) solo se puede verificar con HU-10. |
| Negociable | ✔ | Dónde está la acción y el texto de la confirmación se pueden ajustar. |
| Valiosa | ✔ | Permite que varios mozos compartan la tablet entre turnos. |
| Estimable | ✔ | El comportamiento está definido en RF-4 y RNF-9. |
| Pequeña | ✔ | Una sola acción con su confirmación. Entra en menos de 1 día. |
| Testeable | ✔ | Se cierra la sesión, otro mozo inicia la suya y se verifica que los avisos atendidos siguen ocultos. También se prueba sin conexión y con el botón "Atrás" de la tablet. |

## Estimación

**2 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
