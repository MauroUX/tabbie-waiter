# HU-01. Iniciar sesión y mantenerla todo el turno

| | |
|---|---|
| **Épica** | E1. Acceso del mozo |
| **Prioridad** | Must |
| **RF que cubre** | RF-1, RF-2, RF-3 |
| **RNF y reglas que la condicionan** | RNF-5, RNF-7, RNF-8, RNF-10 |
| **Complejidad** | M: rechazo de los usuarios que no son mozos y una renovación de la sesión que el mozo no nota. |

## Historia

**Como** mozo,
**quiero** entrar a la app con mi cuenta y que la sesión dure todo el turno,
**para** atender el salón sin interrupciones, sabiendo que solo el personal de salón puede operar la tablet.

## Camino feliz

- El mozo entra con su email y contraseña.
- Al entrar, ve la sección "Órdenes" de su restaurante.
- Si entra alguien que no es mozo, la app le explica que no tiene acceso, cierra la sesión y no le muestra ninguna pantalla de la operación.
- La sesión se renueva sola durante todo el turno, sin que el mozo se entere.
- Si la renovación falla, la app vuelve al inicio de sesión.

## Criterios de aceptación

### Camino feliz

**HU-01.c1 · Entrar con email y contraseña**

- **Dado** que el mozo tiene una cuenta de mozo con email y contraseña
- **Cuando** entra con su email y su contraseña
- **Entonces** la app muestra la sección "Órdenes" con las mesas de su restaurante

**HU-01.c2 · Rechazo de quien no es mozo**

- **Dado** que una persona tiene una cuenta que no es de mozo
- **Cuando** entra con su email y su contraseña
- **Entonces** la app le muestra un mensaje que explica que no tiene acceso
- **Y** vuelve al inicio de sesión con la sesión cerrada
- **Y** en ningún momento muestra una pantalla de la operación

**HU-01.c3 · Renovación sin que el mozo se entere**

- **Dado** que el mozo está operando y su sesión está por vencer
- **Cuando** llega el momento del vencimiento
- **Entonces** el mozo sigue operando sin volver a iniciar sesión
- **Y** la app no le muestra ningún mensaje ni le pide datos

**HU-01.c4 · La renovación falla**

- **Dado** que la sesión del mozo está por vencer y la app no puede renovarla, por ejemplo porque la cuenta se dio de baja
- **Cuando** llega el momento del vencimiento
- **Entonces** la app muestra el inicio de sesión

### Huecos

**HU-01.h1 · Credenciales incorrectas**

- **Dado** que el mozo está en el inicio de sesión
- **Cuando** entra con un email o una contraseña incorrectos
- **Entonces** la app le avisa que los datos no son correctos
- **Y** sigue en el inicio de sesión, sin mostrar ninguna pantalla de la operación

**HU-01.h2 · Sin conexión al entrar** (RNF-4)

- **Dado** que la tablet no tiene conexión
- **Cuando** el mozo intenta iniciar sesión
- **Entonces** la app le avisa que no hay conexión
- **Y** sigue en el inicio de sesión

**HU-01.h3 · La sesión sobrevive a un reinicio** (RNF-5, RNF-8)

- **Dado** que el mozo inició sesión
- **Cuando** la app se cierra o la tablet se reinicia y se vuelve a abrir la app
- **Entonces** el mozo ve "Órdenes" sin volver a escribir sus datos

**HU-01.h4 · La sesión vence durante un corte** (RF-3, RNF-4, RNF-5)

- **Dado** que la sesión del mozo venció mientras la tablet estaba sin conexión
- **Cuando** vuelve la conexión
- **Entonces** la app renueva la sesión sola
- **Y** actualiza las mesas en 5 segundos o menos, sin pedirle datos al mozo

**HU-01.h5 · El rechazo no deja la sesión guardada** (RF-2, RNF-8)

- **Dado** que un usuario que no es mozo fue rechazado
- **Cuando** se cierra y se vuelve a abrir la app
- **Entonces** la app muestra el inicio de sesión
- **Y** no muestra ninguna pantalla de la operación

**HU-01.h6 · Solo su restaurante** (RNF-7)

- **Dado** que hay mesas ocupadas en dos restaurantes
- **Cuando** entra un mozo del restaurante A
- **Entonces** en "Órdenes" ve solo las mesas del restaurante A

### Descartados

- **HU-01.h8 · Campos vacíos:** es un detalle de pantalla, no una regla del acceso.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✔ | Es la base de las demás historias y no depende de ninguna. |
| Negociable | ✔ | La forma de presentar el rechazo, los errores de acceso y la renovación se puede ajustar. |
| Valiosa | ✔ | Sin sesión no hay operación del turno. |
| Estimable | ✔ | La forma de entrar, los casos de rechazo y la renovación están definidos en el PRD. |
| Pequeña | ✔ | Tres RF de un solo flujo de acceso. Los huecos suman casos de error, no pantallas nuevas. Entra en 1 o 2 días. |
| Testeable | ✔ | Se prueba con una cuenta de mozo, una de otro rol, un vencimiento de sesión corto en la réplica y cortes de red provocados. HU-01.h6 se prueba con el segundo restaurante de los datos iniciales (README, requisitos de prueba). |

## Estimación

**5 puntos.** Estimación de la IA, aceptada por el humano sin planning poker.
