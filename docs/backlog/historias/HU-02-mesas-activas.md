# HU-02. Ver las mesas activas y sus pedidos

| | |
|---|---|
| **Épica** | E2. Vista del salón en tiempo real |
| **Prioridad** | Must |
| **RF que cubre** | RF-5, RF-6, RF-7, RF-8, RF-9 |
| **RNF y reglas que la condicionan** | RNF-2, RNF-3, RNF-4, RNF-7, RNF-8, RNF-10 |
| **Complejidad** | M: es la vista central del turno, con muchos datos por mesa, un cronómetro con los umbrales del restaurante y sin datos sensibles. |

## Historia

**Como** mozo,
**quiero** ver las mesas ocupadas con sus pedidos, sus comensales, el total, lo pagado, cuánto tiempo lleva ocupada cada una y la demora,
**para** saber en todo momento qué mesa necesita atención y darle prioridad a la que más espera.

## Camino feliz

- Una vez dentro, el mozo ve la navegación principal con "Órdenes" y "Pagos".
- En "Órdenes" hay una tarjeta por cada mesa ocupada, con sus pedidos agrupados por categoría.
- "Órdenes" tiene dos pestañas:
  - "Pendientes", con los pedidos que el comensal confirmó y todavía no se mandaron a cocina;
  - "Ingresadas", con los que ya se mandaron y están en preparación.
- Cada tarjeta muestra los comensales, el total, lo pagado, cuánto tiempo lleva ocupada la mesa y si pidió ayuda.
- Cada tarjeta cambia de color según la demora, que se cuenta desde el pedido confirmado más antiguo de la mesa, con los umbrales del restaurante.

## Criterios de aceptación

### Camino feliz

**HU-02.c1 · Navegación principal**

- **Dado** que el mozo inició sesión
- **Cuando** mira la pantalla de la operación
- **Entonces** ve la navegación principal con "Órdenes" y "Pagos"

**HU-02.c2 · Una tarjeta por mesa ocupada**

- **Dado** que el restaurante tiene tres mesas ocupadas y dos libres
- **Cuando** el mozo abre "Órdenes"
- **Entonces** ve tres tarjetas, una por cada mesa ocupada, y ninguna de las mesas libres
- **Y** en cada tarjeta los pedidos aparecen agrupados por categoría

**HU-02.c3 · Pestañas "Pendientes" e "Ingresadas"**

- **Dado** que una mesa tiene un pedido confirmado que no se mandó a cocina y otro que ya se mandó
- **Cuando** el mozo mira las dos pestañas de "Órdenes"
- **Entonces** en "Pendientes" ve solo el primero
- **Y** en "Ingresadas" ve solo el segundo

**HU-02.c4 · Datos de la tarjeta**

- **Dado** que una mesa está ocupada hace 25 minutos, tiene dos comensales, un total de $5000, $2000 pagados y un pedido de ayuda
- **Cuando** el mozo mira su tarjeta
- **Entonces** ve los dos comensales, el total de $5000, $2000 pagados, 25 minutos de ocupación y el ícono de ayuda

**HU-02.c5 · Color según la demora**

- **Dado** que el restaurante configuró sus tres umbrales de demora
- **Cuando** el pedido confirmado más antiguo de la mesa supera cada umbral
- **Entonces** la tarjeta pasa a amarillo al superar el primero, a rojo al superar el segundo y a rojo parpadeante al superar el tercero
- **Y** el cronómetro muestra el tiempo transcurrido desde ese pedido

### Huecos

**HU-02.h1 · Una mesa que se ocupa** (RNF-2)

- **Dado** que el mozo está en "Órdenes"
- **Cuando** un comensal ocupa una mesa libre
- **Entonces** la tarjeta de esa mesa aparece en 30 segundos o menos

**HU-02.h2 · Una mesa con pedidos en una sola pestaña**

- **Dado** que una mesa ocupada no tiene pedidos en la pestaña abierta
- **Cuando** el mozo mira esa pestaña
- **Entonces** la tarjeta de la mesa aparece igual, con el texto "Sin pedidos"

**HU-02.h3 · El cronómetro sigue con todo en "Ingresadas"** (decisión del README sobre el cronómetro)

- **Dado** que todos los pedidos confirmados de una mesa ya están en "Ingresadas" y la mesa tiene saldo pendiente
- **Cuando** el mozo mira su tarjeta
- **Entonces** el cronómetro sigue contando desde el pedido confirmado más antiguo

**HU-02.h4 · El cronómetro desaparece al saldar** (decisión del README sobre el cronómetro)

- **Dado** que una mesa muestra el cronómetro
- **Cuando** la mesa queda saldada
- **Entonces** la tarjeta deja de mostrar el cronómetro
- **Y** sigue mostrando cuánto tiempo lleva ocupada

**HU-02.h5 · Sin datos sensibles** (RF-9, O4)

- **Dado** que una mesa tiene comensales registrados
- **Cuando** el mozo mira su tarjeta
- **Entonces** cada comensal aparece por su nombre
- **Y** en ninguna parte se ve un email ni una credencial de cobro del restaurante

**HU-02.h6 · Corte de conexión** (RNF-4)

- **Dado** que el mozo está en "Órdenes"
- **Cuando** la tablet pasa más de 5 segundos sin comunicarse
- **Entonces** la app muestra un aviso de que no hay conexión
- **Y** al volver la conexión, actualiza las mesas en 5 segundos o menos, sin que el mozo haga nada
- **Y** el aviso desaparece

**HU-02.h7 · Aislamiento** (RNF-7)

- **Dado** que otro restaurante tiene mesas ocupadas
- **Cuando** el mozo mira "Órdenes"
- **Entonces** no ve ninguna mesa de ese restaurante

**HU-02.h8 · El comensal cancela un pedido** (RF-6, RNF-2, C3)

- **Dado** que una mesa tiene un pedido en "Pendientes"
- **Cuando** el comensal lo cancela desde su app
- **Entonces** el pedido deja de verse en 30 segundos o menos
- **Y** el total de la mesa baja en su importe

### Descartados

Ninguno.

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✔ | Solo necesita la sesión de HU-01. |
| Negociable | ✔ | La forma de presentar cada mesa y la demora se puede ajustar. |
| Valiosa | ✔ | Es la vista con la que el mozo sigue el salón. |
| Estimable | ✔ | Los datos de cada mesa, los umbrales y el cronómetro están definidos en el PRD y en el README. |
| Pequeña | ✔ | Es solo de consulta, sin acciones que cambien datos. Los cortes y la actualización periódica vienen del walking skeleton. Entra en 1 o 2 días. |
| Testeable | ✔ | El simulador ocupa mesas, confirma y cancela pedidos, y se compara lo que muestra la tablet. HU-02.h7 necesita un segundo restaurante en los datos iniciales. |

## Estimación

_Pendiente._
