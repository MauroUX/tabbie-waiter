# TK-14 · Datos de la tarjeta de la mesa y cronómetro de demora

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [HU-02](../historias/HU-02-mesas-activas.md) · Ver las mesas activas y sus pedidos (RF-7, RF-8, RF-9) |

## Objetivo

Que cada tarjeta de "Órdenes" muestre los comensales, el total, lo pagado, el tiempo de ocupación y el pedido de ayuda de la mesa, y cambie de color con la demora según los umbrales del restaurante, sin mostrar datos sensibles.

## Criterios heredados

- [HU-02.c4](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Datos de la tarjeta.
- [HU-02.c5](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Color según la demora.
- [HU-02.h3](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · El cronómetro sigue con todo en "Ingresadas".
- [HU-02.h4](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · El cronómetro desaparece al saldar.
- [HU-02.h5](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Sin datos sensibles.

## Alcance

**Incluye:**

- **Encabezado de la tarjeta:** los comensales por su nombre, el total, lo pagado, el tiempo de ocupación (desde el `createdAt` de la sesión de mesa) y el ícono de ayuda (`requestingHelp`) (backlog, "Cronómetro de demora y tiempo de ocupación").
- **Cronómetro de demora:** cuenta desde el `confirmedAt` más antiguo de la mesa, incluidos los pedidos en "Ingresadas"; pasa a amarillo, a rojo y a rojo parpadeante con los umbrales `yellowTicketSeconds`, `redTicketSeconds` y `redPulseTicketSeconds` que trae la mesa; deja de verse cuando la mesa queda saldada (`amountPaid >= total - 0.01`).
- **Salón, lo que necesita la tarjeta:** arma estos datos a partir de T05 y no le pasa a la pantalla los emails ni las credenciales del restaurante (PA-5).

**No incluye:**

- La acción "Atendido" junto al ícono de ayuda: HU-10, fuera de esta descomposición.
- "Registrar cobro" y su regla de mesa saldada: HU-05, fuera de esta descomposición.
- Las pestañas y la lista de mesas: [TK-13](TK-13-ordenes.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `salon/`, con sus pruebas.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Salón y Pantalla "Órdenes".

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T05, con los umbrales del restaurante, `total`, `amountPaid`, `requestingHelp`, `createdAt` de la sesión y `confirmedAt` de cada pedido.

## Requisitos de prueba del backlog

Ninguno de la lista del backlog. Usa los umbrales de los datos iniciales ([TK-02](TK-02-datos-iniciales.md)), dos comensales y el pedido de ayuda de [TK-03](TK-03-simulador-mesas-y-pedidos.md), y el cobro de otra tablet de [TK-04](TK-04-simulador-cobros.md) para lo pagado y la mesa saldada.

## Dependencias

- [TK-13](TK-13-ordenes.md): las tarjetas de "Órdenes".
- [TK-03](TK-03-simulador-mesas-y-pedidos.md) y [TK-04](TK-04-simulador-cobros.md): los comensales, el pedido de ayuda y los cobros.

## Pasos

1. Crear el cambio de OpenSpec, con un scenario por cada criterio heredado.
2. Escribir las pruebas primero, y verlas fallar: pruebas locales del cálculo de la demora, del color y de la mesa saldada, con un reloj controlado; pruebas en el dispositivo contra la réplica para HU-02.c4, HU-02.h4 y HU-02.h5.
3. Escribir en Salón los datos de la tarjeta y el cronómetro, convirtiendo los montos que llegan como string.
4. Escribir el encabezado de la tarjeta y el cronómetro con sus colores.
5. Comprobar que ninguna pantalla muestra un email ni los tokens de mentira de MercadoPago de los datos iniciales.
6. Abrir el PR desde una rama `mc`, con capturas de los tres colores.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app).
- **Propio del ticket:**
  - El color y la desaparición del cronómetro se prueban con un reloj controlado, sin esperar los umbrales reales.
  - Los montos se muestran sin errores de redondeo a partir de los `decimal` que llegan como string.

## Riesgos y decisiones pendientes

- **Modelo de datos, sección 4:** "Los `decimal` llegan como string … `total`, `amountPaid`, `tips`, `amount` y `price` llegan por JSON como `"1250.00"`"; "Las fechas se guardan en UTC"; "El `@Check` de los umbrales no existe en MySQL".
- **RA-4** ([seguridad.md](../../architecture/seguridad.md)): T05 "trae los emails de los comensales y … la fila completa del restaurante con `mercadoPagoToken` y `mercadoPagoRefreshToken`".
