# TK-14 · "Pagos": solicitudes de cobro presencial e indicador

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [HU-06](../historias/HU-06-solicitudes-y-cobros.md) · Ver las solicitudes de cobro presencial de cada mesa (RF-20, RF-21, RF-22) |
| **Wireframe** | [`docs/design/pagos.png`](../../design/pagos.png) (DP-10; todavía no existe) |

## Objetivo

Que el mozo vea en "Pagos", por cada mesa activa, las solicitudes de cobro presencial que tiene que ir a cobrar, al día y en 2 s o menos desde que el comensal las pide, y cuántas hay en total sobre "Pagos".

## Criterios heredados

- [HU-06.c1](../historias/HU-06-solicitudes-y-cobros.md#camino-feliz-1) · Una tarjeta por mesa activa.
- [HU-06.c2](../historias/HU-06-solicitudes-y-cobros.md#camino-feliz-1) · Ítem de una solicitud presencial.
- [HU-06.h1](../historias/HU-06-solicitudes-y-cobros.md#huecos) · Tiempo de una solicitud.
- [HU-06.h3](../historias/HU-06-solicitudes-y-cobros.md#huecos) · Con dos tablets: eliminación.
- [HU-06.h4](../historias/HU-06-solicitudes-y-cobros.md#huecos) · Solicitud resuelta por otra vía.
- [HU-06.h5](../historias/HU-06-solicitudes-y-cobros.md#huecos) · Solicitud creada durante un corte.
- [HU-06.h6](../historias/HU-06-solicitudes-y-cobros.md#huecos) · Sin datos sensibles.
- [HU-06.h7](../historias/HU-06-solicitudes-y-cobros.md#huecos) · Solicitud sin comensal identificado.

## Alcance

**Incluye:**

- **Pantalla "Pagos":** una tarjeta por mesa activa, con las mesas de Salón; vacía si la mesa no tiene solicitudes (HU-06.c1).
- **Ítem de cada solicitud presencial:** el comensal por su nombre, o "Comensal sin identificar" si el `userId` no es un número mayor que cero (C11, HU-06.h7); el monto y el tipo de pago; y los botones "Confirmar pago" y "Eliminar", que todavía no actúan: sus acciones son de [TK-15](TK-15-confirmar-o-eliminar-solicitud.md).
- **Indicador sobre "Pagos"** en la navegación principal (RF-21): cuenta las solicitudes que no son de MercadoPago, y sube y baja con cada solicitud nueva, eliminada o resuelta.
- **Solo presenciales** (DP-38): en el lote 1, "Pagos" no muestra ni cuenta las solicitudes de MercadoPago que traiga T06; mostrarlas es de HU-13.
- **Cobros, lo que necesita la pantalla:** agrupa por mesa las solicitudes de T06 y las que llegan por `in-person-payment-request`, y quita las de `in-person-payment-request-deleted` y las que desaparecen de T06 (RF-22, C9). No le pasa a la pantalla los emails de los comensales (RF-9).

**No incluye:**

- Confirmar y eliminar una solicitud: [TK-15](TK-15-confirmar-o-eliminar-solicitud.md).
- "Cerrar mesa": [TK-16](TK-16-cerrar-mesa.md).
- Los cobros registrados de cada mesa y lo que llega por MercadoPago: HU-13, en la ampliación.
- "Atendido" en "Pagos": HU-10, en la ampliación.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `cobros/`, con sus pruebas, y la raíz del paquete base para el indicador.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Cobros, Pantalla "Pagos" y Navegación principal (el indicador).
- **Wireframe:** [`docs/design/pagos.png`](../../design/pagos.png).

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T05 (las mesas activas), T06 (las solicitudes), T17 e `in-person-payment-request-deleted`, que llegan por la conexión de eventos del skeleton.

## Requisitos de prueba del backlog

- **Un vencimiento corto, configurable, de las solicitudes de cobro:** HU-06.h4 usa el perfil de pruebas de [TK-01](TK-01-replica.md).
- **Una forma de crear una solicitud sin comensal identificado:** ESC-6, de [TK-13](TK-13-simulador-pagos.md).
- **El montaje de dos tablets:** HU-06.h3 se prueba con dos tablets, con el segundo mozo del restaurante 1 de [TK-02](TK-02-datos-iniciales.md). Mientras "Eliminar" no exista en la app, la tablet A es el simulador con la cuenta del segundo mozo ([TK-13](TK-13-simulador-pagos.md)).

## Dependencias

- [TK-09](TK-09-ordenes.md): la navegación principal con "Pagos".
- [TK-05](TK-05-eventos-y-consulta-periodica.md): la consulta periódica de solicitudes y los eventos.
- [TK-13](TK-13-simulador-pagos.md): ESC-6, y la eliminación y el cierre desde otra tablet.
- [TK-08](TK-08-simulador-ordenes.md): el cobro de otra tablet que salda la mesa, para HU-06.h4.

## Pasos

1. Crear el cambio de OpenSpec, con un scenario por cada criterio heredado.
2. Escribir las pruebas primero, y verlas fallar: pruebas locales de Cobros (agrupación por mesa, indicador sin MercadoPago, quitar las resueltas) y pruebas en el dispositivo contra la réplica, con ESC-5 y ESC-6, la eliminación y el cierre desde otra tablet, el vencimiento corto y la red del emulador cortada para HU-06.h5.
3. Escribir en Cobros la agrupación y el indicador.
4. Escribir la pantalla "Pagos" con sus tarjetas e ítems, siguiendo el wireframe, y sus estados de carga, de error y vacío.
5. Escribir el indicador sobre "Pagos" en la navegación principal.
6. Comprobar los 2 s de HU-06.h1, los 30 s de HU-06.h3 y HU-06.h4, y los 5 s de HU-06.h5.
7. Abrir el PR desde una rama `mc`, con capturas en la tablet de referencia y en la mínima, y la captura de las dos pantallas de HU-06.h3.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app).
- **Propio del ticket:**
  - Ninguna pantalla muestra un email de comensal.
  - El indicador nunca cuenta una solicitud de MercadoPago.

## Riesgos y decisiones

- **C9:** `/pay`, `/add-payment` y el cierre de mesa borran solicitudes sin emitir evento; desaparecen con la consulta siguiente, cada 15 s (DP-25).
- **Decidido (DP-29):** un evento de solicitud que no se puede leer no muestra nada y hace que se vuelvan a consultar las solicitudes ([componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14)).
- **Decidido (DP-38):** en el lote 1, "Pagos" muestra solo las solicitudes presenciales ([índice](README.md#decisiones-tomadas-2026-11-14)).
