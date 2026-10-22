# TK-13 · Navegación principal y "Órdenes": pestañas y tarjetas

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [HU-02](../historias/HU-02-mesas-activas.md) · Ver las mesas activas y sus pedidos (RF-5, RF-6) |

## Objetivo

Que el mozo vea, desde la navegación principal, una tarjeta por cada mesa ocupada de su restaurante, con sus pedidos por categoría en las pestañas "Pendientes" e "Ingresadas", siempre al día.

## Criterios heredados

- [HU-02.c1](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Navegación principal.
- [HU-02.c2](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Una tarjeta por mesa ocupada.
- [HU-02.c3](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Pestañas "Pendientes" e "Ingresadas".
- [HU-02.h1](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Una mesa que se ocupa.
- [HU-02.h2](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Una mesa sin pedidos en una pestaña.
- [HU-02.h6](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Corte de conexión.
- [HU-02.h7](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · Aislamiento.
- [HU-02.h8](../historias/HU-02-mesas-activas.md#criterios-de-aceptación) · El comensal cancela un pedido.

## Alcance

**Incluye:**

- **Navegación principal**, visible desde cualquier pantalla de la operación (backlog, "Navegación principal y ubicación de las acciones"): "Órdenes" y "Pagos", y el aviso de que no hay conexión con diseño, que reemplaza al del skeleton.
- **Pantalla "Órdenes":** una tarjeta por mesa activa y ninguna de las libres, con su número de mesa.
- **Pestañas:** "Pendientes", con los pedidos `confirmed`, e "Ingresadas", con los `in_kitchen`, agrupados por categoría. Los `canceled` no se muestran (RF-6).
- **Mesas sin pedidos en una pestaña:** en "Pendientes", una mesa ocupada sin ningún pedido aparece con "Sin pedidos"; una mesa con pedidos solo en "Ingresadas" no aparece en "Pendientes", y una sin pedidos no aparece en "Ingresadas" (HU-02.h2).
- **Salón, lo que necesita la pantalla:** separa los pedidos por estado y por categoría a partir de T05, con el restaurante de la sesión.

**No incluye:**

- Los datos de cada tarjeta (comensales, total, lo pagado, tiempo de ocupación, ayuda) y el cronómetro: [TK-14](TK-14-tarjeta-y-cronometro.md).
- "Mandar a cocina" y la acción para eliminar pedidos: [TK-16](TK-16-mandar-a-cocina.md) y [TK-17](TK-17-cancelar-pedidos.md).
- El contenido de "Pagos" y su indicador (HU-06), el contador y el aviso de pedido confirmado (HU-03), "Registrar cobro" (HU-05), "Atendido" (HU-10) y el acceso a la impresora virtual (HU-11): fuera de esta descomposición.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): la raíz del paquete base (navegación principal) y `salon/`, con sus pruebas.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Navegación principal, Pantalla "Órdenes" y Salón.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T05. Los cambios llegan por la consulta periódica y los eventos que deja el skeleton.

## Requisitos de prueba del backlog

- **Datos iniciales con dos restaurantes:** HU-02.h7 se prueba con el segundo restaurante, con mesas ocupadas por ESC-8 ([TK-04](TK-04-simulador-cobros.md)).

## Dependencias

- [TK-10](TK-10-inicio-de-sesion.md): la sesión (HU-01).
- [TK-12](TK-12-simulador-cancelar-pedido.md): ESC-7, para HU-02.h8.
- [TK-04](TK-04-simulador-cobros.md): ESC-8, para HU-02.h7.

## Pasos

1. Crear el cambio de OpenSpec, con un scenario por cada criterio heredado.
2. Escribir las pruebas primero, y verlas fallar: pruebas locales de Salón (separación por estado y categoría, mesas sin pedidos) y pruebas en el dispositivo contra la réplica, con el simulador ocupando mesas, confirmando y cancelando pedidos, y Toxiproxy para el corte.
3. Escribir la navegación principal con "Órdenes", "Pagos" y el aviso sin conexión.
4. Escribir en Salón la separación de los pedidos por pestaña y por categoría.
5. Escribir la pantalla "Órdenes" con sus pestañas y tarjetas, y sus estados de carga, de error y vacío.
6. Comprobar los 30 s de HU-02.h1 y HU-02.h8, y los 5 s de HU-02.h6.
7. Abrir el PR desde una rama `mc`, con capturas en la tablet de referencia y en la mínima.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app).
- **Propio del ticket:**
  - La lista sin diseño del skeleton deja de usarse.
  - "Órdenes" se ve completa, sin desplazamiento horizontal, con al menos las seis mesas del restaurante 1 ocupadas.

## Riesgos y decisiones pendientes

- **Componentes, Salón:** la réplica "Descarta los pedidos `pending` y mantiene los `canceled`" en T05 ([componentes.md](../../architecture/componentes.md), sección 2). La app tiene que descartar los `canceled`.
- **RNF-2:** HU-02.h1 y HU-02.h8 dependen del intervalo de la consulta periódica, todavía pendiente ([ADRs](../../adr/README.md), "Decisiones pendientes").
