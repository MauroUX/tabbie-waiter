> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras


## Flujo de trabajo con IA

**Herramientas**
- Claude Code, en la app de escritorio.
- Una conversación aparte, para consultar dudas, destrabarme y armar cada prompt.
- Cada prompt corre en una sesión nueva sobre este repo, empezando con `[Sección X · Prompt N]`.

**Modelos**
- Claude Opus 5.5 en todo el trabajo: para las consultas y el armado de los prompts, y para leer el código de Tabbie y escribir los documentos.

**Skills, subagentes, rules y comandos**
- Todavía no hay ninguno propio.
- En `1·P1` (sección 1, prompt 1) se usaron subagentes `Explore` para leer en paralelo el front y el back de Tabbie.
- Los propios llegan con la configuración del proyecto, en la Entrega 2: `AGENTS.md` con la Definition of Done, OpenSpec, un hook que bloquea datos sensibles en el commit, un subagente de revisión adversarial y una skill de commit.

**Workflow**: desarrollo guiado por especificaciones (SDD), en este orden:
1. contexto del sistema actual, trazado hasta el código;
2. PRD por capas;
3. historias;
4. estimación y prioridad;
5. arquitectura (ADRs, C4, componentes, walking skeleton, estructura, infraestructura y seguridad);
6. modelo de datos;
7. Definition of Done y tickets.

Así quedan los documentos de `docs/`; el `Readme.md` los resume y los enlaza.

**Cómo se escriben los prompts**
- Un solo objetivo por prompt.
- Las decisiones ya tomadas, escritas en el prompt para que la IA no las vuelva a decidir.
- En los prompts de producto y arquitectura, una sola ronda de cuestionamiento, en la que la IA discute antes de escribir.
- Criterios de éxito verificables.
- Lo que la IA no puede decidir con los documentos se lista como "Decisiones pendientes", sin decidirlo.
- El código de Tabbie se lee solo en un commit fijo, sin modificarlo, y nunca se leen archivos `.env` ni datos.

**Cómo se revisa**
- Se lee el resultado de cada prompt y se comprueban en el código de Tabbie, en solo lectura, los hallazgos que más pesan.
- Lo que hay que corregir va en un prompt nuevo.
- En la arquitectura, cinco prompts corrieron en paralelo, y un prompt de ajustes corrigió las inconsistencias entre los documentos.

**Ajustes humanos más importantes** (el detalle está debajo de cada prompt)
- Se mantuvo la app nativa Android aunque la IA proponía una PWA o React Native.
- El humano escribió el camino feliz de cada historia, y la IA buscó los huecos.
- Se descartó el planning poker y se aceptó la estimación de la IA.
- La app no tiene base local (sale Room), y la réplica valida con el Firebase de Tabbie, contra la recomendación de la IA.
- Por la fecha, los tickets viven en el repo y el gestor queda para la Entrega 2.

---

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

```text
[Sección 2.1 · Prompt 1]

## Objetivo
Registrar las decisiones de arquitectura de **Tabbie Waiter App** como ADRs en `docs/adr/`, en formato Nygard: título, contexto, decisión, estado y consecuencias. Las decisiones ya están tomadas y van abajo: tu trabajo es transcribirlas, no decidirlas.

La base es `docs/prd/tabbie-waiter-mvp.md`, `docs/context/panel-mozos-actual.md` y `docs/backlog/README.md`. No leas el código de Tabbie.

## ADRs que hay que escribir
Un archivo por decisión, `docs/adr/NNNN-<titulo-corto>.md`, y un `docs/adr/README.md` con el índice (número, título y estado) y el formato que se usa.

1. **0001 · App nativa Android para tablet.**
   - Contexto: el mozo opera todo el turno en una tablet que entrega el restaurante, en modo kiosco. Más adelante la operación va a necesitar imprimir comandas por Bluetooth, operar sin conexión y recibir avisos con la pantalla bloqueada. Están en el no-alcance del MVP (PRD, sección 5), pero condicionan la plataforma.
   - Decisión: app nativa Android en Kotlin con Jetpack Compose, solo para tablet en horizontal (RNF-10).
   - Alternativas descartadas: una app web instalable (PWA) y React Native. Las dos reemplazan el panel, pero el navegador limita la impresora Bluetooth y los avisos con la pantalla bloqueada, y React Native agrega una capa sobre las mismas APIs nativas.
   - Consecuencias: hay que compilar y distribuir un APK, y el proyecto mantiene Kotlin además de TypeScript.
2. **0002 · Réplica del backend: copia sin cambios y simulador de comensales.**
   - Contexto: la app no se puede probar contra el backend productivo de Tabbie, y el backend no se modifica (PRD, sección 9).
   - Decisión:
     - la réplica es una **copia sin cambios** del backend actual (`order-pay-backend`, rama `main`, commit `c18b0f7`, el mismo que documenta el contexto): mismo contrato, mismos eventos y mismo comportamiento, incluidos sus huecos O1 a O4. No agrega guards, eventos ni endpoints;
     - se copian el código y su configuración de build. No se copian datos, variables de entorno ni la configuración de despliegue de Tabbie;
     - se suma un **simulador de comensales** que usa los mismos endpoints que la app del comensal (unirse a la mesa, crear y confirmar pedidos, pedir ayuda, pedir un cobro presencial y cancelar);
     - la réplica valida el inicio de sesión con el **mismo proyecto de Firebase de Tabbie**. Así la app pasa al backend real cambiando solo la URL base;
     - los datos iniciales de la réplica son propios y sintéticos;
     - lo que la réplica necesita para las pruebas (datos iniciales, vencimientos cortos y fallos provocados) se resuelve fuera de su código: con datos, variables de entorno, el simulador y un proxy de red;
     - **predicción del límite** (un apartado propio dentro de "Decisión"): "Los cambios de la Waiter App no van a requerir cambios en el backend de Tabbie, y el contrato de los endpoints y eventos que usa la app (contexto, sección 3.1, columna Waiter App) no va a cambiar mientras dure el MVP." **Cómo se comprueba:** antes de cada entrega y antes de pasar al backend real, se compara ese contrato entre el commit copiado y el `main` de Tabbie. Si cambió, la réplica se actualiza a un commit nuevo, con un ADR que reemplaza a este. Si el cambio rompe la app, la ventana de compatibilidad la abre el backend de Tabbie, con fecha de cierre.
   - Consecuencias:
     - la app hereda O1 a O4 y los rodea con su comportamiento;
     - la réplica necesita las credenciales del proyecto de Firebase de Tabbie, como secreto del entorno;
     - las cuentas de prueba existen en ese proyecto de Firebase;
     - la copia puede quedar atrás del backend real, y la predicción es la que lo vigila.
3. **0003 · Stack.**
   - Réplica: lo que trae la copia (NestJS 10, TypeORM, MySQL 8, Redis 7 y Node 20). No es una elección: viene con la copia.
   - App: Kotlin, Jetpack Compose, MVVM con flujo de datos unidireccional, Hilt, Retrofit y OkHttp, OkHttp SSE para los eventos, Firebase Authentication y DataStore.
   - Simulador: TypeScript sobre Node 20, un cliente HTTP por línea de comandos. Motivo: el mismo lenguaje que la réplica, y no comparte código con la app.
   - Pruebas de red: Toxiproxy, un proxy TCP que se controla por API, entre la app y la réplica.
4. **0004 · Autenticación y renovación de la sesión.**
   - Contexto: el backend canjea el ID token de Firebase por un JWT propio en `POST /auth/login`. El JWT de un mozo dura `JWT_EXPIRATION_WAITERS` (16 h por defecto) y **el backend no tiene endpoint de renovación**. El stream de eventos recibe el JWT en la URL (contexto, C1 y sección 5).
   - Decisión:
     - inicio de sesión solo con email y contraseña en Firebase, y canje en `POST /auth/login`. El ID token de Firebase se usa solo en ese canje;
     - si el rol no es `waiter`, la app cierra la sesión de Firebase, descarta el JWT y muestra el mensaje de RF-2;
     - la app toma el restaurante del inicio de sesión y lo usa en todas las llamadas (RNF-7);
     - **renovar es volver a canjear:** antes de que venza el JWT (según su `exp`) y ante un 401, la app pide un ID token nuevo a Firebase y vuelve a llamar a `POST /auth/login`. Hay una sola renovación en curso a la vez. Si falla, lleva al mozo al inicio de sesión (RF-3);
     - un 401 en una **consulta** se repite una vez con el JWT nuevo. Un 401 en una **acción que cambia datos** no se repite: la app renueva, actualiza el estado y deja que el mozo la intente de nuevo (RNF-6);
     - al renovar, la conexión de eventos se reabre con el JWT nuevo.
   - Consecuencias: la sesión del turno depende de que la sesión de Firebase siga válida en la tablet. La renovación se prueba con un vencimiento corto del JWT, por variable de entorno de la réplica.
5. **0005 · Estado de la app sin base de datos local.**
   - Contexto: RNF-8 dice que en la tablet solo quedan la sesión y las marcas de "Atendido", y operar sin conexión está en el no-alcance. Una copia local de los datos del backend sería una segunda fuente de verdad, que tarde o temprano deja de coincidir.
   - Decisión: el backend es la única fuente de verdad. La app tiene el estado de la operación solo en memoria y lo recarga del backend. DataStore guarda la sesión, cifrada con una clave del Android Keystore, y las marcas de "Atendido" por sesión de mesa. No se usa Room.
   - Consecuencias: al reiniciar la app se recarga todo; sin conexión no hay datos que mostrar, y RNF-4 avisa; si en el futuro entra la operación sin conexión, un ADR nuevo reemplaza a este.
6. **0006 · Tiempo real: eventos más consulta periódica.**
   - Contexto: por `/sse/waiters` el backend emite solo tres eventos (`order-confirmed-notification`, `in-person-payment-request` e `in-person-payment-request-deleted`), desde la memoria de su única instancia, sin heartbeat ni replay: lo que se emite durante un corte se pierde. Los demás cambios no emiten eventos (contexto, sección 5).
   - Decisión:
     - una sola conexión de eventos para los tres (RNF-1);
     - consulta periódica de mesas, solicitudes y cobros para todo lo demás (RNF-2);
     - actualización después de cada acción (RNF-3);
     - reconexión con espera creciente y, al reconectar, actualización de mesas, solicitudes y cobros (RNF-4);
     - la consulta periódica también detecta los cortes, porque el stream no tiene heartbeat.
   - Consecuencias: hay tráfico constante de consultas mientras la app está abierta. La réplica y el backend real corren en **una sola instancia**, porque con más de una, un evento no llega a los clientes conectados a otra. Un reinicio o un despliegue del backend corta todas las conexiones, y la app se recupera sola.

## Cuestionamiento (una sola ronda)
Antes de escribir, devolveme en un único mensaje hasta 5 cuestionamientos, solo si una decisión contradice el PRD, el contexto o el backlog, o si falta un ADR para algo que un desarrollador nuevo preguntaría ("¿por qué lo hicieron así?"). Esperá mi respuesta una vez y después escribí.

## Reglas
- En español.
- Cada ADR cita por su ID los RF, RNF, capacidades u observaciones en los que se apoya.
- El estado de todos es "Aceptado".
- Transcribí: no agregues decisiones que no estén acá ni en mis respuestas. Si ves que falta una, listala al final de `docs/adr/README.md`, en "Decisiones pendientes".
- No toques el PRD, el contexto ni el backlog.
- Trabajá en la rama `feature/entrega-1-mc` y **no hagas commit**: dejá los cambios sin commitear.

## Criterios de éxito
- `docs/adr/` tiene los 6 ADRs y el README con el índice.
- Cada ADR tiene exactamente las cinco secciones de Nygard, y el 0002 incluye la predicción del límite y cómo se comprueba.
- Ninguna decisión contradice el PRD (en particular RNF-6, RNF-7 y RNF-8) ni el contexto.
- Al final me devolvés un resumen de 5 líneas como máximo.
```

**Ajuste humano:** Antes de escribir el prompt tomé cuatro decisiones. La app no tiene base local (Room sale, para cumplir RNF-8). La réplica valida con el Firebase de Tabbie: la IA recomendaba un proyecto propio, pero elegí el de Tabbie para que pasar al backend real sea cambiar solo la URL. El despliegue es local más Railway, y los fallos se provocan con el simulador y Toxiproxy. En la ronda de cuestionamiento acepté las 5 propuestas de la IA, y el ADR 0007 (acciones que cambian datos) que sumó aunque no estaba pedido.

**Prompt 2:**

```text
[Sección 2.1 · Prompt 2]

## Objetivo
Escribir `docs/architecture/README.md`: la vista general de la arquitectura de **Tabbie Waiter App**, con dos diagramas C4 en Mermaid (contexto y contenedores), el patrón que sigue, por qué se eligió, sus beneficios y sus sacrificios.

La base son los ADRs de `docs/adr/`, el PRD y el contexto. Las decisiones están en los ADRs: no las reabras.

## Contenido
1. **Índice** de `docs/architecture/`: este archivo y los que vienen (componentes, walking skeleton, estructura, infraestructura y seguridad), aunque todavía no existan.
2. **Diagrama de contexto (C4, nivel 1).** Personas y sistemas:
   - el mozo, que usa la Waiter App;
   - el comensal, que usa la app web de comensales;
   - el backend de Tabbie, o la réplica en las pruebas, con el mismo contrato;
   - Firebase Authentication (el proyecto de Tabbie);
   - MercadoPago, que solo usa el comensal;
   - el simulador de comensales, que en las pruebas reemplaza al comensal.
3. **Diagrama de contenedores (C4, nivel 2)** del sistema de pruebas: la app Android, la réplica (NestJS), MySQL, Redis, el simulador, Toxiproxy y Firebase Authentication. En cada flecha, qué viaja: HTTP con el JWT, el stream de eventos con el JWT en la URL, el canje del ID token, y las consultas a MySQL y a Redis.
4. **Patrón y justificación:** un cliente nativo sobre un backend existente con contrato fijo, probado contra una réplica idéntica. Explicá el porqué con los ADRs 0001, 0002 y 0005.
5. **Beneficios y sacrificios**, en una tabla. Los sacrificios, como mínimo:
   - la app hereda O1 a O4;
   - no hay renovación del JWT, así que se vuelve a canjear;
   - los eventos no tienen replay y hace falta consulta periódica;
   - el backend corre en una sola instancia;
   - la réplica puede quedar atrás del backend real;
   - las cuentas de prueba viven en el proyecto de Firebase de Tabbie.

## Reglas
- En español.
- Mermaid que renderice en GitHub: `flowchart` con la notación C4 en las etiquetas (persona, sistema o contenedor, y su tecnología). Si usás la sintaxis `C4Context`, verificá que GitHub la renderice.
- Es una arquitectura **propuesta**, porque todavía no hay código. Decilo al principio, y que los diagramas se regeneran desde el código cuando exista.
- Cada afirmación sobre el backend cita el ADR o la sección del contexto de donde sale.
- Trabajá en la rama `feature/entrega-1-mc` y **no hagas commit**: dejá los cambios sin commitear.
- Otras sesiones escriben al mismo tiempo otros archivos de `docs/`: tocá solo el tuyo.

## Criterios de éxito
- Los dos diagramas renderizan en GitHub y nombran la tecnología de cada contenedor.
- Todo contenedor del diagrama aparece en un ADR o en el contexto; ninguno se inventa.
- La tabla de sacrificios tiene, como mínimo, los seis de arriba, cada uno con su ADR u observación.
- Al final me devolvés un resumen de 3 líneas como máximo.
```

**Ajuste humano:** Lo corrí en paralelo con otros cuatro prompts y sin commit, para ganar tiempo. Para eso hice que dependiera solo de los ADRs. No corregí el resultado. La IA sumó sacrificios a los seis que había pedido, y quedaron 11.

**Prompt 3:**

### **2.2. Descripción de componentes principales:**

**Prompt 1:**

```text
[Sección 2.2 · Prompt 1]

## Objetivo
Escribir `docs/architecture/componentes.md`: los componentes principales de la app, de la réplica y del simulador, con su responsabilidad, su tecnología y lo que atienden del PRD.

La base son los ADRs de `docs/adr/`, el PRD, el contexto y el backlog.

## Decisiones (ya tomadas)
- **App** (ADRs 0003 a 0006), por capas: interfaz en Compose → ViewModel → repositorios → clientes de red y almacenamiento. Los componentes mínimos son:
  - **Sesión:** inicio de sesión, canje, renovación (ADR 0004), cierre de sesión y control del rol.
  - **Cliente HTTP:** agrega el JWT, renueva ante un 401 según el ADR 0004 y **no reintenta** las acciones que cambian datos (RNF-6).
  - **Eventos:** la única conexión al stream, la reconexión y el estado de la conexión (ADR 0006).
  - **Salón:** mesas activas y sus pedidos (T05). Alimenta "Órdenes" y la impresora virtual.
  - **Cobros:** solicitudes de cobro (T06) y cobros de cada mesa (T07).
  - **Acciones:** mandar a cocina, cancelar, registrar un cobro manual, confirmar o eliminar una solicitud y cerrar la mesa. Antes de actuar, actualizan el estado que necesitan y, si la acción ya no corresponde, avisan y no actúan (backlog, "Riesgos aceptados").
  - **Marcas de "Atendido":** por sesión de mesa, en DataStore (RF-16, RNF-8).
  - **Monitor de conexión:** la regla de los 5 segundos de RNF-4.
  - **Pantallas:** inicio de sesión, "Órdenes", "Pagos" e impresora virtual, con la navegación que decidió el backlog.
- **Réplica:** los módulos de NestJS que atienden los endpoints y eventos que usa la app (contexto, sección 3.1, columna Waiter App) y los que usa el simulador. Se describen como son, porque es una copia sin cambios (ADR 0002).
- **Simulador:** escenarios por línea de comandos que hacen lo que hace el comensal, contra la réplica. Los escenarios mínimos salen de las métricas (M-1, M-2 y M-3) y de los requisitos de prueba del backlog. Usa los endpoints del comensal que nombra el contexto ("Origen de los eventos" y sección 4). Los que el contexto no nombra (por ejemplo, unirse a la mesa) quedan pendientes para el diseño del simulador.

## Contenido
1. Una tabla por sistema (app, réplica y simulador): componente, responsabilidad, tecnología, RF y RNF que atiende, y endpoints o eventos que usa (por número del inventario o por fila de la trazabilidad).
2. Un diagrama de componentes de la app en Mermaid.
3. Un diagrama de secuencia en Mermaid del flujo principal: el comensal confirma un pedido, llega el aviso, el mozo lo manda a cocina, el comensal pide el cobro, el mozo lo confirma y cierra la mesa.
4. La cobertura: cada RF y cada RNF del PRD tiene al menos un componente responsable. Si alguno no lo tiene, listalo.

## Reglas
- En español. Sin código.
- No agregues componentes a la réplica: describí lo que trae la copia.
- Si tenés que decidir algo que no está en los ADRs ni en este prompt, no lo decidas: listalo al final, en "Decisiones pendientes".
- Trabajá en la rama `feature/entrega-1-mc` y **no hagas commit**: dejá los cambios sin commitear.
- Otras sesiones escriben al mismo tiempo otros archivos de `docs/`: tocá solo el tuyo.

## Criterios de éxito
- Todo RF (RF-1 a RF-32) y todo RNF (RNF-1 a RNF-10) tiene un componente responsable en la tabla de cobertura.
- Ningún componente de la app usa un endpoint que no esté en la columna "Waiter App" del inventario.
- Los dos diagramas renderizan en GitHub.
- Al final me devolvés un resumen de 3 líneas como máximo.
```

**Ajuste humano:** Lo corrí en paralelo y le saqué la lectura de la vista general, para que dependiera solo de los ADRs. No corregí el resultado. Quedaron 14 decisiones pendientes para el diseño del simulador, entre ellas cómo se autentica el comensal y cómo se une a la mesa.

**Prompt 2:**

```text
[Sección 2.2 · Prompt 2]

## Objetivo
Escribir `docs/architecture/walking-skeleton.md`: la épica facilitadora que deja la app, la réplica y el simulador conectados de punta a punta, con sus propios criterios de aceptación. Las historias del backlog usan esa base y no la construyen (backlog, "Reglas para el corte").

## Decisiones (ya tomadas)
- **No es una historia del backlog:** no tiene usuario ni valor observable por sí sola. Va antes de HU-01 en el orden del backlog.
- **Alcance:**
  - la app arranca contra la réplica, inicia sesión con una cuenta de prueba (lo mínimo de HU-01, sin sus huecos) y muestra las mesas activas sin diseño (lo mínimo de HU-02);
  - la conexión de eventos, la reconexión, el aviso de que no hay conexión y la recuperación después de un corte (RNF-1, RNF-2 y RNF-4, ADR 0006);
  - la consulta periódica de mesas, solicitudes y cobros;
  - la réplica con sus datos iniciales, y el simulador con el escenario mínimo que genera eventos;
  - el cliente HTTP que no reintenta las acciones que cambian datos (RNF-6).
- **Fuera del alcance:** todo lo que es de una historia: pantallas completas, acciones del mozo, avisos que ve el mozo y cobros.
- **Cómo se mide:** los tiempos de RNF-1 y RNF-2 se miden desde la hora en que el simulador hace la acción hasta que el cambio está en el estado de la app. Los cortes se provocan con Toxiproxy (ADRs 0002 y 0003).

## Contenido
1. Objetivo, alcance y fuera del alcance.
2. **Criterios de aceptación** en Dado / Cuando / Entonces, con el ID `WS-cN` y la evidencia entre paréntesis (RNF, ADR o sección del contexto). Como mínimo:
   - un pedido confirmado y una solicitud de cobro presencial llegan en 2 s o menos (RNF-1);
   - un cambio que no emite evento (un cobro, un pedido de ayuda, una mesa que se ocupa, una solicitud de MercadoPago) se ve en 30 s o menos (RNF-2);
   - más de 5 s sin comunicación muestra el aviso, y al volver todo se actualiza en 5 s o menos, sin que el mozo haga nada (RNF-4);
   - lo que se emitió durante un corte aparece después de reconectar;
   - un reinicio de la réplica corta el stream, y la app se reconecta sola;
   - al renovar el JWT, la conexión de eventos sigue con el nuevo (ADR 0004);
   - una acción que cambia datos y no responde no se repite (RNF-6).
3. **Riesgos técnicos** que el skeleton tiene que despejar primero. Por ejemplo: detectar un stream caído sin heartbeat, el JWT en la URL del stream, o que la réplica arranque sin las variables de MercadoPago ni de almacenamiento de archivos, que el flujo del mozo no usa.
4. **Hecho cuando:** los criterios pasan contra la réplica en el entorno local (`docs/architecture/infraestructura.md`, que se escribe después).

## Cuestionamiento (una sola ronda)
Antes de escribir, devolveme en un único mensaje hasta 5 cuestionamientos: un criterio que no se pueda medir, un RNF que quede sin cubrir o algo que choque con una historia. Esperá mi respuesta una vez.

## Reglas
- En español. Criterios declarativos, con el Then observable, sin código ni nombres de clases.
- No cambies el backlog ni las historias.
- Trabajá en la rama `feature/entrega-1-mc` y **no hagas commit**: dejá los cambios sin commitear.

## Criterios de éxito
- RNF-1, RNF-2, RNF-4 y RNF-6 tienen al menos un criterio cada uno, y cada criterio dice cómo se provoca y cómo se mide.
- Ningún criterio repite uno de una historia (por ejemplo, la solicitud eliminada en otra tablet es de HU-06).
- Al final me devolvés un resumen de 3 líneas como máximo.
```

**Ajuste humano:** Lo pasé al segundo lugar, antes de los paralelos, porque el documento de seguridad cita sus criterios. En la ronda de cuestionamiento acepté las 5 propuestas de la IA. Quedaron 11 criterios que miden el estado de la app, y cada uno dice cómo se provoca.

**Prompt 3:**

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:**

```text
[Sección 2.3 · Prompt 1]

## Objetivo
Escribir `docs/architecture/estructura.md`: la estructura de carpetas del monorepo y el propósito de cada una. Es una propuesta: **no crees carpetas ni archivos** fuera de ese documento, porque se crean al armar el proyecto.

## Decisiones (ya tomadas)
- **Monorepo** con la app, la réplica, el simulador y la documentación, para que un cambio y su spec entren en el mismo commit.
- **`backend/`** tiene solo la copia sin cambios del backend (ADR 0002), con un `UPSTREAM.md` que dice de qué repositorio y commit sale y cómo se compara el contrato. Nada propio entra en `backend/`: así, un `diff` contra el original da vacío.
- **`replica/`** tiene lo propio de la réplica: los datos iniciales sintéticos, el script que crea las cuentas de prueba en Firebase, la configuración de Toxiproxy y los perfiles de variables de entorno (solo ejemplos, sin valores).
- **`android/`**: un proyecto Gradle con un módulo `app`, organizado por funcionalidad (sesión, salón, cobros e impresora) más un paquete común (red, eventos y almacenamiento). Cada funcionalidad sigue las capas del ADR 0003.
- **`simulator/`**: el simulador (ADR 0003).
- **`docs/`**: `prd/`, `context/`, `backlog/`, `adr/`, `architecture/` y `api/`.
- **Raíz:** `compose.yaml`, `Readme.md` y `Prompts.md`. `AGENTS.md`, `CLAUDE.md` y `openspec/` llegan cuando se configure el proyecto.

## Contenido
1. El árbol hasta el segundo nivel (en `android/`, hasta los paquetes de funcionalidad), con una línea por carpeta.
2. El patrón que sigue cada parte y por qué: monorepo, copia aislada, y app por funcionalidad y por capas.
3. Qué carpeta toca cada tipo de ticket (backend, frontend y base de datos), para que los tickets sepan dónde trabajar. En este proyecto, los tickets de base de datos son de datos iniciales y configuración, no de migraciones, porque el esquema viene con la copia.

## Reglas
- En español. Sin código.
- Trabajá en la rama `feature/entrega-1-mc` y **no hagas commit**: dejá los cambios sin commitear.
- Otras sesiones escriben al mismo tiempo otros archivos de `docs/`: tocá solo el tuyo.

## Criterios de éxito
- Cada contenedor de los ADRs 0002 y 0003 tiene su lugar: la app, la réplica y el simulador en su carpeta; MySQL, Redis y Toxiproxy en `compose.yaml`. Firebase no, porque es externo.
- `backend/` no tiene nada propio.
- No se creó ninguna carpeta fuera de `docs/`.
- Al final me devolvés un resumen de 3 líneas como máximo.
```

**Ajuste humano:** Decidí que en `backend/` solo va la copia y que lo propio de la réplica va en `replica/`, para que el diff contra el original dé vacío. Lo corrí en paralelo, y por eso los contenedores se comprueban contra los ADRs. No corregí el resultado.

**Prompt 2:**

**Prompt 3:**

### **2.4. Infraestructura y despliegue**

**Prompt 1:**

```text
[Sección 2.4 · Prompt 1]

## Objetivo
Escribir `docs/architecture/infraestructura.md`: los entornos, el despliegue y la configuración de la réplica para las pruebas, con un diagrama de despliegue en Mermaid.

## Decisiones (ya tomadas)
- **Local (desarrollo y pruebas):** Docker Compose con MySQL 8, Redis 7, la réplica (con el Dockerfile que trae la copia) y Toxiproxy. La app corre en un emulador o en una tablet y llega a la réplica **a través de Toxiproxy**. El simulador corre por línea de comandos contra la réplica, sin pasar por el proxy.
- **Demo:** la réplica en Railway, en **una sola instancia**, con MySQL y Redis administrados y HTTPS, sin Toxiproxy. Es una sola instancia porque el stream de eventos vive en la memoria del proceso (ADR 0006), igual que en el backend real, que también corre en una sola instancia en Railway (contexto, sección 0).
- **App:** variantes de build que cambian solo la URL base: réplica local, réplica de demo y Tabbie. El APK de la variante de demo se publica en GitHub Releases. Todas usan el proyecto de Firebase de Tabbie (ADR 0002), donde hay que registrar la app Android.
- **Secretos:** las credenciales del proyecto de Firebase de Tabbie y el secreto del JWT son variables de entorno de cada entorno. Nunca entran al repo: el repo trae un archivo de ejemplo sin valores.
- **Esquema:** la réplica crea el esquema desde sus entidades al arrancar, con la sincronización que trae activada por defecto (`DB_SYNC`). La base de la demo es desechable.
- **Variables de entorno que lee la réplica** (verificadas en su código):
  - base: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `DB_SYNC`;
  - Redis: `REDIS_URL`, o `REDIS_HOST`, `REDIS_PORT` y `REDIS_PASSWORD`;
  - sesión: `JWT_SECRET`, `JWT_EXPIRATION_WAITERS` y `JWT_EXPIRATION`;
  - solicitudes de cobro: `REDIS_EXPIRATION_TIME`;
  - Firebase: `USE_FIREBASE` y los campos de la cuenta de servicio (`FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` y las demás `FIREBASE_*`);
  - servidor: `PORT` y `CORS_ORIGINS`;
  - el flujo del mozo no usa `MP_*`, `AWS_*` ni `FRONT_URL`, que quedan vacías.
- **Requisitos de prueba del backlog**, resueltos sin cambiar el código de la réplica:

  | Requisito | Cómo se logra |
  |---|---|
  | Dos restaurantes, con dos mozos en el primero y uno en el segundo | Datos iniciales sintéticos propios, que se cargan después de que la réplica crea el esquema, y un script que crea esas cuentas en Firebase. Sin datos de Tabbie. |
  | Vencimiento corto de la sesión y de las solicitudes de cobro | Las variables `JWT_EXPIRATION_WAITERS` y `REDIS_EXPIRATION_TIME`, en un perfil de pruebas. La réplica las lee al arrancar, así que cambiarlas exige reiniciarla. |
  | Fallos parciales al mandar a cocina y al cancelar | Fallos de negocio: el simulador cancela, como comensal, uno de los pedidos justo antes de la acción del mozo, y el backend rechaza ese pedido. Falta de respuesta, demoras y cortes: Toxiproxy, controlado por su API. |
  | Una solicitud sin comensal identificado (RF-25) | El simulador la crea con el comensal `guest`, como la crea la app del comensal cuando falla. El backend no valida ese cuerpo. |
  | El montaje de dos tablets | Dos emuladores, o una tablet y un emulador, con mozos distintos del primer restaurante, contra la misma réplica (local o de demo). |

## Contenido
1. Diagrama de despliegue en Mermaid, con los dos entornos.
2. Cada entorno: qué corre, dónde, con qué configuración y cómo se levanta (los pasos, sin comandos exactos, porque todavía no hay código).
3. El proceso de despliegue de la demo: qué dispara un despliegue, qué pasa con las conexiones abiertas (se cortan y la app se recupera, ADR 0006) y cómo se publica el APK.
4. La tabla de requisitos de prueba, con las historias que usan cada uno (backlog, "Requisitos de prueba").
5. Las variables de entorno de la réplica: **solo los nombres** y para qué sirve cada una, sin valores.

## Reglas
- En español. Sin código ni valores de variables.
- No leas archivos `.env` ni el código de Tabbie.
- Trabajá en la rama `feature/entrega-1-mc` y **no hagas commit**: dejá los cambios sin commitear.
- Otras sesiones escriben al mismo tiempo otros archivos de `docs/`: tocá solo el tuyo.

## Criterios de éxito
- Los cinco requisitos de prueba del backlog dicen cómo se logran, y ninguno cambia el código de la réplica.
- Dice, en un lugar visible, que el backend y la réplica corren en una sola instancia, y por qué.
- El diagrama renderiza en GitHub.
- Al final me devolvés un resumen de 3 líneas como máximo.
```

**Ajuste humano:** Elegí Docker Compose en local y la demo en Railway, en una sola instancia. Antes se verificó en el código del backend cómo lograr cada requisito de prueba sin modificarlo: variables de entorno para los vencimientos, y el simulador para la solicitud sin comensal y los fallos parciales. No corregí el resultado.

**Prompt 2:**

**Prompt 3:**

### **2.5. Seguridad**

**Prompt 1:**

```text
[Sección 2.5 · Prompt 1]

## Objetivo
Escribir `docs/architecture/seguridad.md`: las prácticas de seguridad de la app y de la réplica, los riesgos aceptados y cómo baja cada práctica a un criterio que se puede probar.

## Decisiones (ya tomadas)
- **El backend no se modifica** y la réplica es una copia sin cambios (ADR 0002): la seguridad del servidor es la del backend real, con sus huecos. Lo que este proyecto controla es lo que hace la app y cómo se opera la réplica.
- **Prácticas de la app:**
  - solo entra el rol `waiter` (RF-2);
  - un único restaurante, el del inicio de sesión, en todas las llamadas (RNF-7);
  - en la tablet solo quedan la sesión, cifrada con una clave del Android Keystore, y las marcas de "Atendido" (RNF-8, ADR 0005);
  - ninguna acción que cambia datos se repite sola, tampoco en el cliente HTTP (RNF-6);
  - no muestra datos sensibles aunque el backend los mande (RF-9, O4), y no los escribe en los registros: ni los cuerpos de las respuestas ni la URL del stream, que lleva el JWT;
  - solo HTTPS, salvo en la variante de réplica local;
  - la renovación de la sesión del ADR 0004.
- **Prácticas de la réplica y del repo:**
  - los secretos (las credenciales del proyecto de Firebase de Tabbie y el secreto del JWT) son variables de entorno y nunca entran al repo;
  - los datos iniciales son sintéticos: ningún dato de Tabbie entra a la réplica ni al repo;
  - las cuentas de prueba usan un dominio reservado para ejemplos (como `example.com`), para que se reconozcan en el proyecto de Firebase de Tabbie.
- **Riesgos aceptados** (el backend no se modifica):
  - O1 a O4 del contexto, cada uno con su efecto y lo que hace la app;
  - las carreras entre dos tablets (backlog, "Riesgos aceptados"): confirmar la misma solicitud, superar el saldo con un cobro manual, cancelar un pedido que acaba de recibir un cobro y cerrar una mesa dos veces;
  - el JWT viaja en la URL del stream de eventos, porque así lo pide el contrato;
  - las cuentas de prueba existen en el proyecto de Firebase de Tabbie, y sus credenciales se publican en el `Readme.md` para el evaluador. Si una inicia sesión contra el backend real, el backend le crea un usuario de comensal y la app la rechaza (RF-2): no llega a la operación.
- **Comprobar los huecos:** O1 a O4 están marcados "observado en el código, sin verificar en ejecución", y con la réplica se pueden verificar. Cada uno pasa a ser un criterio `SEG-cN` que lo comprueba contra la réplica, con su evidencia.

## Contenido
1. Prácticas de la app y de la réplica, cada una con su porqué y su evidencia (RF, RNF, ADR u observación).
2. Riesgos aceptados: qué puede pasar, cuándo, qué hace la app para acotarlo y por qué se acepta.
3. **Bajada a criterios:** una tabla de cada práctica al criterio que la prueba. Si el criterio ya existe en una historia o en el walking skeleton, citalo por su ID. Si no existe, escribilo acá en Dado / Cuando / Entonces, con el ID `SEG-cN`, para que los tickets lo hereden.

## Reglas
- En español. Sin código.
- No cambies el backlog, las historias ni el walking skeleton.
- Trabajá en la rama `feature/entrega-1-mc` y **no hagas commit**: dejá los cambios sin commitear.
- Otras sesiones escriben al mismo tiempo otros archivos de `docs/`: tocá solo el tuyo.

## Criterios de éxito
- Toda práctica tiene un criterio que la prueba (de una historia, del walking skeleton o `SEG-cN`).
- O1 a O4 y las cuatro carreras figuran como riesgo aceptado, con su motivo, y O1 a O4 tienen su criterio de comprobación.
- Ningún criterio pide cambiar el backend.
- Al final me devolvés un resumen de 3 líneas como máximo.
```

**Ajuste humano:** Acepté como riesgo que las cuentas de prueba vivan en el Firebase de Tabbie, consecuencia de haber elegido ese proyecto. También pedí que O1 a O4, que estaban sin verificar, se comprueben contra la réplica. No corregí el resultado.

**Prompt 2:**

**Prompt 3:**

### **2.6. Tests**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

### 3. Modelo de Datos

**Prompt 1:**

```text
[Sección 3 · Prompt 1]

## Objetivo
Escribir `docs/architecture/modelo-de-datos.md`: el modelo de datos que usa la Waiter App, fiel al backend actual, con un diagrama ER en Mermaid y la descripción de cada entidad.

## Decisiones (ya tomadas)
- **El modelo es el del backend, no uno nuevo.** La réplica es una copia sin cambios (ADR 0002) y crea el esquema desde sus entidades al arrancar (`DB_SYNC`, `infraestructura.md`). No hay migraciones ni tablas propias, y la app no tiene base local (ADR 0005).
- **Alcance:** las 13 tablas del inventario del contexto (sección 3.2), incluidas las dos intermedias M:N. Las tablas que el inventario deja afuera se nombran en una línea, con el motivo, sin describirlas.
- **Lo que no es relacional va aparte, sin diagrama ER:** las solicitudes de cobro en Redis y lo que guarda la tablet (contexto, sección 3.3; ADR 0005).

## Fuentes (solo lectura; no modifiques nada en `C:\Repos\Tabbie`)
- Las entidades del backend, en `C:\Repos\Tabbie\order-pay-backend\order-pay-backend\src\`, en el commit `c18b0f7`. Si el checkout no está en ese commit, leé cada archivo con `git show c18b0f7:<ruta>`. La ruta de cada entidad está en el contexto, sección 3.2.
- Los enums que usan esas entidades. De los servicios de la cadena del mozo (contexto, sección 2), solo los valores que escriben.
- `docs/context/panel-mozos-actual.md`, secciones 3 y 6.

## Contenido
1. **Diagrama ER en Mermaid** con las 13 tablas:
   - cada columna con su tipo y sus marcas `PK`, `FK` y `UK`;
   - cada relación con su cardinalidad y un rótulo corto;
   - `table.activeSessionId` va como columna, sin relación, porque no es una FK declarada.
2. **Una subsección por entidad**, con:
   - la tabla y la entidad, con su archivo y línea;
   - una tabla de columnas: nombre, tipo en MySQL, si acepta nulos, valor por defecto, PK, FK (a qué tabla y columna), único y una descripción corta;
   - las relaciones: con qué entidad, de qué tipo (1:1, 1:N o M:N), qué lado tiene la FK, si es eager y qué pasa al borrar (`onDelete`), si está declarado;
   - los índices y restricciones que declara la entidad;
   - en las columnas de estado, método o rol, **los valores que admite según el código**: los del enum y los que escriben los servicios de la cadena del mozo, aunque no estén en el enum.
3. **Almacenamiento fuera de la base:**
   - la clave de Redis de las solicitudes de cobro, con sus campos, su vencimiento y quién la escribe y la borra;
   - lo que guarda la tablet: la sesión y las marcas de "Atendido", sin respuestas del backend.
4. **Lo que hay que saber para usar el modelo:** una lista corta de lo que puede sorprender a quien escriba los datos iniciales o la app. Por ejemplo: un tipo que por JSON llega distinto de como se guarda, una columna con valores fuera de su enum o una relación sin FK.

## Reglas
- En español. Los nombres de tablas, columnas y valores, tal como están en el código.
- **Sacá el esquema del código, sin inventar.**
  - Si el decorador no declara un tipo, un largo o si acepta nulos, poné lo que usa TypeORM por defecto y marcalo "(por defecto de TypeORM)".
  - Si algo no se puede saber desde el código, escribí "no se sabe desde el código" en lugar de suponerlo.
- Los valores son los que aparecen en el código, no los que hay en la base. No tenés acceso a los datos de Tabbie y no tenés que buscarlos. Aclaralo una vez en el documento.
- No leas archivos `.env`, volcados ni datos.
- En el diagrama, los tipos van sin comas ni espacios (`decimal`, no `decimal(10,2)`), para que renderice en GitHub. El tipo completo va en la tabla de cada entidad.
- No cambies el contexto ni otros documentos. Si el código no coincide con el mapa de entidades del contexto (sección 6), listalo al final del documento, en "Diferencias con el contexto".
- Sumá el documento al índice de `docs/architecture/README.md`, con el estado "Escrito".
- Trabajá en la rama `feature/entrega-1-mc` y **no hagas commit**: dejá los cambios sin commitear.

## Criterios de éxito
- Las 13 tablas están en el diagrama y tienen su subsección. Cada columna tiene su tipo, si acepta nulos, si es PK, FK o única, y el archivo de origen.
- Las intermedias M:N muestran sus dos FK y su clave primaria compuesta.
- Todo valor de una columna de estado, método o rol tiene su origen en el código.
- El diagrama renderiza en GitHub.
- Al final me devolvés un resumen de 3 líneas como máximo, con las diferencias con el contexto si las hay.
```

**Ajuste humano:** Decidí que el modelo sea el del backend actual, sin tablas propias, y limité el alcance a las 13 tablas que usa el mozo. Pedí que los valores de las columnas salgan del código y que se marque lo que no se puede saber sin datos, porque no se leen datos de Tabbie. No corregí el resultado: las diferencias que encontró con el documento de contexto las corrijo aparte, en el cierre de la sección.

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

```text
[Sección 6 · Prompt 1]

## Objetivo
Definir la Definition of Done por tipo de ticket y descomponer en tickets el walking skeleton y las tres primeras historias del backlog: HU-01, HU-02 y HU-04.

## Decisiones (ya tomadas)
- **Dónde viven los tickets:** por ahora, como archivos en `docs/backlog/tickets/`, uno por ticket, con un `README.md` de índice. El gestor (GitHub Issues o Jira) todavía no está decidido. Cuando se decida, los tickets se crean ahí desde estos archivos.
- **La DoD** va en `docs/backlog/definition-of-done.md`, por tipo de ticket. Cuando se configure el proyecto, pasa a `AGENTS.md`.
- **Un ticket hereda los criterios y no los reescribe.** Los cita por su ID, con enlace (HU-nn.cN, HU-nn.hN, WS-cN y SEG-cN), y suma su Definition of Done. El scenario ejecutable, con el HTTP concreto, vive en la spec del cambio de OpenSpec y no en el ticket.
- **Tipos de ticket y su DoD mínima,** adaptados a este proyecto, donde el backend no se modifica:
  - **Backend (réplica y simulador):**
    - los criterios heredados pasan;
    - `backend/` queda idéntico a la copia de `c18b0f7`, y lo propio va en `replica/` o en `simulator/`;
    - los errores se manejan;
    - hay pruebas de integración por HTTP contra MySQL y Redis reales, desde fuera de `backend/`;
    - los secretos van solo como variables de entorno.
  - **Datos:** reemplaza a "migración", porque la réplica crea el esquema desde sus entidades y no hay migraciones.
    - Los datos se cargan sobre una base recién creada y se pueden volver a cargar desde cero.
    - Respetan los tipos, las FK y los valores que admite cada columna según `docs/architecture/modelo-de-datos.md`.
    - Son sintéticos, sin datos de Tabbie, y las cuentas usan un dominio de ejemplo.
    - Cada carga dice cómo se deshace: con otra carga, fallando en alto o solo recreando la base.
  - **Frontend (app):**
    - estados de carga, de error y vacío;
    - sin conexión, se comporta como dice el walking skeleton;
    - ninguna acción que cambia datos se repite sola (RNF-6, ADR 0007);
    - tablet en horizontal y en español (RNF-10);
    - ktlint sin errores y sin `!!`.
  - **Bug:** un test que reproduce el fallo antes del arreglo, un arreglo mínimo, el test en verde y un 5 porqués breve.
  - **Para todos:**
    - el primer paso es el cambio de OpenSpec, con un scenario por criterio heredado;
    - el test de cada scenario se escribe primero y falla;
    - el PR se revisa y sale de una rama con las iniciales `mc`.
- **Los tres tickets que van al `Readme.md`** tienen que salir de esta descomposición:
  - **base de datos:** los datos iniciales sintéticos de la réplica: dos restaurantes, dos mozos en el primero y uno en el segundo, mesas, productos y lo que pidan los criterios. Si conviene, se juntan con las cuentas de prueba en Firebase;
  - **backend:** la réplica levantada, con la copia en `backend/`, los servicios de `compose.yaml`, Toxiproxy y el contrato del inventario comprobado por HTTP;
  - **frontend:** mandar a cocina desde la pantalla "Órdenes" (HU-04).

## Fuentes
- `docs/backlog/README.md` (orden, dependencias y requisitos de prueba) y las historias HU-01, HU-02 y HU-04.
- En `docs/architecture/`: `walking-skeleton.md`, `componentes.md`, `estructura.md`, `infraestructura.md`, `seguridad.md` y `modelo-de-datos.md`.
- `docs/adr/` y `docs/context/panel-mozos-actual.md`.

## Contenido
1. `docs/backlog/definition-of-done.md`: la DoD de cada tipo, con su porqué en una línea.
2. Un archivo por ticket, `docs/backlog/tickets/TK-NN-<nombre>.md`, con:
   - el tipo, y la historia o el walking skeleton de origen;
   - el objetivo, en una oración;
   - los criterios heredados: la lista de IDs con enlace, sin reescribirlos;
   - el alcance: qué incluye y qué no, con el ticket que se ocupa de lo que queda afuera;
   - dónde se trabaja: las carpetas de `estructura.md` y los componentes de `componentes.md`;
   - el contrato que usa: los endpoints y eventos, por su fila del contexto (Tnn), sin redefinirlos;
   - los requisitos de prueba del backlog que necesita;
   - las dependencias con otros tickets;
   - los pasos, de inicio a fin, al nivel de qué hay que hacer, sin código;
   - la Definition of Done: la de su tipo, por enlace, más lo propio del ticket;
   - los riesgos y decisiones pendientes que lo afectan, citados de los documentos.
3. `docs/backlog/tickets/README.md`: una tabla con el ID, el título, el tipo, el origen y las dependencias, en el orden en que se hacen.
4. En el árbol de `docs/architecture/estructura.md`, sumá los tickets y la DoD a la línea de `docs/backlog/`.

## Cómo trabajar (por partes, escribiendo a medida que avanzás)
1. Escribí `definition-of-done.md`. Para eso alcanza con este prompt.
2. Escribí el índice `tickets/README.md`: la tabla de tickets y, por ticket, los IDs de los criterios que hereda. Para armarlo, leé solo los IDs y los títulos de los criterios, no los documentos enteros. Comprobá la cobertura sobre este índice.
3. Escribí los tickets **de a uno**, empezando por los tres del `Readme.md`. Para cada uno, leé solo las partes de los documentos que necesita.
4. Al final, el árbol de `estructura.md`.

No planifiques todos los tickets en detalle antes de escribir el primero.

## Reglas
- En español. Sin código.
- Cada ticket tiene un tamaño que un PR puede cerrar. Si uno es más grande, partilo.
- Cada criterio de HU-01, HU-02, HU-04 y del walking skeleton queda en al menos un ticket. Los SEG-cN se heredan donde corresponda.
- No cambies las historias, sus criterios, el walking skeleton ni los ADRs. Si algo no se puede decidir con los documentos, no lo decidas: listalo al final del índice, en "Decisiones pendientes".
- Trabajá en la rama `feature/entrega-1-mc` y **no hagas commit**: dejá los cambios sin commitear.

## Criterios de éxito
- Ningún ticket tiene criterios Dado / Cuando / Entonces propios: todos los heredan por ID.
- Ningún criterio de HU-01, HU-02, HU-04 ni del walking skeleton queda sin ticket.
- Existen los tres tickets del `Readme.md` (datos iniciales, réplica y mandar a cocina), con todo el detalle.
- Ningún ticket pide cambiar el código de `backend/`.
- Al final me devolvés un resumen de 3 líneas como máximo, con la cantidad de tickets por tipo.
```

**Ajuste humano:** Decidí que, por la fecha, los tickets vivan por ahora en el repo y que el gestor quede para la Entrega 2. Adapté la DoD por tipo a un backend que no se modifica: "migración" pasa a "datos", porque no hay migraciones, y "endpoint" pasa a "backend (réplica y simulador)", porque no hay endpoints nuevos. Limité la descomposición al walking skeleton y a las tres primeras historias del orden, y elegí los tres tickets del `Readme.md`. No corregí el resultado: las 18 decisiones pendientes que dejó se resuelven al arrancar la Entrega 2.

**Prompt 2:**

**Prompt 3:**

---

### 7. Pull Requests

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**
