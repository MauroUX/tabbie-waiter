# TK-03 · Simulador: ocupar mesas, confirmar pedidos y pedir ayuda

| | |
|---|---|
| **Tipo** | Backend (réplica y simulador) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Simulador" en el alcance (ESC-1, ESC-2 y ESC-4) y el riesgo técnico "Unirse a la mesa y autenticar al comensal"; [seguridad.md](../../architecture/seguridad.md), sección 4.2, "Cómo se comprueban O1 a O4" |

## Objetivo

Tener el simulador de comensales por línea de comandos, con su registro del turno, para ocupar mesas, confirmar pedidos y pedir ayuda contra la réplica, y comprobar con él O1, O3 y O4.

## Criterios heredados

- [SEG-c1](../../architecture/seguridad.md#43-criterios-nuevos) · O1: "Atendido" falla y la ayuda no se apaga.
- [SEG-c3](../../architecture/seguridad.md#43-criterios-nuevos) · O3: cerrar, leer y escuchar una sesión sin JWT.
- [SEG-c4](../../architecture/seguridad.md#43-criterios-nuevos) · O4: emails y credenciales del restaurante en las mesas activas.
- [WS-c2](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Un pedido confirmado llega por evento. **En parte:** ESC-2, y la hora en que el simulador manda la confirmación, en el registro del turno. El criterio completo es de [TK-06](TK-06-eventos-y-consulta-periodica.md).
- [WS-c4](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · Los cambios que no emiten evento llegan por la consulta periódica. **En parte:** ESC-1 y ESC-4, con su hora en el registro del turno. El criterio completo es de TK-06.

## Alcance

**Incluye** los componentes del simulador de [componentes.md](../../architecture/componentes.md), sección 3:

- **Línea de comandos:** elige el escenario y sus parámetros: restaurante, mesa, cantidad de comensales y de pedidos.
- **Sesión del comensal:** obtiene el JWT con que el comensal llama a la réplica, de la forma que se decida (ver "Riesgos y decisiones pendientes").
- **Cliente HTTP del comensal:** llama a la URL de la réplica, **sin pasar por Toxiproxy** (0003).
- **Escenarios:**
  - **ESC-1 · Ocupar una mesa:** uno o más comensales se unen a una mesa libre, que pasa a estar activa. HU-02.c4 pide dos comensales en una mesa;
  - **ESC-2 · Confirmar un pedido:** crea un pedido con productos del menú y lo confirma;
  - **ESC-4 · Pedir ayuda** en la mesa del comensal.
- **Registro del turno:** guarda lo que pidió el simulador, con la mesa, el comensal y la hora en que mandó cada petición. Es el "desde cuándo" de las mediciones del skeleton (sección 4).
- **Las comprobaciones de O1, O3 y O4** (SEG-c1, SEG-c3 y SEG-c4), desde la máquina, con un cliente HTTP y el simulador, sin la app. Las peticiones y respuestas de cada corrida se guardan como evidencia ([seguridad.md](../../architecture/seguridad.md), sección 4.2).

**No incluye:**

- ESC-5, los cobros de otra tablet, las solicitudes de MercadoPago, ESC-8 y la comprobación de O2: [TK-04](TK-04-simulador-cobros.md).
- ESC-7, cancelar como comensal: [TK-12](TK-12-simulador-cancelar-pedido.md).
- ESC-3, ESC-6 y ESC-9 a ESC-11, y la medición de M-2 y M-3: los piden HU-03, HU-06, HU-07 y las métricas, fuera de esta descomposición.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `simulator/src/`. Las comprobaciones de O1 a O4, donde se decida que viven las pruebas de integración de la réplica.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 3): Línea de comandos, Sesión del comensal, Cliente HTTP del comensal, Escenarios y Registro del turno.

## Contrato que usa

- **Endpoints del comensal**, por su ruta ([componentes.md](../../architecture/componentes.md), sección 3): `POST /orders`, `PUT /orders/:id/confirm` y `PUT /table-sessions/:id/request-help`. Para unirse a la mesa, el que se compruebe en la copia.
- **Autenticación del comensal:** T01 o T02, según se decida.
- **Para las comprobaciones**, por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T05 (con el JWT del primer mozo del restaurante 1), T10 (SEG-c1), T04, T18 y T14 (SEG-c3).
- **Eventos:** ESC-2 hace que la réplica emita T16.

## Requisitos de prueba del backlog

Ninguno propio. Usa los datos iniciales de [TK-02](TK-02-datos-iniciales.md).

## Dependencias

- [TK-02](TK-02-datos-iniciales.md): los restaurantes, las mesas, el menú y las cuentas.

## Pasos

1. Despejar el riesgo técnico: probar contra la copia el endpoint con que su código une al comensal a la mesa, y registrar cómo se autentica el comensal (ver "Riesgos y decisiones pendientes").
2. Crear el cambio de OpenSpec, con los scenarios de SEG-c1, SEG-c3, SEG-c4 y de la parte de WS-c2 y WS-c4.
3. Escribir las pruebas primero, y verlas fallar: cada escenario contra la réplica local, comprobando su efecto en T05, y las tres comprobaciones de seguridad.
4. Armar la línea de comandos, la sesión y el cliente HTTP del comensal.
5. Escribir ESC-1, ESC-2 y ESC-4, cada uno con su entrada en el registro del turno.
6. Hacer que una petición rechazada termine el escenario con un error explícito y quede en el registro.
7. Correr SEG-c1, SEG-c3 y SEG-c4 y guardar la evidencia. Si un hueco no se reproduce, corregir la observación del contexto y revisar su riesgo en [seguridad.md](../../architecture/seguridad.md).
8. Documentar cómo se corre el simulador en [infraestructura.md](../../architecture/infraestructura.md), y la decisión sobre el comensal en [componentes.md](../../architecture/componentes.md).
9. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Backend](../definition-of-done.md#backend-réplica-y-simulador).
- **Propio del ticket:**
  - Cada escenario se corre desde la línea de comandos con sus parámetros, sin tocar código.
  - El registro del turno tiene, de cada petición, la mesa, el comensal y la hora, en el reloj de la máquina.
  - La evidencia de SEG-c1, SEG-c3 y SEG-c4 queda guardada, con solo datos sintéticos (PR-2).
  - La decisión sobre la autenticación del comensal y el endpoint para unirse a la mesa queda en [componentes.md](../../architecture/componentes.md), fuera de "Decisiones pendientes".

## Riesgos y decisiones pendientes

- **Riesgo técnico del skeleton:** "Unirse a la mesa y autenticar al comensal … Sin esto no hay ESC-1 ni ESC-4" ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 6).
- **Pendiente:** "Unirse a la mesa (ESC-1): el contexto no nombra el endpoint. El código de la copia tiene `POST /table-sessions/join/restaurant/:restaurantId/table/:tableNumber`, que el contexto no documenta" ([componentes.md](../../architecture/componentes.md), "Decisiones pendientes").
- **Pendiente:** "Cómo se autentica el comensal: con una cuenta de Firebase y `POST /auth/login` (1, T01), o como invitado con `POST /auth/guest` (2, T02)". Si es con cuenta, las crea [TK-02](TK-02-datos-iniciales.md).
- **Pendiente:** dónde viven las pruebas de integración de la réplica ([índice](README.md#decisiones-pendientes)).
