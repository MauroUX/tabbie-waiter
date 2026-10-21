# PRD: Tabbie Waiter App (MVP)

> Primera parte del PRD: problema, usuarios, propuesta de valor, alcance y no-alcance del MVP.
>
> La base es el documento de contexto `docs/context/panel-mozos-actual.md`. Las referencias a ese documento van por ID de capacidad (C1, C3…) y de observación (O1…).

## 1. Problema

La herramienta con la que el mozo atiende el salón es una sección dentro de la app que usan los comensales. Comparte con ella configuración y comportamiento: lo que se cambia para el comensal puede afectar al mozo, y lo que se cambia para el mozo puede afectar al comensal.

Ese acoplamiento ya tiene efectos en el turno, y además hace que cualquier corrección de la herramienta del mozo sea un cambio en la app de comensales. Hoy el mozo se encuentra con esto:

- **Un cobro puede quedar registrado dos veces.** Si la conexión falla mientras el mozo registra o confirma un cobro, la herramienta repite la acción por su cuenta.
- **Confirmar ciertos cobros falla, pero el monto igual se suma.** Cuando la solicitud de cobro no identifica al comensal, la confirmación da error y aun así la mesa muestra ese monto como pagado.
- **El pedido de ayuda no se puede dar por atendido.** El botón "Atendido" no funciona, así que el aviso queda encendido hasta que se cierra la mesa.
- **Se puede cancelar un pedido ya cobrado.** El pedido desaparece de la cuenta, pero el cobro sigue registrado.
- **El mozo ve solicitudes de cobro que ya no existen.** Si otro mozo elimina una solicitud, en las demás tablets sigue apareciendo hasta la próxima actualización.
- **La pantalla del mozo carga datos de un comensal.** Si en la tablet quedó abierta una mesa como comensal, la herramienta del mozo consulta información de esa mesa que no necesita.
- **La impresora virtual de comandas existe, pero no se llega a ella** desde ninguna pantalla.

Además, la operación del salón va a necesitar más adelante imprimir comandas, seguir operando si se cae la red y recibir avisos con la pantalla bloqueada, y la herramienta actual no permite ofrecerlas.

## 2. Usuarios

**Usuario único: el mozo.** Es el personal del restaurante con rol de mozo. Ningún otro rol usa la app: ni comensales, ni invitados, ni administradores, ni backoffice.

**Contexto de uso:**

- Usa la app durante todo el turno.
- Opera en una tablet que entrega el restaurante, configurada en modo kiosco.
- En la etapa de prueba hay una sola tablet por restaurante. Más adelante puede haber varias en el mismo salón.
- Cada mozo pertenece a un único restaurante y solo ve y opera ese restaurante.

**Qué hace el mozo durante el turno:**

- Ve las mesas ocupadas y sus pedidos.
- Manda a cocina los pedidos que confirmaron los comensales.
- Cancela pedidos cuando hace falta.
- Atiende los pedidos de ayuda.
- Cobra en persona y registra los cobros.
- Cierra la mesa cuando los comensales se van.

**Qué no hace:** no toma pedidos. El comensal crea y confirma sus pedidos desde su app, y paga con MercadoPago desde ahí. El mozo ve esos pedidos y pagos, pero no los genera.

**Supuestos del MVP:**

- El salón tiene red disponible durante el turno.
- La tablet se configura al desplegar para mantener la pantalla encendida y la app en primer plano.

## 3. Propuesta de valor

Para el mozo, una app propia que cubre el turno completo, separada de la app de comensales:

- **Cobros confiables.** Cada cobro se registra una sola vez, y la app no deja confirmar un cobro que va a fallar: ofrece registrarlo como cobro manual.
- **Avisos que se pueden atender.** El mozo da por atendido un pedido de ayuda y el aviso deja de molestar en su tablet.
- **El salón al día.** Pedidos confirmados y solicitudes de cobro llegan al instante. Si se corta la conexión, la app se recupera sola y trae lo que se perdió.
- **Menos errores de operación.** No deja cancelar pedidos ya cobrados y advierte antes de cerrar una mesa con saldo pendiente.
- **Sin interferencias.** Lo que se cambie para el comensal deja de afectar al mozo, y la app queda lista para sumar más adelante las necesidades que hoy no se pueden cubrir.

**Para el restaurante:** reemplaza la herramienta actual sin cambiar cómo trabaja el resto del sistema. La app usa las mismas operaciones y los mismos datos que la herramienta actual, y el backend no se modifica.

## 4. Alcance del MVP

**Definición:** el MVP incluye las capacidades necesarias para que un restaurante opere un turno completo **sin usar el panel web**. Son las capacidades C1 y C3 a C14 del contexto, con el comportamiento descrito en cada bloque "Waiter App".

**Prioridad:**

- **Must:** sin esto, el restaurante no puede reemplazar el panel web en el turno.
- **Should:** entra en el MVP, pero hoy los restaurantes ya operan sin esto: en el panel actual C7 siempre falla y a C14 no se llega desde ninguna pantalla.

### Reglas comunes a todas las épicas (Must)

- La app trabaja solo con el restaurante del mozo que inició sesión.
- **Sin repeticiones automáticas.** Si una acción que cambia datos falla o no responde (mandar a cocina, cancelar, cobrar, confirmar un cobro, cerrar una mesa), la app no la repite sola. Primero actualiza el estado de las mesas y de las solicitudes de cobro, y recién después deja intentar de nuevo.
- **Actualización después de cada acción.** Tras cada acción del mozo, la app actualiza las mesas y las solicitudes de cobro.
- **Recuperación tras un corte.** Si se corta la conexión, la app la retoma sola y, al volver, actualiza mesas y solicitudes de cobro para recuperar lo que se perdió. Además, revisa mesas, solicitudes y cobros cada cierto tiempo.
- **Nada de la operación queda guardado en la tablet**, salvo la sesión del mozo y las marcas de "Atendido" (E4).

### E1. Acceso del mozo (Must)

Cubre: **C1**.

- **Iniciar sesión (Must):** con email y contraseña o con Google (C1).
- **Solo mozos (Must):** si inicia sesión un usuario con otro rol, la app le muestra un mensaje y cierra la sesión.
- **Sesión durante todo el turno (Must):** la app renueva la sesión antes de que venza, sin que el mozo lo note. Si no puede renovarla, lo lleva al inicio de sesión.
- **Cerrar sesión (Should):** el mozo cierra su sesión al terminar el turno, para que otro mozo inicie la suya en la misma tablet. No es una capacidad del contexto: se agrega porque, con una sola tablet por restaurante en la etapa de prueba, varios mozos la comparten entre turnos.

### E2. Vista del salón en tiempo real (Must)

Cubre: **C3, C4**.

- **Mesas activas (Must, C3):**
  - Muestra las mesas ocupadas, con sus pedidos agrupados por categoría y separados en dos pestañas: "Pendientes" (confirmados por el comensal) e "Ingresadas" (ya enviados a cocina).
  - De cada mesa muestra los comensales, el total, lo pagado y si hay un pedido de ayuda.
  - Un cronómetro cuenta desde el pedido confirmado más antiguo de la mesa y cambia de color según los umbrales de demora que configura el restaurante.
  - No muestra datos sensibles de los comensales ni del restaurante.
- **Aviso de pedido confirmado (Must, C4):**
  - Cuando un comensal confirma un pedido, el mozo recibe un aviso con la mesa y la mesa se actualiza.
  - El aviso usa la hora en que el comensal confirmó el pedido.
  - Si el aviso llega incompleto o dañado, la app lo descarta y actualiza las mesas.

### E3. Gestión de pedidos (Must)

Cubre: **C5, C6**.

- **Enviar a cocina (Must, C5):** con una acción, el mozo manda a cocina todos los pedidos confirmados de una mesa. Solo se envían pedidos confirmados.
- **Cancelar pedidos (Must, C6):**
  - El mozo selecciona uno o más pedidos de la mesa y los cancela. Cada pedido queda registrado como "Cancelada por el restaurante".
  - La app no deja cancelar un pedido que tenga algo cobrado, ni total ni parcialmente, y le explica al mozo por qué.

### E4. Pedidos de ayuda (Should)

Cubre: **C7**.

- **Marcar como atendido (Should, C7):**
  - El banner de pedido de ayuda tiene la acción "Atendido".
  - "Atendido" vale solo para esa tablet: oculta el aviso en esa tablet hasta que se cierra la mesa. Las demás tablets siguen mostrándolo.
  - Si la misma mesa vuelve a pedir ayuda después de marcarla como atendida, la app no lo detecta.

### E5. Cobros (Must)

Cubre: **C8, C9, C10, C11, C12**.

- **Registrar un cobro manual (Must, C8):**
  - La app propone el saldo pendiente de la mesa y permite agregar propina.
  - No acepta montos mayores al total.
  - El cobro queda registrado como efectivo y sin comensal asociado. Los pedidos de la mesa figuran como pagados recién cuando la mesa queda saldada.
- **Ver solicitudes de cobro presencial (Must, C9):**
  - Las solicitudes llegan en tiempo real y se listan agrupadas por mesa.
  - Un indicador muestra cuántas hay, sin contar las de MercadoPago.
  - Una solicitud desaparece de la lista apenas se elimina o se resuelve, también si lo hizo otro mozo desde otra tablet.
- **Ver los cobros de cada mesa (Must, C10):** la mesa lista los cobros ya registrados junto con las solicitudes pendientes. Los cobros manuales figuran como "Pago manual".
- **Confirmar una solicitud de cobro (Must, C11):**
  - El mozo confirma una solicitud cuando cobra en persona. Las solicitudes de MercadoPago se ven, pero no se confirman: ese pago lo hace el comensal.
  - Si la solicitud no identifica al comensal, la app no la confirma: ofrece registrar el monto como cobro manual y después eliminar la solicitud.
- **Eliminar una solicitud de cobro (Must, C12):** con confirmación previa. La solicitud desaparece en todas las tablets.

### E6. Cierre de mesa (Must)

Cubre: **C13**.

- **Cerrar una mesa (Must, C13):**
  - Solo se ofrece para mesas activas.
  - Si queda saldo pendiente, la app lo advierte y pide confirmación.
  - Mientras el cierre está en curso, la acción no se puede repetir. Al terminar, las mesas se actualizan.

### E7. Impresora virtual de comandas (Should)

Cubre: **C14**.

- **Ver la impresora virtual (Should, C14):**
  - Lista los pedidos confirmados de las mesas activas que todavía no se mandaron a cocina, y permite abrir el detalle de cada uno.
  - Es solo de consulta: no tiene acciones que cambien datos.
  - Se accede desde la app, solo para mozos.

### Cobertura de las capacidades del contexto

| Capacidad | Destino | Prioridad | Motivo |
|---|---|---|---|
| C1. Iniciar sesión | E1 | Must | Sin sesión no hay operación. |
| C2. Continuar como invitado | No-alcance | — | La app es solo para personal del restaurante. |
| C3. Ver las mesas activas con sus pedidos | E2 | Must | Es la vista central del turno. |
| C4. Recibir aviso de pedido confirmado | E2 | Must | El mozo se entera al instante de cada pedido nuevo. |
| C5. Enviar a cocina | E3 | Must | Sin esto el pedido no llega a cocina. |
| C6. Cancelar pedidos | E3 | Must | Corrige pedidos que no van. |
| C7. Marcar como atendido un pedido de ayuda | E4 | Should | Hoy no funciona y el turno se opera igual. |
| C8. Registrar un cobro manual | E5 | Must | Es el cobro en persona sin solicitud. |
| C9. Ver solicitudes de cobro presencial | E5 | Must | Es como el mozo sabe que tiene que ir a cobrar. |
| C10. Ver los cobros de cada mesa | E5 | Must | Permite saber qué se pagó antes de cerrar. |
| C11. Confirmar una solicitud de cobro | E5 | Must | Es el cobro en persona habitual. |
| C12. Eliminar una solicitud de cobro | E5 | Must | Descarta solicitudes que no corresponden. |
| C13. Cerrar una mesa | E6 | Must | Libera la mesa al final de la atención. |
| C14. Ver la impresora virtual | E7 | Should | Hoy no se llega a ella y el turno se opera igual. |

## 5. No-alcance

| Queda afuera | Por qué |
|---|---|
| **Tomar pedidos desde la app del mozo.** | El pedido lo crea y lo confirma el comensal desde su app. Es una decisión de producto, no un recorte. |
| **Acceso como invitado (C2).** | La app es solo para personal del restaurante. |
| **Imprimir comandas en una impresora Bluetooth.** | Depende de hardware y no es necesario para reemplazar el panel actual. La impresora virtual (C14) sí entra. |
| **Operar sin conexión.** | Exige sincronizar datos y resolver conflictos entre tablets. El MVP supone que el salón tiene red durante el turno. |
| **Avisos con la pantalla bloqueada.** | El MVP supone que la tablet se configura al desplegar para mantener la pantalla encendida y la app en primer plano, así que los avisos se ven en la app. |
| **Kiosco administrado del dispositivo.** | Se configura al desplegar en cada restaurante y no cambia la operación del mozo. |
| **Que "Atendido" se comparta entre tablets.** | Exige cambiar el backend, que no se modifica (O1). En el MVP, "Atendido" vale solo para la tablet donde se marcó (C7). |
| **Corregir los huecos del backend (O1 a O4).** | El backend no se modifica. La app los rodea con su propio comportamiento: "Atendido" por tablet, no cancelar pedidos cobrados, no confirmar cobros que van a fallar, no mostrar datos sensibles. |
| **Configuración del restaurante, el menú, las mesas y los usuarios.** | Es tarea del backoffice. |
| **Cobrar con MercadoPago desde la app del mozo.** | Ese pago lo hace el comensal desde su app. El mozo solo lo ve (C9). |
| **Retirar el panel web de la app de comensales.** | Es una iniciativa posterior, en otro sistema, una vez validado el MVP. |
