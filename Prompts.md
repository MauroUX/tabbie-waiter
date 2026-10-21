> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras


## Índice

1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 1. Descripción general del producto

**Prompt 1:**

```text
[Sección 1 · Prompt 1]

## Contexto
Tabbie es una plataforma de pedidos y pagos para restaurantes: el comensal escanea el QR de la mesa, pide y paga desde su celular. El restaurante opera con un panel web de mozos que hoy vive dentro de la misma app web que usan los comensales.

Vamos a construir **Tabbie Waiter App**, un producto nuevo para que los mozos operen el salón y que reemplaza a ese panel. Va a usar **exactamente los mismos endpoints y eventos** que usa hoy el panel web, sobre el mismo modelo de datos. Antes de escribir el PRD necesito documentar qué hace hoy el mozo y qué parte del sistema usa.

## Objetivo
1. Crear la rama `feature/entrega-1-mc` (el repo no tiene commits; es la primera rama).
2. Escribir `docs/context/panel-mozos-actual.md`, un documento de contexto del sistema actual (no una spec ni un PRD).

## Fuentes (solo lectura; no modifiques nada en `C:\Repos\Tabbie`)
- App web, en `C:\Repos\Tabbie\order-pay-end-user-app\order-pay-end-user-app\`. Puntos de entrada del panel:
  - `app\(with-header)\restaurants\[restaurantId]\waiter-panel\`;
  - `app\(with-header)\restaurants\[restaurantId]\virtual-ticket-printer\`;
  - el login (`app\(without-header)\login\`).

  Seguí todo lo que importan, en cualquier carpeta: `components/`, `contexts/`, `hooks/`, `lib/`, `stores/`, `types/`, `utils/` y los `layout.tsx` de las rutas.
- Backend: `C:\Repos\Tabbie\order-pay-backend\order-pay-backend\src\`.
- Arquitectura actual: `C:\Repos\Tabbie\Documentación\Documentación teórica\Arquitectura.pdf`.

**Prohibido leer:** `C:\Repos\Tabbie\backups\`, cualquier `.env*`, `C:\Repos\Tabbie\Documentación\Guías\Environments\` y los `*.log`.

## Regla de alcance: trazabilidad
No decidas por criterio propio qué involucra al mozo. Seguí la cadena completa:
1. En el front, partiendo de los puntos de entrada, encontrá **todas** las llamadas HTTP (por `apiClient`, `fetch`, `axios` o cualquier otra vía) y todas las conexiones SSE con los eventos que escuchan.
2. Para cada una, en el backend: controlador y método, guards y roles que se aplican, servicio, y **todas las entidades que lee o escribe**, incluidas las relaciones que carga y lo que se actualiza como efecto (por ejemplo, otras tablas que se modifican al cerrar una mesa).
3. Lo que no está en esa cadena queda fuera. Lo que sí está, entra, aunque parezca de otro dominio (por ejemplo, pagos hechos por otro medio que el mozo solo ve).

## Contenido del documento
1. **Capacidades del mozo.** Una por ítem: qué hace y qué rol la usa. Cada una referencia sus filas de la tabla de trazabilidad.
2. **Tabla de trazabilidad.** Una fila por llamada o evento, con estas columnas:
   - acción en pantalla;
   - archivo del front;
   - método + ruta exacta, o nombre del evento SSE;
   - controlador.método;
   - guards y roles;
   - entidades leídas;
   - entidades escritas.
3. **Inventario.**
   - Endpoints y eventos usados (lista única, con método y ruta exactos).
   - Tablas usadas, incluidas las tablas intermedias de las relaciones muchos a muchos.
   - Almacenamiento que no es la base relacional (por ejemplo, claves en Redis), con qué guarda.
4. **Ciclo de un pedido visto por el mozo.** Estados y quién provoca cada transición.
5. **Tiempo real.** Qué llega por eventos y qué se consulta periódicamente, con su frecuencia.
6. **Mapa de entidades (Mermaid)** con las entidades del inventario y sus relaciones. Sin columnas: el detalle del modelo se documenta en otra etapa.
7. **Observaciones.** Huecos o inconsistencias (por ejemplo, endpoints sin guard, o llamadas que el front hace y el back no soporta), cada una con su archivo de evidencia y la marca "(observado en el código, sin verificar en ejecución)".
8. **Preguntas abiertas.** Lo que no se puede determinar desde las fuentes.

## Reglas
- En español.
- Describí lo que el sistema hace hoy: sin propuestas, soluciones ni opiniones de diseño.
- Si algo no surge de las fuentes, va a "Preguntas abiertas". No lo completes con suposiciones.
- No escribas código.
- Leé las fuentes con subagentes `Explore` (podés lanzar uno para el front y otro para el back) y trabajá sin pedirme confirmaciones intermedias.
- Al terminar, hacé un commit en la rama con un mensaje en español. **No hagas push.**

## Criterios de éxito
- La rama `feature/entrega-1-mc` existe, con un commit que agrega solo `docs/context/panel-mozos-actual.md`.
- **Toda** llamada HTTP y todo evento SSE de los puntos de entrada aparece en la tabla de trazabilidad. Ninguna fila queda sin controlador o sin entidades, salvo que esté explicada en "Observaciones".
- El inventario de tablas es exactamente la unión de las entidades leídas y escritas de la tabla.
- Cada capacidad y cada observación cita su archivo de origen.
- No hay propuestas ni suposiciones sin marcar.
- Al final me devolvés un resumen de 5 líneas como máximo: cuántos endpoints, eventos y tablas; capacidades; observaciones y preguntas abiertas más importantes.
```

**Ajuste humano:** Respondí las preguntas abiertas con contexto operativo: lo desplegado es `main`, el backend corre en una sola instancia, el código es la fuente de verdad frente a la documentación de arquitectura, el panel lo usa solo el rol `waiter`, un pedido tiene 2 estados operativos y `POS` y `Cash` son equivalentes. Decidí que el backend queda como está desplegado y que la app rodea sus huecos con su propio comportamiento, sumé la impresora virtual y pedí consolidar el documento sin el rastro de las preguntas, en un solo commit.

**Prompt 2:**

```text
[Sección 1 · Prompt 2]

## Objetivo
Escribir la primera parte del PRD de **Tabbie Waiter App** en `docs/prd/tabbie-waiter-mvp.md`, con estas secciones:
1. Problema
2. Usuarios
3. Propuesta de valor
4. Alcance del MVP (en épicas)
5. No-alcance

La base es `docs/context/panel-mozos-actual.md` y las decisiones de abajo. No vuelvas a leer el código de Tabbie.

## Decisiones de producto (ya tomadas)
- **Problema (borrador, para cuestionar):** la operación del salón depende de una herramienta que vive dentro de la app de los comensales. Lo que se cambia para el comensal puede afectar al mozo y al revés. Y el navegador limita lo que la operación va a necesitar: imprimir comandas, seguir operando si se cae la red, avisos con la pantalla bloqueada.
- **Usuario:** el mozo (rol `waiter`), durante todo el turno, en una tablet que entrega el restaurante, en modo kiosco. Ningún otro rol usa la app.
- **El mozo no toma pedidos:** los crea y confirma el comensal desde su app. El mozo los ve, los manda a cocina, cancela si hace falta, atiende pedidos de ayuda, cobra en persona y cierra la mesa.
- **Definición del MVP:** las capacidades necesarias para que un restaurante opere un turno completo **sin usar el panel web**. Es decir, las capacidades C1 y C3 a C14 del contexto, con el comportamiento que el contexto describe en cada bloque "Waiter App". Esos comportamientos ya están decididos; el PRD los expresa a nivel producto.
- **Restricción de producto:** el backend actual **no se modifica**. La app usa las mismas operaciones y los mismos datos que el panel web actual.
- **No-alcance:**
  - **Tomar pedidos desde la app del mozo:** el pedido lo hace el comensal. Es una decisión de producto, no un recorte.
  - **Acceso como invitado:** la app es solo para personal del restaurante (C2).
  - **Imprimir comandas en una impresora Bluetooth:** depende de hardware y no es necesario para reemplazar el panel actual. La impresora virtual sí entra.
  - **Operar sin conexión:** exige sincronización y resolución de conflictos; el MVP asume la red del salón.
  - **Avisos con la pantalla bloqueada:** en modo kiosco la app está siempre en primer plano.
  - **Kiosco administrado del dispositivo:** se resuelve al desplegar en cada restaurante y no cambia la operación del mozo.
  - **Que "Atendido" se comparta entre tablets:** exige cambiar el backend, que no se modifica (O1). En el MVP es por dispositivo.
  - **Corregir los huecos del backend (O1 a O4):** el backend no se modifica; la app los rodea con su propio comportamiento.
  - **Configuración del restaurante, el menú, las mesas y los usuarios:** es del backoffice.
  - **Cobrar con MercadoPago desde la app del mozo:** ese pago lo hace el comensal; el mozo solo lo ve.
  - **Retirar el panel web de la app de comensales:** es una iniciativa posterior, en otro sistema, una vez validado el MVP.

## Cuestionamiento (una sola ronda)
Antes de escribir, devolveme en un único mensaje **hasta 5 cuestionamientos**, solo donde haya ambigüedad o contradicción real entre las decisiones y el contexto. Por ejemplo:
- ¿El problema es un problema o una solución disfrazada?
- ¿Algún ítem del no-alcance está mal justificado?
- ¿Alguna capacidad del contexto queda sin destino?

Esperá mis respuestas una vez y después escribí. Si no hay nada real que cuestionar, decilo y escribí directamente.

## Reglas
- En español.
- El PRD es funcional: nada de endpoints, tablas, clases, eventos ni tecnologías. Las referencias al contexto van por ID de capacidad (C1, C3…).
- El problema no menciona la solución. Cada ítem del no-alcance nombra la cosa exacta y el porqué.
- Alcance priorizado con Must y Should (sin Could). Cada épica referencia las capacidades del contexto que cubre.
- Al terminar, commit en la rama con un mensaje en español. **No hagas push.**

## Criterios de éxito
- Existen las 5 secciones, sin detalle técnico.
- Las capacidades C1 a C14 del contexto están asignadas a una épica o al no-alcance, con su motivo. Ninguna queda sin destino.
- El no-alcance incluye todos los ítems de las decisiones, cada uno con su porqué.
```

**Ajuste humano:** Respondí los 4 cuestionamientos de la IA: el problema se plantea como acoplamiento con la app de comensales, pero en términos del mozo y sin detalle técnico, con las necesidades futuras aparte; C7 y C14 quedan como Should; inicialmente hay una sola tablet por restaurante; la pantalla encendida queda como supuesto de configuración del dispositivo. La IA agregó por su cuenta "Cerrar sesión" como Should, y lo pedí revisar en el prompt 3.

**Prompt 3:**

```text
[Sección 1 · Prompt 3]

## Objetivo
Completar `docs/prd/tabbie-waiter-mvp.md` con estas secciones:
6. Requisitos funcionales
7. Requisitos no funcionales
8. Métricas de éxito
9. Restricciones y supuestos

Después hacé un pase final sobre el PRD completo. La base es el propio PRD y `docs/context/panel-mozos-actual.md`.

## Decisiones (ya tomadas; los valores numéricos son propuestas para cuestionar)
- **RF:** uno por comportamiento observable de las épicas E1 a E7 (`RF-1`, `RF-2`…), a nivel producto y sin mecánica técnica. Cada RF indica su épica, la capacidad del contexto de la que sale (o "nuevo", como "Cerrar sesión") y su prioridad, que hereda de la épica o del ítem (Must o Should).
- **RNF:** las "Reglas comunes a todas las épicas" de la sección 4 son requisitos no funcionales. Pasalas a la sección 7 con un número o una condición, y reemplazá ese bloque de la sección 4 por una línea que remita a la sección 7. Valores propuestos:
  - un pedido que el comensal confirma, o una solicitud de cobro presencial, aparece en la tablet en **2 segundos o menos**;
  - los cambios que no generan aviso inmediato (cancelaciones del comensal, cobros, pedidos de ayuda) se reflejan en **30 segundos o menos**;
  - si se corta la conexión, la app avisa que no hay conexión y, al volver la red, recupera el estado actual sin que el mozo haga nada, en **5 segundos o menos**;
  - el mozo no vuelve a iniciar sesión durante un turno de **hasta 16 horas**;
  - una acción que cambia datos **nunca** se repite sola. Después de un error, la app actualiza mesas y solicitudes antes de dejar intentar de nuevo;
  - un mozo solo ve y opera datos de su restaurante;
  - en la tablet solo queda la sesión del mozo y las marcas de "Atendido";
  - las acciones irreversibles (cancelar pedidos, cerrar mesa, confirmar o eliminar una solicitud de cobro, registrar un cobro manual) piden confirmación;
  - pensada para tablet en horizontal y en español.
- **Métricas propuestas** (medidas en la etapa de prueba):
  - un restaurante opera **5 turnos completos seguidos** solo con la app, sin abrir el panel web;
  - el tiempo mediano entre que el comensal confirma un pedido y el mozo lo envía a cocina **no empeora** respecto del panel web;
  - **cero** cobros duplicados: cobros de la misma mesa, por el mismo monto, registrados con menos de 1 minuto de diferencia;
  - en **ninguna** mesa cerrada lo pagado difiere de la suma de sus cobros registrados.
- **Restricciones:**
  - app nativa Android para tablet;
  - el backend actual no se modifica: la app usa las mismas operaciones y los mismos datos que el panel web;
  - se autentica igual que el panel actual.
- **Supuestos:** los de la sección 2 (red en el salón; tablet configurada para mantener la pantalla encendida y la app en primer plano), sin contradecirlos, más:
  - en la etapa de prueba hay una sola tablet por restaurante, que comparten los mozos;
  - el restaurante entrega y configura las tablets;
  - los comensales siguen pidiendo desde la app web actual;
  - el backend corre en una sola instancia.

## Cuestionamiento (una sola ronda)
Antes de escribir, devolveme en un único mensaje **hasta 5 cuestionamientos**, solo donde haya un problema real. Por ejemplo:
- un RF que sea un nice-to-have disfrazado;
- un RNF o una métrica que no se pueda medir con los datos que el contexto muestra que existen;
- una métrica de vanidad;
- un supuesto sin evidencia.

Esperá mis respuestas una vez y después escribí. Si tenés que tomar una decisión que no está en este prompt ni en mis respuestas, no la tomes: listala en la "Revisión".

## Pase final (después de escribir)
Revisá el PRD completo y agregá al final una sección "Revisión" con:
- los supuestos que siguen sin evidencia;
- cualquier alcance que se haya colado sin justificación;
- cualquier detalle técnico que haya quedado en el PRD;
- las decisiones que tomaste vos sin que estuvieran en el prompt ni en mis respuestas, incluidas las de la parte 1 (por ejemplo, la prioridad de "Cerrar sesión").

No corrijas nada por tu cuenta: listalo para que yo decida.

## Reglas
- En español.
- RF y RNF testables: con un número o una condición, no un deseo.
- Sin endpoints, tablas, clases, eventos ni tecnologías, salvo la plataforma en "Restricciones".
- Al terminar, commit en la rama con un mensaje en español. **No hagas push.**

## Criterios de éxito
- El PRD responde las 9 preguntas: problema, usuarios, propuesta de valor, alcance, no-alcance, RF, RNF, métricas, restricciones y supuestos.
- Cada épica tiene al menos un RF; cada RF pertenece a una épica y tiene prioridad.
- Las reglas comunes viven solo en la sección 7, y la sección 4 remite a ella.
- Cada RNF y cada métrica se puede comprobar con un número o una condición.
- Existe la sección "Revisión" con los hallazgos del pase final y las decisiones propias.
```

**Ajuste humano:** Respondí los 5 cuestionamientos de la IA (definición de cobro duplicado, conciliación con propinas y sin MercadoPago, turno declarado por el restaurante, base y tolerancia del tiempo hasta cocina, y 2 s solo para lo que no es MercadoPago). Sobre la "Revisión" del pase final decidí: aceptar sus correcciones, mantener "Cerrar sesión" como Should, dejar fuera del alcance la prueba en restaurantes y medir las métricas con el simulador de comensales, no limitar la duración del turno, mantener las marcas de "Atendido" al cerrar sesión y no mostrar los pedidos cancelados. Esos cambios se aplican al PRD con un prompt de ajuste aparte.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

### **2.2. Descripción de componentes principales:**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

### **2.4. Infraestructura y despliegue**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

### **2.5. Seguridad**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

### **2.6. Tests**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

### 3. Modelo de Datos

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

### 4. Especificación de la API

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

### 5. Historias de Usuario

**Prompt 1:**

```text
[Sección 5 · Prompt 1]

## Objetivo
Partir las épicas del PRD en historias de usuario y dejar armado el backlog en `docs/backlog/`. En este paso **no** se escriben criterios de aceptación, ni el camino feliz, ni estimaciones: eso viene después.

La base es `docs/prd/tabbie-waiter-mvp.md` y `docs/context/panel-mozos-actual.md`. No leas el código de Tabbie.

## Decisiones (ya tomadas)
- **Épicas:** son E1 a E7 del PRD, tal como están. No inventes épicas nuevas ni cambies su prioridad.
- **Usuario de todas las historias:** el mozo. No hay historias del comensal, del simulador ni técnicas: el walking skeleton y la infraestructura no van en este backlog.
- **Granularidad:** una historia es un objetivo concreto del mozo que entra en 1 o 2 días de trabajo y en una sola sesión de un agente sin que se le rompa el contexto.
- **Cobertura:** cada RF (RF-1 a RF-32) pertenece a **exactamente una** historia.
- **Los RNF no son historias:** cada historia lista los RNF que la condicionan (por ejemplo, RNF-6 y RNF-9 en las de cobros).
- **Prioridad:** la historia hereda la prioridad de sus RF. Una historia no mezcla RF Must y Should.
- **Meta de cantidad:** entre 3 y 5 historias Must y 1 o 2 Should. El PRD tiene más capacidades que eso. Si al cortar por Small salen más historias, no fuerces la meta ni recortes el alcance: proponé las opciones (qué agrupar, o qué pasaría al no-alcance del MVP) para que yo decida.

## Pasos
1. **Clasificar antes de escribir.** Armá una tabla con las historias candidatas: título, épica, RF que cubre, complejidad (S, M o L) y el motivo en una línea (por ejemplo, depende de avisos en tiempo real, toca cobros o tiene comportamiento entre tablets).
2. **Cuestionamiento (una sola ronda).** Antes de escribir los archivos, devolveme en un único mensaje:
   - la tabla del paso 1;
   - las opciones para la meta de cantidad, si no se cumple;
   - una propuesta, con su motivo, para cada punto de "Pendiente para las historias" del PRD: desde qué pantalla se llega a la impresora virtual (RF-32), cómo se verifican los comportamientos entre tablets (RF-16, RF-22, RF-26) y el tamaño y la resolución de la tablet (RNF-10);
   - hasta 5 cuestionamientos más, solo si hay una ambigüedad o una contradicción real en el PRD que afecte el corte.

   Esperá mis respuestas una vez y después escribí.
3. **Escribir el backlog.**
   - `docs/backlog/README.md`:
     - cómo se lee el backlog;
     - la tabla de épicas → historias;
     - la tabla de cobertura RF → historia, con todos los RF;
     - lo que se decidió sobre los pendientes del PRD.
   - Un archivo por historia, `docs/backlog/historias/HU-NN-<titulo-corto>.md`, con esta estructura:
     - título con el ID (`HU-01`, `HU-02`…);
     - épica, prioridad, RF que cubre y RNF que la condicionan;
     - complejidad (S, M o L) con su motivo;
     - la historia en tres líneas: **Como** / **Quiero** / **Para**;
     - `## Camino feliz`, con el texto "_Lo escribe el humano._";
     - `## Criterios de aceptación`, con el texto "_Pendiente._";
     - `## INVEST`: una tabla con los 6 criterios, cada uno con ✔ o ✘ y una nota corta. Si una historia falla dos o más, o falla Small o Testable, partila o señalalo, y explicá por qué;
     - `## Estimación`, con el texto "_Pendiente._".

## Reglas
- En español.
- Sin endpoints, tablas, eventos, códigos de error ni tecnologías: las historias son de producto.
- El "Para" dice el valor para el mozo o el restaurante, no repite el "Quiero".
- Si tenés que tomar una decisión que no está en este prompt ni en mis respuestas, no la tomes: listala al final de `docs/backlog/README.md`, en "Decisiones abiertas".
- Al terminar, commit en la rama `feature/entrega-1-mc` con un mensaje en español. **No hagas push.**

## Criterios de éxito
- Todos los RF, de RF-1 a RF-32, aparecen en una sola historia en la tabla de cobertura.
- Ninguna historia mezcla Must y Should, ni tiene criterios, camino feliz ni estimación escritos.
- Cada historia tiene su tabla INVEST, y ninguna falla Small o Testable sin una nota que lo explique.
- Los tres pendientes del PRD quedan resueltos con mi respuesta.
- Al final me devolvés un resumen de 5 líneas como máximo: cuántas historias Must y Should, cuáles quedaron L y las decisiones abiertas.
```

**Ajuste humano:** Acepté el corte en 8 historias Must y 3 Should, aunque supera la meta de 3 a 5 Must y 1 o 2 Should, porque agrupar daba historias que no pasaban Small. Acepté las propuestas de la IA para los pendientes del PRD y sus 4 cuestionamientos, incluido que el walking skeleton se encargue de los avisos en tiempo real, la reconexión y la recuperación después de un corte.

**Prompt 2:**

```text
[Sección 5 · Prompt 2]

## Objetivo
Completar los criterios de aceptación de las historias de `docs/backlog/historias/`. El camino feliz lo escribí yo; vos lo pasás a Given / When / Then y buscás lo que falta.

## Mis decisiones sobre las "Decisiones abiertas" del backlog
1. **Dónde están las acciones de cobro y cierre, y el indicador de solicitudes:** igual que en el panel actual.
   - La navegación principal tiene "Órdenes", "Pagos" y la impresora virtual. Estos nombres reemplazan a "Mesas" y "Cobros" en todo el backlog.
   - "Registrar cobro" está en la tarjeta de cada mesa, en "Órdenes".
   - "Cerrar mesa" está en "Pagos", al pie de los cobros de esa mesa, donde se ve lo pagado antes de cerrar.
   - El indicador de solicitudes va sobre "Pagos" en la navegación principal.
2. **Cronómetro de demora (RF-8):** igual que en el panel actual. Cuenta desde el pedido confirmado más antiguo de la mesa, incluidos los que ya están en "Ingresadas", y deja de mostrarse cuando la mesa queda saldada.
   - Además, cada mesa muestra cuánto tiempo lleva ocupada, como hoy el panel en el encabezado de la tarjeta. Esto se suma a RF-7 (ver el paso 0).
3. **Camino de RF-25 incompleto:**
   - si el cobro manual se registra pero la solicitud no se puede eliminar, la app avisa que el cobro quedó registrado y que la solicitud sigue en la lista, para eliminarla desde ahí con la acción normal (RF-26). Nunca ofrece repetir el cobro (RNF-6);
   - si la solicitud ya no existe, por ejemplo porque el cobro dejó la mesa saldada y el sistema la quitó, no es un error: la app confirma el cobro y actualiza la lista.
4. **Cuentas para las pruebas entre tablets:** los datos iniciales de la réplica traen un restaurante con dos mozos, mesas y menú. Así cualquiera, incluido el evaluador, repite la prueba sin preparar nada. Las credenciales de prueba se documentan en el `Readme.md`.

## Mi camino feliz por historia
**HU-01 · Iniciar sesión y mantenerla todo el turno**
- El mozo entra con su email y contraseña.
- Al entrar, ve la sección "Órdenes" de su restaurante.
- Si entra alguien que no es mozo, la app le explica que no tiene acceso, cierra la sesión y no le muestra ninguna pantalla de la operación.
- La sesión se renueva sola durante todo el turno, sin que el mozo se entere.
- Si la renovación falla, la app vuelve al inicio de sesión.

**HU-02 · Ver las mesas activas y sus pedidos**
- Una vez dentro, el mozo ve la navegación principal con "Órdenes" y "Pagos".
- En "Órdenes" hay una tarjeta por cada mesa ocupada, con sus pedidos agrupados por categoría.
- "Órdenes" tiene dos pestañas:
  - "Pendientes", con los pedidos que el comensal confirmó y todavía no se mandaron a cocina;
  - "Ingresadas", con los que ya se mandaron y están en preparación.
- Cada tarjeta muestra los comensales, el total, lo pagado, cuánto tiempo lleva ocupada la mesa y si pidió ayuda.
- Cada tarjeta cambia de color según la demora, que se cuenta desde el pedido confirmado más antiguo de la mesa, con los umbrales del restaurante.

**HU-03 · Enterarme de cada pedido confirmado**
- Cuando un comensal confirma un pedido, el pedido aparece en "Pendientes", en la tarjeta de su mesa, y la app muestra un aviso con el número de mesa.
- La app emite un sonido propio de "Nuevo pedido".
- Si el mozo está en otra sección, el botón "Órdenes" parpadea de forma llamativa y muestra cuántos pedidos hay sin mandar a cocina.
- Si el mozo está en "Ingresadas", la pestaña "Pendientes" parpadea y muestra el mismo contador.

**HU-04 · Mandar a cocina y cancelar pedidos**
- En "Pendientes", la tarjeta de cada mesa tiene el botón "Mandar a cocina", que manda todos los pedidos confirmados de esa mesa.
- Al mandarlos, los pedidos pasan de "Pendientes" a "Ingresadas".
- La tarjeta de cada mesa tiene una acción para eliminar pedidos: el mozo elige uno, varios o todos los platos de la mesa y los cancela.
- Los pedidos cancelados dejan de verse y el total de la mesa se actualiza.
- Un pedido que ya tiene algo cobrado no se puede cancelar, y la app explica por qué.

**HU-05 · Registrar un cobro manual**
- La tarjeta de la mesa en "Órdenes" tiene el botón "Registrar cobro".
- El diálogo propone el saldo pendiente de la mesa y permite sumar propina.
- Al registrarlo, lo pagado de la mesa se actualiza.
- En "Pagos", el cobro aparece en la mesa como "Pago manual".

**HU-06 · Ver las solicitudes y los cobros de cada mesa**
- En "Pagos" hay una tarjeta por cada mesa activa. Si la mesa no tiene solicitudes ni cobros, la tarjeta aparece vacía.
- Cuando un comensal pide pagar en persona, en la tarjeta de su mesa aparece un ítem con los datos de la solicitud (comensal, monto y tipo de pago) y los botones "Confirmar pago" y "Eliminar".
- Los cobros ya registrados aparecen en la tarjeta marcados como pagados. Los manuales figuran como "Pago manual".
- El botón "Pagos" de la navegación muestra cuántas solicitudes hay, sin contar las de MercadoPago.

**HU-07 · Confirmar o eliminar una solicitud de cobro**
- Cuando el mozo cobra en persona, aprieta "Confirmar pago" en el ítem de la solicitud.
- Aparece un diálogo de confirmación con los datos del cobro.
- Si confirma, el ítem queda marcado como pagado y lo pagado de la mesa se actualiza.
- Si la solicitud no corresponde, el mozo aprieta "Eliminar" y la solicitud desaparece.
- Las solicitudes de MercadoPago se ven, pero no tienen "Confirmar pago".

**HU-08 · Cerrar una mesa**
- En "Pagos", la tarjeta de cada mesa tiene el botón "Cerrar mesa".
- Al apretarlo, aparece un diálogo de confirmación que informa si la mesa pagó el total.
- Si queda saldo pendiente, el diálogo muestra una advertencia clara, pero deja cerrar.
- Al confirmar, la mesa deja de aparecer entre las activas.

**HU-09 · Cerrar sesión al terminar el turno**
- Hay un botón "Cerrar sesión".
- Al apretarlo, la app pide confirmación.
- Al confirmar, la app vuelve al inicio de sesión y otro mozo puede entrar.
- Si un mozo cierra sesión en medio del turno y vuelve a entrar, ve el salón igual que antes: las mesas, los pedidos y las marcas de "Atendido".

**HU-10 · Dar por atendido un pedido de ayuda**
- Cuando una mesa pide ayuda, su tarjeta muestra un ícono llamativo, en "Órdenes" y en "Pagos".
- Al tocar el ícono en cualquiera de las dos tarjetas, la ayuda queda atendida y el ícono desaparece de las dos.
- La marca vale solo en esta tablet: las demás siguen mostrando el ícono.

**HU-11 · Consultar la impresora virtual**
- En la navegación principal hay un botón para ir a la impresora virtual.
- La impresora lista los pedidos confirmados de todas las mesas activas que todavía no se mandaron a cocina.
- Al tocar un pedido se ve su detalle.
- Es solo de consulta: no tiene acciones.

## Pasos
0. **Correcciones del backlog.** En `docs/backlog/README.md`:
   - pasá mis 4 decisiones a la sección de decisiones y sacalas de "Decisiones abiertas";
   - en "Comportamientos entre tablets", cambiá "el piloto tiene una sola tablet por restaurante" por "inicialmente hay una sola tablet por restaurante (PRD, sección 9)";
   - en "Tamaño y resolución", el motivo pasa a ser un supuesto: "Se supone que es el tamaño habitual de las tablets que entrega un restaurante; se confirma cuando haya un modelo definido".

   En `docs/prd/tabbie-waiter-mvp.md`, aplicá estas decisiones mías (mantené la numeración de RF y RNF):
   - **Qué es un pedido:** agregá, antes de la sección 4, que un pedido es un plato que pide el comensal, con su cantidad y sus opciones. Lo que el comensal manda junto es un conjunto de pedidos. Así lo hace hoy la app del comensal, y por eso cancelar pedidos es cancelar platos.
   - **Acceso solo con email y contraseña:** RF-1 y E1 dejan de mencionar Google. "Iniciar sesión con Google" pasa al no-alcance con este motivo: el MVP ofrece un único modo de acceso. Sumá a los supuestos: "Todo mozo tiene una cuenta con email y contraseña".
   - **RNF-9 cambia de lista.** Las únicas acciones que piden confirmación son cerrar sesión, cerrar una mesa y confirmar una solicitud de cobro (incluido el camino de RF-25, con una sola confirmación). El motivo pasa a ser que estas acciones cierran algo: la sesión, la mesa o un cobro.
     - Cancelar pedidos, registrar un cobro manual, eliminar una solicitud y "Atendido" no piden confirmación.
     - Ajustá las épicas y los RF que remiten a RNF-9 (por ejemplo, RF-26) para que no contradigan la nueva lista.
   - **Pedido de ayuda en las dos vistas:** el aviso se ve en la tarjeta de la mesa en "Órdenes" y en "Pagos", y "Atendido" se usa desde cualquiera de las dos (RF-7, RF-16 y E4).
   - RF-7 suma "y cuánto tiempo lleva ocupada", y E2 lo menciona en "Mesas activas".
   - En la tabla de cobertura, C4 cambia "al instante" por "en el tiempo de RNF-1".

   En `docs/backlog/`, reemplazá "Mesas" y "Cobros" por "Órdenes" y "Pagos" (decisión 1), y actualizá en cada historia la lista de RNF que la condicionan según la nueva RNF-9.

   En `docs/backlog/historias/HU-02-mesas-activas.md`, el "Quiero" incluye el tiempo que lleva ocupada la mesa.
1. **Camino feliz.** Copiá mis bullets en `## Camino feliz` de cada historia, sin cambiarlos.
2. **Huecos.** Por cada historia, listá hasta 8 candidatos: casos límite, supuestos implícitos, escenarios que faltan y riesgos no mencionados. Priorizá los que salen del contexto: los huecos O1 a O4, los comportamientos entre tablets, los cortes de conexión (RNF-4), las repeticiones (RNF-6) y las confirmaciones (RNF-9). Cada candidato lleva:
   - un ID (`HU-01.h1`, `HU-01.h2`…);
   - la evidencia (ID de capacidad, observación, RF o RNF), o la marca "(propuesto, revisar)" si no tiene;
   - el criterio G/W/T que propondrías.

   No reescribas la historia ni mi camino feliz. Devolveme la lista en un único mensaje y esperá mis decisiones una vez: por cada ID, acepto, edito o descarto.
3. **Escribir.** En `## Criterios de aceptación` de cada historia:
   - primero, los criterios de mi camino feliz, en G/W/T;
   - después, los huecos que acepté o edité, con su ID;
   - al final, `### Descartados`: los IDs descartados con mi motivo, en una línea cada uno.
4. **INVEST.** Volvé a pasar la tabla INVEST. Si una historia ahora falla Small o Testable, proponé cómo partirla, pero no la partas sin mi OK.

## Reglas
- Criterios en español: **Dado** / **Cuando** / **Entonces** / **Y**.
- Declarativos: el Entonces describe un resultado observable para el mozo. Sin endpoints, códigos HTTP, nombres de campos ni tecnologías.
- Un criterio que no se pueda convertir en una prueba sin interpretarlo no es un criterio: reformulalo o señalalo.
- Commit en la rama con un mensaje en español. **No hagas push.**

## Criterios de éxito
- Cada historia tiene mi camino feliz literal y sus criterios G/W/T.
- Todos los huecos de la lista quedaron aceptados, editados o descartados, sin ninguno sin decidir.
- No queda ninguna marca "(propuesto, revisar)" en un criterio que yo haya aceptado.
- El README ya no tiene "Decisiones abiertas" ni menciona el piloto.
- Las historias con comportamiento entre tablets (HU-06, HU-07 y HU-10) tienen su criterio "con dos tablets".
```

**Ajuste humano:** Escribí el camino feliz de cada historia y tomé las 4 decisiones abiertas a partir del código del panel actual. Cambié el PRD: acceso solo con email y contraseña, una nueva lista de acciones que piden confirmación, la definición de pedido (un plato) y el pedido de ayuda en las dos vistas. Acepté en bloque los 81 huecos de la IA y después repasé los que no tenían evidencia: descarté 5. Aprobé partir HU-07 por Small, pero después cuestioné que existieran solicitudes sin comensal. El código mostró que es un defecto de la app del comensal, así que simplifiqué RF-25 y la historia nueva desapareció. Sumé un segundo restaurante a los datos de prueba para RNF-7 y moví un criterio para que HU-01 fuera independiente.

**Prompt 3:**

```text
[Sección 5 · Prompt 3]

## Objetivo
Estimar y priorizar las 11 historias de `docs/backlog/` (HU-01 a HU-11). Vamos a hacer planning poker: yo ya estimé por mi cuenta y no te voy a decir mis números hasta que me des los tuyos.

## Pasos
1. Leé `docs/backlog/`, con los criterios de aceptación de cada historia. Si te hace falta, también el PRD y el contexto. No leas nada fuera del repo ni el historial de git.
2. Devolveme en un único mensaje, y esperá mi respuesta, una tabla con cada historia:
   - tu estimación en la escala 1, 2, 3, 5, 8, 13, sin decimales;
   - el motivo en una línea: qué la hace compleja, qué es incierto o qué es riesgoso;
   - el impacto que le asignás (alto, medio o bajo), según cuánto aporta a operar el turno completo (M-1) y a cobrar sin errores (M-2, M-3).

   Los avisos en tiempo real, la reconexión y la recuperación después de un corte los deja el walking skeleton (ver el README del backlog): no los cuentes dentro de las historias.
3. Te paso mis estimaciones. En cada historia donde estemos a dos o más posiciones de distancia en la escala (por ejemplo, 2 y 5), explicá qué complejidad ves que yo quizá no vi, o qué te falta saber. **No promedies.** Esperá mi decisión final.
4. Si una historia queda en 13, no es Small: proponé cómo partirla, usando la nota de su tabla INVEST si la tiene. No la partas sin mi OK. Si la parto, la nueva historia toma el siguiente ID libre (HU-12…), sin renumerar las demás, y se estima en esta misma ronda.
5. Escribí en `## Estimación` de cada historia:
   - el valor acordado;
   - tu estimación y la mía;
   - el motivo de la decisión, si hubo discusión.
6. En `docs/backlog/README.md`, agregá:
   - la estimación acordada en la tabla de historias, y el total de puntos Must y Should;
   - la matriz impacto/complejidad en Mermaid (`quadrantChart`), con los cuadrantes "Quick wins", "Planificar", "Relleno" y "Evitar / aplazar". La complejidad sale de la estimación acordada; el impacto, del que decidí. Usá los IDs como etiquetas;
   - el orden del backlog, después del walking skeleton:
     - primero, las historias Must del flujo principal: el comensal confirma, el mozo manda a cocina, cobra y cierra la mesa;
     - después, el resto de las Must y al final las Should;
     - dentro de cada grupo, los quick wins primero;
     - el orden no puede poner una historia antes de otra de la que depende (columna Independiente de su tabla INVEST). Si mi priorización choca con una dependencia, avisame.

## Reglas
- En español.
- La estimación es complejidad relativa, no horas ni días.
- No cambies criterios de aceptación ni caminos felices: si al estimar ves un problema en un criterio, listalo al final de tu mensaje del paso 2.
- Commit en la rama con un mensaje en español. **No hagas push.**

## Criterios de éxito
- Cada historia tiene la estimación acordada, con la mía y la de la IA, y ninguna queda en 13 sin partir o sin una decisión mía.
- Las diferencias de dos o más posiciones quedaron discutidas y decididas por mí.
- La matriz y el orden del backlog están en `docs/backlog/README.md`, y el orden respeta las dependencias.
```

**Ajuste humano:** Decidí no hacer planning poker y acepté las estimaciones y el impacto de la IA (48 puntos). Resolví los 5 problemas que la IA vio al estimar, después de verificarlos en el código: las carreras entre tablets pasan a ser un riesgo aceptado, las solicitudes de MercadoPago se pueden eliminar como en el panel actual y sumé las dependencias de HU-06. Acepté que HU-08 vaya antes que HU-07 por la regla de quick wins.

---

### 6. Tickets de Trabajo

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

### 7. Pull Requests

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**
