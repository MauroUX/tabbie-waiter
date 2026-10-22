# TK-15 · Carga de una mesa con pedidos cobrados

| | |
|---|---|
| **Tipo** | Datos |
| **Origen** | [HU-04](../historias/HU-04-cocina-y-cancelacion.md), INVEST, Testeable: "Se prueba con pedidos confirmados, pedidos en cocina y pedidos con un cobro parcial"; [estructura.md](../../architecture/estructura.md), sección 3, ejemplo del tipo de datos: "una mesa con pedidos ya cobrados para HU-04" |

## Objetivo

Cargar, sobre los datos iniciales, una mesa ocupada del restaurante 1 con un pedido cobrado del todo, uno cobrado en parte y otros sin cobrar, para probar que la app no cancela lo que tiene algo cobrado.

## Criterios heredados

- [HU-04.c3](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · No se cancela lo que tiene algo cobrado. **En parte:** que T05 devuelve la mesa con un pedido `isPaid` y uno con `quantityPaid > 0`. El criterio completo es de [TK-17](TK-17-cancelar-pedidos.md).
- [HU-04.h6](../historias/HU-04-cocina-y-cancelacion.md#criterios-de-aceptación) · Selección mixta. **En parte:** que la misma mesa tiene también pedidos sin nada cobrado. El criterio completo es de TK-17.

## Alcance

**Incluye** una carga aparte de los datos iniciales, con:

- **La sesión de mesa:** activa (`closedAt` nulo), con su mesa en `isBusy = true` y `activeSessionId` apuntando a ella, y sus comensales en `table_session_users_user`.
- **Los pedidos**, confirmados o en cocina, con sus líneas, su producto y su `confirmedAt`:
  - uno cobrado del todo: `isPaid = true` y `paidAt`;
  - uno cobrado en parte: una línea con `quantityPaid` entre 1 y `quantity`, y `isPaid = false`;
  - al menos dos sin nada cobrado, uno en "Pendientes" y otro en "Ingresadas", para que "todos" deje afuera los cobrados en las dos pestañas.
- **Los cobros:** filas de `payment` con `currency = 'UYU'`, un `method` de los que escribe la cadena del mozo y la sesión; `amountPaid` y `tips` de la sesión iguales a lo que suman esos cobros; `total` igual al que calcula la copia (los pedidos que no están `pending` ni `canceled`).

**No incluye:**

- El cobro que llega durante la selección (HU-04.h7): lo genera el simulador en [TK-04](TK-04-simulador-cobros.md).
- Los datos iniciales: [TK-02](TK-02-datos-iniciales.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `replica/datos-iniciales/`.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 2): las tablas que lee `RestaurantsModule` en T05 y que escribe `TableSessionModule` en T11 y T12. Ningún componente de la app.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T05, que tiene que devolver la mesa con su árbol de ítems y sus marcas de cobro; y T07, que tiene que devolver sus cobros.

## Requisitos de prueba del backlog

Ninguno de la lista del backlog: es el "cobro parcial" que pide la nota de Testeable de HU-04.

## Dependencias

- [TK-02](TK-02-datos-iniciales.md): el restaurante 1, sus mesas, su menú y sus usuarios.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de la parte de HU-04.c3 y HU-04.h6.
2. Escribir las pruebas primero, y verlas fallar: la carga sobre los datos iniciales, T05 y T07 con el JWT del primer mozo del restaurante 1, y la carga repetida.
3. Leer en la copia qué escriben T11 y T12 en `table_session`, `payment`, `order` y `order_product_details`, y escribir la carga con los mismos valores ([modelo-de-datos.md](../../architecture/modelo-de-datos.md), secciones 2.4, 2.6, 2.7 y 2.13).
4. Comprobar que el `total` de la sesión es el que la copia recalcula al cancelar un pedido sin cobro (C6).
5. Documentar la carga y cómo se deshace en [infraestructura.md](../../architecture/infraestructura.md).
6. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Datos](../definition-of-done.md#datos).
- **Propio del ticket:**
  - **Cómo se deshace:** recreando la base y volviendo a cargar los datos iniciales. Si la mesa elegida ya está ocupada, la carga falla en alto y no escribe nada.
  - La mesa queda tal como la dejarían T11 y T12: T05 y T07 no distinguen esta carga de una mesa cobrada por la app.

## Riesgos y decisiones pendientes

- **C6 y RA-5** ([seguridad.md](../../architecture/seguridad.md)): "Cancelar no revierte `isPaid`, `quantityPaid` ni `amountPaid`". Si la carga no respeta lo que escribe la copia, la prueba de HU-04.c3 pasa por una razón equivocada.
- **Modelo de datos, sección 4:** "`table.activeSessionId` no es una FK"; "`payment.method` no es un enum".
- **Pendiente:** cómo se cargan los datos, con el seeder de la copia o por fuera ([componentes.md](../../architecture/componentes.md), "Decisiones pendientes").
