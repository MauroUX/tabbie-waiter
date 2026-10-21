# PRD: Tabbie Waiter App (MVP)

> PRD del MVP: problema, usuarios, propuesta de valor, alcance, no-alcance, requisitos funcionales y no funcionales, métricas de éxito, restricciones y supuestos.
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
- **La impresora virtual de comandas existe, pero no se llega a ella** desde ninguna pantalla.

Además, la operación del salón va a necesitar más adelante imprimir comandas, seguir operando si se cae la red y recibir avisos con la pantalla bloqueada, y la herramienta actual no permite ofrecerlas.

## 2. Usuarios

**Usuario único: el mozo.** Es el personal del restaurante con rol de mozo. Ningún otro rol usa la app: ni comensales, ni invitados, ni administradores, ni backoffice.

**Contexto de uso:**

- Usa la app durante todo el turno.
- Opera en una tablet que entrega el restaurante, configurada en modo kiosco.
- Inicialmente hay una sola tablet por restaurante. Más adelante puede haber varias en el mismo salón.
- Cada mozo pertenece a un único restaurante y solo ve y opera ese restaurante.

**Qué hace el mozo durante el turno:**

- Ve las mesas ocupadas y sus pedidos.
- Manda a cocina los pedidos que confirmaron los comensales.
- Cancela pedidos cuando hace falta.
- Atiende los pedidos de ayuda.
- Cobra en persona y registra los cobros.
- Cierra la mesa cuando los comensales se van.

**Qué no hace:** no toma pedidos. El comensal crea y confirma sus pedidos desde su app, y paga con MercadoPago desde ahí. El mozo ve esos pedidos y pagos, pero no los genera.

**Supuestos del MVP:** están en la sección 9.

## 3. Propuesta de valor

Para el mozo, una app propia que cubre el turno completo, separada de la app de comensales:

- **Cobros confiables.** Cada cobro se registra una sola vez, y la app no deja confirmar un cobro que va a fallar: ofrece registrarlo como cobro manual.
- **Avisos que se pueden atender.** El mozo da por atendido un pedido de ayuda y el aviso deja de molestar en su tablet.
- **El salón al día.** Los pedidos confirmados, las solicitudes de cobro y los demás cambios del salón llegan a la tablet en los tiempos de RNF-1 y RNF-2. Si se corta la conexión, la app se recupera sola y trae lo que se perdió.
- **Menos errores de operación.** No deja cancelar pedidos ya cobrados y advierte antes de cerrar una mesa con saldo pendiente.
- **Sin interferencias.** Lo que se cambie para el comensal deja de afectar al mozo.

**Para el restaurante:** reemplaza la herramienta actual sin cambiar cómo trabaja el resto del sistema. La app usa las mismas operaciones y los mismos datos que la herramienta actual, y el backend no se modifica.

## 4. Alcance del MVP

**Definición:** el MVP incluye las capacidades necesarias para que un restaurante opere un turno completo **sin usar el panel web**. Son las capacidades C1 y C3 a C14 del contexto, con el comportamiento descrito en cada bloque "Waiter App".

**Prioridad:**

- **Must:** sin esto, el restaurante no puede reemplazar el panel web en el turno.
- **Should:** entra en el MVP, pero el turno se puede operar sin esto. En el panel actual C7 siempre falla y a C14 no se llega desde ninguna pantalla. Sin "Cerrar sesión" (RF-4), los mozos comparten la sesión, y eso no altera los datos (E1).

### Reglas comunes a todas las épicas

Son requisitos no funcionales y están en la sección 7.

### E1. Acceso del mozo (Must)

Cubre: **C1**.

- **Iniciar sesión (Must):** con email y contraseña o con Google (C1).
- **Solo mozos (Must):** si inicia sesión un usuario con otro rol, la app le muestra un mensaje y cierra la sesión.
- **Sesión durante todo el turno (Must):** la app renueva la sesión antes de que venza, sin que el mozo lo note. Si no puede renovarla, lo lleva al inicio de sesión.
- **Cerrar sesión (Should):**
  - El mozo cierra su sesión al terminar el turno, para que otro mozo inicie la suya en la misma tablet.
  - Al cerrar sesión, las marcas de "Atendido" se mantienen en la tablet, porque son de la mesa, no del mozo.
  - No es una capacidad del contexto: se agrega porque, con una sola tablet por restaurante al inicio, varios mozos la comparten entre turnos.
  - Es Should porque el sistema no registra qué mozo hace cada acción: los cobros quedan a nombre del comensal o sin usuario, y las cancelaciones con un texto genérico. Compartir la sesión no altera los datos.

### E2. Vista del salón en tiempo real (Must)

Cubre: **C3, C4**.

- **Mesas activas (Must, C3):**
  - Muestra las mesas ocupadas, con sus pedidos agrupados por categoría y separados en dos pestañas: "Pendientes" (confirmados por el comensal) e "Ingresadas" (ya enviados a cocina). Los pedidos cancelados no se muestran.
  - De cada mesa muestra los comensales, el total, lo pagado y si hay un pedido de ayuda.
  - Un cronómetro cuenta desde el pedido confirmado más antiguo de la mesa y cambia de color según los umbrales de demora que configura el restaurante.
  - No muestra datos sensibles de los comensales ni del restaurante.
- **Aviso de pedido confirmado (Must, C4):**
  - Cuando un comensal confirma un pedido, el mozo recibe un aviso con la mesa y la mesa se actualiza.
  - El aviso usa la hora en que el comensal confirmó el pedido.
  - Si la app no puede leer un aviso, lo descarta y actualiza las mesas.

### E3. Gestión de pedidos (Must)

Cubre: **C5, C6**.

- **Enviar a cocina (Must, C5):** con una acción, el mozo manda a cocina todos los pedidos confirmados de una mesa. Solo se envían pedidos confirmados.
- **Cancelar pedidos (Must, C6):**
  - El mozo selecciona uno o más pedidos de la mesa y los cancela. Cada pedido queda registrado como "Cancelada por el restaurante".
  - La app no deja cancelar un pedido que tenga algo cobrado, ni total ni parcialmente, y le explica al mozo por qué.
- **Confirmaciones:** las acciones de esta épica que piden confirmación están en RNF-9.

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
  - El monto, sin contar la propina, no puede superar el saldo pendiente de la mesa.
  - El cobro queda registrado como efectivo y sin comensal asociado. Los pedidos de la mesa figuran como pagados recién cuando la mesa queda saldada.
- **Ver solicitudes de cobro presencial (Must, C9):**
  - Las solicitudes llegan a la tablet en los tiempos de RNF-1 y RNF-2, y se listan agrupadas por mesa.
  - Un indicador muestra cuántas hay, sin contar las de MercadoPago.
  - Una solicitud desaparece de la lista cuando se elimina o se resuelve, también si lo hizo otro mozo desde otra tablet, en el tiempo de RNF-2.
- **Ver los cobros de cada mesa (Must, C10):** la mesa lista los cobros ya registrados junto con las solicitudes pendientes. Los cobros manuales figuran como "Pago manual".
- **Confirmar una solicitud de cobro (Must, C11):**
  - El mozo confirma una solicitud cuando cobra en persona. Las solicitudes de MercadoPago se ven, pero no se confirman: ese pago lo hace el comensal.
  - Si la solicitud no identifica al comensal, la app no la confirma: ofrece registrar el monto como cobro manual y después eliminar la solicitud.
- **Eliminar una solicitud de cobro (Must, C12):** la solicitud desaparece en todas las tablets.
- **Confirmaciones:** las acciones de esta épica que piden confirmación están en RNF-9.

### E6. Cierre de mesa (Must)

Cubre: **C13**.

- **Cerrar una mesa (Must, C13):**
  - Solo se ofrece para mesas activas.
  - Siempre pide confirmación (RNF-9). Si queda saldo pendiente, además lo advierte.
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

## 6. Requisitos funcionales

Hay un requisito por cada comportamiento observable de las épicas E1 a E7. "Origen" es la capacidad del contexto de la que sale el requisito, o "Nuevo" si no está en el contexto. La prioridad se hereda del ítem de la épica.

| ID | Requisito | Épica | Origen | Prioridad |
|---|---|---|---|---|
| RF-1 | El mozo inicia sesión con email y contraseña o con su cuenta de Google. | E1 | C1 | Must |
| RF-2 | Si inicia sesión un usuario que no tiene el rol de mozo, la app le muestra un mensaje que lo explica y cierra la sesión, sin mostrarle ninguna pantalla de la operación. | E1 | C1 | Must |
| RF-3 | La app renueva la sesión antes de que venza, sin pedirle datos al mozo. Si no puede renovarla, lo lleva al inicio de sesión. | E1 | C1 | Must |
| RF-4 | El mozo cierra su sesión desde la app. Al hacerlo, la app vuelve al inicio de sesión y otro mozo puede iniciar la suya en la misma tablet. Las marcas de "Atendido" se mantienen en la tablet, porque son de la mesa, no del mozo. | E1 | Nuevo | Should |
| RF-5 | La app muestra todas las mesas ocupadas del restaurante y ninguna mesa libre ni cerrada. | E2 | C3 | Must |
| RF-6 | Los pedidos de cada mesa se ven agrupados por categoría, en dos pestañas: "Pendientes", con los pedidos confirmados por el comensal, e "Ingresadas", con los ya enviados a cocina. Los pedidos cancelados no se muestran. | E2 | C3 | Must |
| RF-7 | Cada mesa muestra sus comensales, el total, lo pagado y si hay un pedido de ayuda. | E2 | C3 | Must |
| RF-8 | Cada mesa muestra un cronómetro que cuenta desde su pedido confirmado más antiguo y cambia de color al superar cada umbral de demora que configuró el restaurante. | E2 | C3 | Must |
| RF-9 | Ninguna pantalla muestra datos sensibles de los comensales ni del restaurante, como los emails de los comensales o las credenciales de cobro del restaurante. | E2 | C3 | Must |
| RF-10 | Cuando un comensal confirma un pedido, la app muestra un aviso con el número de mesa y actualiza esa mesa. | E2 | C4 | Must |
| RF-11 | Para el aviso, la app usa la hora en que el comensal confirmó el pedido, no la hora en que el aviso llegó a la tablet. | E2 | C4 | Must |
| RF-12 | Si la app no puede leer un aviso, no lo muestra y actualiza las mesas. | E2 | C4 | Must |
| RF-13 | Con una sola acción, el mozo manda a cocina todos los pedidos confirmados de una mesa, que pasan a "Ingresadas". La acción no envía pedidos en otro estado. | E3 | C5 | Must |
| RF-14 | El mozo selecciona uno o más pedidos de una mesa y los cancela. Cada pedido cancelado queda registrado como "Cancelada por el restaurante". | E3 | C6 | Must |
| RF-15 | La app no deja cancelar un pedido que tenga algo cobrado, total o parcialmente, y le explica al mozo por qué. | E3 | C6 | Must |
| RF-16 | El aviso de pedido de ayuda tiene la acción "Atendido". Al usarla, el aviso de esa mesa deja de verse en esa tablet hasta que se cierra la mesa; las demás tablets lo siguen mostrando. | E4 | C7 | Should |
| RF-17 | Al registrar un cobro manual, la app propone como monto el saldo pendiente de la mesa y permite agregar propina. | E5 | C8 | Must |
| RF-18 | La app no registra un cobro manual cuyo monto, sin contar la propina, supere el saldo pendiente de la mesa. | E5 | C8 | Must |
| RF-19 | El cobro manual queda registrado como efectivo y sin comensal asociado. Los pedidos de la mesa figuran como pagados recién cuando la mesa queda saldada. | E5 | C8 | Must |
| RF-20 | La app lista las solicitudes de cobro presencial agrupadas por mesa. | E5 | C9 | Must |
| RF-21 | Un indicador muestra cuántas solicitudes de cobro hay, sin contar las de MercadoPago. | E5 | C9 | Must |
| RF-22 | Una solicitud de cobro deja de verse cuando se elimina o se resuelve, también si lo hizo otro mozo desde otra tablet. | E5 | C9 | Must |
| RF-23 | Cada mesa lista sus cobros registrados junto con sus solicitudes pendientes. Los cobros manuales figuran como "Pago manual". | E5 | C10 | Must |
| RF-24 | El mozo confirma una solicitud de cobro presencial cuando cobra en persona. Las solicitudes de MercadoPago se ven, pero no se pueden confirmar. | E5 | C11 | Must |
| RF-25 | Si una solicitud no identifica al comensal, la app no la confirma: ofrece registrar el monto como cobro manual y después eliminar la solicitud. | E5 | C11 | Must |
| RF-26 | El mozo elimina una solicitud de cobro, previa confirmación (RNF-9). La solicitud deja de verse en todas las tablets. | E5 | C12 | Must |
| RF-27 | La acción de cerrar una mesa solo se ofrece para mesas activas. | E6 | C13 | Must |
| RF-28 | Cerrar una mesa siempre pide confirmación (RNF-9). Si la mesa tiene saldo pendiente, la app además lo advierte. | E6 | C13 | Must |
| RF-29 | Mientras el cierre de una mesa está en curso, la acción no se puede repetir. Al terminar, la app actualiza las mesas. | E6 | C13 | Must |
| RF-30 | La impresora virtual lista los pedidos confirmados de las mesas activas que todavía no se mandaron a cocina, y abre el detalle de cada uno. | E7 | C14 | Should |
| RF-31 | La impresora virtual no tiene acciones que cambien datos. | E7 | C14 | Should |
| RF-32 | El mozo llega a la impresora virtual desde una pantalla de la app. | E7 | C14 | Should |

## 7. Requisitos no funcionales

Aplican a todas las épicas.

| ID | Tema | Requisito |
|---|---|---|
| RNF-1 | Avisos inmediatos | Con conexión, un pedido que confirma el comensal, o una solicitud de cobro presencial que no es de MercadoPago, aparece en la tablet en **2 segundos o menos** desde que el comensal lo confirma o la crea. |
| RNF-2 | Cambios hechos fuera de la tablet | **Cualquier** cambio hecho fuera de la tablet (pedidos, cobros, pedidos de ayuda, solicitudes de cobro de MercadoPago, una mesa que se ocupa, acciones desde otra tablet) se refleja en la tablet en **30 segundos o menos** desde que ocurre. |
| RNF-3 | Actualización tras cada acción | Después de cada acción del mozo, la app actualiza las mesas y las solicitudes de cobro. |
| RNF-4 | Cortes de conexión | Si la tablet no logra comunicarse con el sistema durante **más de 5 segundos**, ya sea porque no hay red o porque el sistema no responde, la app muestra un aviso de que no hay conexión. Al recuperarse la comunicación, actualiza mesas, solicitudes y cobros en **5 segundos o menos**, sin que el mozo haga nada. |
| RNF-5 | Duración de la sesión | No hay límite de duración del turno. El mozo no vuelve a iniciar sesión salvo que cierre sesión (RF-4) o que falle la renovación de la sesión (RF-3). |
| RNF-6 | Sin repeticiones automáticas | Una acción que cambia datos (mandar a cocina, cancelar pedidos, registrar un cobro manual, confirmar o eliminar una solicitud de cobro, cerrar una mesa) **nunca** se repite sola. Si falla o no responde, la app actualiza las mesas y las solicitudes de cobro antes de dejar intentarla de nuevo. |
| RNF-7 | Aislamiento por restaurante | Un mozo solo ve y opera datos de su restaurante. |
| RNF-8 | Datos en la tablet | En la tablet solo quedan guardadas la sesión del mozo y las marcas de "Atendido" (RF-16). Ningún otro dato de la operación queda en el dispositivo. |
| RNF-9 | Confirmación de acciones irreversibles | Cancelar pedidos, cerrar una mesa, confirmar o eliminar una solicitud de cobro y registrar un cobro manual piden confirmación antes de ejecutarse, porque son irreversibles. Es la única lista de acciones que piden confirmación: las épicas y los RF remiten a ella. |
| RNF-10 | Dispositivo e idioma | Todas las pantallas se usan en una tablet en orientación horizontal, y todos los textos de la app están en español. |

## 8. Métricas de éxito

Se miden con el **simulador de comensales**, en un turno simulado. Probar la app en restaurantes queda fuera del alcance.

| ID | Métrica | Meta | Cómo se mide |
|---|---|---|---|
| M-1 | Cobertura del turno | El **100 %** de los RF Must ejercitados, sin errores y sin usar el panel web. | En un turno simulado completo, el simulador ocupa mesas, confirma pedidos, pide cobros y pide ayuda. El mozo ejecuta solo con la app todas las capacidades Must. |
| M-2 | Cero cobros duplicados | **Cero** cobros duplicados confirmados. | Se mide en el turno simulado, incluidos cortes de conexión provocados durante los cobros. Un caso sospechoso son dos o más cobros de la misma mesa, por el mismo monto, del mismo comensal o ambos sin comensal, registrados con menos de 1 minuto de diferencia. Cada caso se compara con los cobros que pidió el simulador y los que registró el mozo: es un duplicado si hay más cobros registrados que pedidos. |
| M-3 | Conciliación de mesas cerradas | En **ninguna** mesa cerrada sin cobros de MercadoPago, lo pagado más las propinas difiere en más de **±0,01** de la suma de sus cobros registrados. | Para cada mesa cerrada durante el turno simulado que no tenga cobros de MercadoPago, se compara lo pagado más las propinas con la suma de sus cobros registrados. |

## 9. Restricciones y supuestos

**Restricciones:**

- **Plataforma:** app nativa Android para tablet.
- **Backend sin cambios:** el backend actual no se modifica. La app usa las mismas operaciones y los mismos datos que el panel web.
- **Autenticación:** la app se autentica igual que el panel actual.

**Supuestos:**

- El salón tiene red disponible durante el turno.
- La tablet se configura al desplegar para mantener la pantalla encendida y la app en primer plano.
- Inicialmente hay una sola tablet por restaurante, que comparten los mozos.
- El restaurante entrega y configura las tablets.
- Los comensales siguen pidiendo desde la app web actual.

## Pendiente para las historias

Se define en el backlog:

- desde qué pantalla se llega a la impresora virtual (RF-32);
- cómo se verifican los comportamientos entre tablets (RF-16, RF-22, RF-26), en pruebas con dos dispositivos;
- el tamaño y la resolución de la tablet (RNF-10).
