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

**Prompt 2:**

**Prompt 3:**

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
