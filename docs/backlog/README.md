# Backlog: Tabbie Waiter App (MVP)

> Historias de usuario del MVP, cortadas a partir de las épicas E1 a E7 del [PRD](../prd/tabbie-waiter-mvp.md). La base es el PRD y el [documento de contexto](../context/panel-mozos-actual.md).

## Cómo se lee el backlog

- **Usuario:** todas las historias son del mozo. No hay historias del comensal, del simulador ni técnicas: el walking skeleton y la infraestructura quedan fuera de este backlog.
- **Una historia** es un objetivo concreto del mozo que entra en 1 o 2 días de trabajo y en una sola sesión de un agente.
- **Archivos:** cada historia está en `historias/HU-NN-<titulo-corto>.md`. El ID (`HU-01`…) ordena primero las Must y después las Should, siguiendo el recorrido del turno.
- **Cobertura:** cada RF del PRD pertenece a exactamente una historia (ver la tabla de cobertura).
- **Prioridad:** la historia hereda la prioridad de sus RF. Ninguna historia mezcla RF Must y Should.
- **RNF y reglas que la condicionan:** los RNF no son historias. Cada historia lista los que la condicionan, y también RF-9, que vale para todas las pantallas que muestran datos de comensales.
- **Complejidad:**
  - **S:** una acción o una vista acotada, sin cobros ni comportamiento entre tablets.
  - **M:** varias reglas de negocio, o acciones que cambian datos y piden confirmación (RNF-6, RNF-9).
  - **L:** combina avisos en tiempo real, comportamiento entre tablets y más de una lista. Está en el límite de Small.
- **INVEST:** cada historia tiene su tabla con los 6 criterios. "Independiente" se evalúa respecto de las demás historias sin contar HU-01, porque todas necesitan una sesión iniciada.
- **Pendiente de escribir:** el camino feliz (lo escribe el humano), los criterios de aceptación y la estimación.

## Épicas e historias

| Épica | Prioridad de la épica | Historias |
|---|---|---|
| E1. Acceso del mozo | Must | [HU-01](historias/HU-01-iniciar-sesion.md) Iniciar sesión y mantenerla todo el turno (Must)<br>[HU-09](historias/HU-09-cerrar-sesion.md) Cerrar sesión al terminar el turno (Should) |
| E2. Vista del salón en tiempo real | Must | [HU-02](historias/HU-02-mesas-activas.md) Ver las mesas activas y sus pedidos<br>[HU-03](historias/HU-03-aviso-pedido-confirmado.md) Enterarme de cada pedido confirmado |
| E3. Gestión de pedidos | Must | [HU-04](historias/HU-04-cocina-y-cancelacion.md) Mandar a cocina y cancelar pedidos |
| E4. Pedidos de ayuda | Should | [HU-10](historias/HU-10-pedido-de-ayuda-atendido.md) Dar por atendido un pedido de ayuda |
| E5. Cobros | Must | [HU-05](historias/HU-05-cobro-manual.md) Registrar un cobro manual<br>[HU-06](historias/HU-06-solicitudes-y-cobros.md) Ver las solicitudes y los cobros de cada mesa<br>[HU-07](historias/HU-07-confirmar-o-eliminar-solicitud.md) Confirmar o eliminar una solicitud de cobro |
| E6. Cierre de mesa | Must | [HU-08](historias/HU-08-cerrar-mesa.md) Cerrar una mesa |
| E7. Impresora virtual de comandas | Should | [HU-11](historias/HU-11-impresora-virtual.md) Consultar la impresora virtual |

| ID | Historia | Épica | Prioridad | Complejidad |
|---|---|---|---|---|
| HU-01 | Iniciar sesión y mantenerla todo el turno | E1 | Must | M |
| HU-02 | Ver las mesas activas y sus pedidos | E2 | Must | M |
| HU-03 | Enterarme de cada pedido confirmado | E2 | Must | S |
| HU-04 | Mandar a cocina y cancelar pedidos | E3 | Must | M |
| HU-05 | Registrar un cobro manual | E5 | Must | M |
| HU-06 | Ver las solicitudes y los cobros de cada mesa | E5 | Must | L |
| HU-07 | Confirmar o eliminar una solicitud de cobro | E5 | Must | M |
| HU-08 | Cerrar una mesa | E6 | Must | S |
| HU-09 | Cerrar sesión al terminar el turno | E1 | Should | S |
| HU-10 | Dar por atendido un pedido de ayuda | E4 | Should | S |
| HU-11 | Consultar la impresora virtual | E7 | Should | S |

**Cantidad:** 8 historias Must y 3 Should. Supera la meta inicial (3 a 5 Must y 1 o 2 Should), por estos motivos:

- **Must:** ningún RF Must puede pasar al no-alcance, porque sin ellos no se reemplaza el panel web. Agruparlos más daría historias L o mayores que no entran en una sola sesión de un agente.
- **Should:** cada épica Should da una historia, y las tres son S.

## Cobertura RF → historia

| RF | Requisito (resumen) | Prioridad | Historia |
|---|---|---|---|
| RF-1 | Iniciar sesión con email y contraseña o con Google | Must | HU-01 |
| RF-2 | Rechazar a los usuarios que no son mozos | Must | HU-01 |
| RF-3 | Renovar la sesión antes de que venza | Must | HU-01 |
| RF-4 | Cerrar sesión, manteniendo las marcas de "Atendido" | Should | HU-09 |
| RF-5 | Mostrar solo las mesas ocupadas | Must | HU-02 |
| RF-6 | Pedidos por categoría en "Pendientes" e "Ingresadas" | Must | HU-02 |
| RF-7 | Comensales, total, lo pagado y pedido de ayuda de cada mesa | Must | HU-02 |
| RF-8 | Cronómetro de demora con los umbrales del restaurante | Must | HU-02 |
| RF-9 | Ninguna pantalla muestra datos sensibles | Must | HU-02 |
| RF-10 | Aviso con la mesa al confirmarse un pedido | Must | HU-03 |
| RF-11 | El aviso usa la hora de confirmación del pedido | Must | HU-03 |
| RF-12 | Un aviso ilegible no se muestra y se actualizan las mesas | Must | HU-03 |
| RF-13 | Mandar a cocina los pedidos confirmados de una mesa | Must | HU-04 |
| RF-14 | Cancelar uno o más pedidos de una mesa | Must | HU-04 |
| RF-15 | No cancelar pedidos con algo cobrado | Must | HU-04 |
| RF-16 | "Atendido" oculta el aviso de ayuda solo en esa tablet | Should | HU-10 |
| RF-17 | El cobro manual propone el saldo y permite propina | Must | HU-05 |
| RF-18 | El cobro manual no supera el saldo pendiente | Must | HU-05 |
| RF-19 | El cobro manual queda como efectivo y sin comensal | Must | HU-05 |
| RF-20 | Solicitudes de cobro presencial agrupadas por mesa | Must | HU-06 |
| RF-21 | Indicador de solicitudes, sin contar MercadoPago | Must | HU-06 |
| RF-22 | Una solicitud eliminada o resuelta deja de verse, también en otras tablets | Must | HU-06 |
| RF-23 | Cobros registrados y solicitudes pendientes de cada mesa | Must | HU-06 |
| RF-24 | Confirmar una solicitud de cobro presencial | Must | HU-07 |
| RF-25 | Solicitud sin comensal: cobro manual y eliminación | Must | HU-07 |
| RF-26 | Eliminar una solicitud de cobro | Must | HU-07 |
| RF-27 | Cerrar solo mesas activas | Must | HU-08 |
| RF-28 | Confirmación al cerrar y advertencia de saldo pendiente | Must | HU-08 |
| RF-29 | El cierre no se repite mientras está en curso | Must | HU-08 |
| RF-30 | La impresora lista los pedidos confirmados sin mandar a cocina | Should | HU-11 |
| RF-31 | La impresora no cambia datos | Should | HU-11 |
| RF-32 | Se llega a la impresora desde una pantalla de la app | Should | HU-11 |

## Decisiones sobre los pendientes del PRD

### Acceso a la impresora virtual (RF-32)

- La impresora virtual tiene un acceso fijo en la navegación principal de la app, al mismo nivel que "Mesas" y "Cobros", visible desde cualquier pantalla de la operación.
- **Motivo:** es una vista de todo el restaurante, no de una mesa. Así el mozo llega con un toque, sin pasar por una mesa.

### Comportamientos entre tablets (RF-16, RF-22, RF-26)

- **Montaje:** dos dispositivos con el perfil de tablet de RNF-10, que pueden ser una tablet física y un emulador, o dos emuladores.
  - En cada uno hay una sesión de un mozo distinto del mismo restaurante.
  - El simulador de comensales genera los pedidos de ayuda y las solicitudes de cobro.
- **Criterio:** las historias afectadas (HU-06, HU-07 y HU-10) tienen un criterio "con dos tablets". La acción se hace en la tablet A y se verifica en la tablet B, con el límite de 30 segundos de RNF-2.
  - En RF-16 se esperan esos 30 segundos para confirmar que la tablet B **sigue** mostrando el aviso.
- **Prueba:** es manual, con una captura de las dos pantallas como evidencia.
- **Motivo:** el piloto tiene una sola tablet por restaurante, así que en el salón no se puede observar este comportamiento. Un emulador alcanza, porque se verifica lo que muestra cada app y no el hardware.

### Tamaño y resolución de la tablet (RNF-10)

- **Referencia:** tablet de 10,1" a 1920×1200 (16:10), en orientación horizontal.
- **Mínimo:** tablet de 8" a 1280×800, en horizontal. En ese tamaño todas las pantallas se ven completas, sin desplazamiento horizontal.
- **Motivo:** el de 10" es el tamaño más común de las tablets Android para kiosco, y el mínimo cubre las tablets económicas que podría entregar un restaurante.

### Reglas para el corte

- **Tiempo real e infraestructura:** el walking skeleton deja resueltos el canal de avisos en tiempo real, la reconexión, el aviso de que no hay conexión, la recuperación después de un corte (RNF-4) y la actualización periódica de mesas y solicitudes. Las historias usan esa base y no la construyen.
- **Solicitudes eliminadas en otras tablets:**
  - HU-06 (RF-22) se encarga de lo que se ve en la otra tablet cuando una solicitud se elimina o se resuelve, sea cual sea la causa.
  - HU-07 (RF-26) se encarga de la acción de eliminar y de su confirmación, y verifica solo la tablet donde se elimina.
- **Solicitud que no identifica al comensal (RF-25):** el cobro manual se precarga con el monto y la propina de la solicitud y respeta el tope de RF-18. Registrar el cobro y eliminar la solicitud piden una sola confirmación.
- **Datos sensibles (RF-9):** pertenece a HU-02 para la cobertura, y también figura como regla que condiciona a HU-06 y HU-07, porque muestran datos de comensales.

## Decisiones abiertas

1. **Dónde están las acciones de cobro y cierre.** No está definido si "Registrar cobro manual" (HU-05) y "Cerrar mesa" (HU-08) están en la vista "Mesas", en la vista "Cobros" o en las dos. Tampoco está definido dónde se muestra el indicador de solicitudes (RF-21).
2. **Cronómetro de demora (RF-8).** No está definido si sigue contando cuando todos los pedidos confirmados de la mesa ya se mandaron a cocina, ni si cuenta los pedidos que ya están en "Ingresadas".
3. **Camino de RF-25 incompleto.** No está definido qué ve el mozo si el cobro manual se registra pero la solicitud no se puede eliminar, ni qué pasa si la solicitud ya desapareció porque ese cobro dejó la mesa saldada.
4. **Cuentas para las pruebas entre tablets.** No está definido quién deja preparadas, en el ambiente de prueba, las dos cuentas de mozo del mismo restaurante.
