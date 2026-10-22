# TK-01 · Réplica levantada, detrás de Toxiproxy, con el contrato comprobado

| | |
|---|---|
| **Tipo** | Backend (réplica y simulador) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Réplica" en el alcance, y el riesgo técnico "La réplica no arranca sin las variables de MercadoPago ni de almacenamiento de archivos" |
| **Readme.md** | Ticket de backend de la sección 6 |

## Objetivo

Dejar la réplica corriendo en el entorno local, con la copia sin cambios en `backend/`, los servicios de `compose.yaml` y Toxiproxy delante, y el contrato de los endpoints y eventos que usa la app comprobado por HTTP.

## Criterios heredados

- [SEG-c10](../../architecture/seguridad.md#43-criterios-nuevos) · Los secretos no están en el repo.
- [WS-c1](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app arranca contra la réplica. **En parte:** que la réplica arranca y atiende con las variables de MercadoPago y de archivos vacías o de mentira. El criterio completo es de [TK-06](TK-06-eventos-y-consulta-periodica.md).

## Alcance

**Incluye:**

- **La copia en `backend/`:** `order-pay-backend`, rama `main`, commit `c18b0f7`, con su código y su configuración de build. No entran datos, variables de entorno ni la configuración de despliegue de Tabbie (0002).
- **`backend/UPSTREAM.md`:** de qué repositorio y commit sale la copia, cómo se comprueba que sigue sin cambios y cómo se compara el contrato con el `main` de Tabbie (0002, "Predicción del límite").
- **`compose.yaml`:** la réplica, construida con el Dockerfile de la copia; MySQL 8, vacío al primer arranque; Redis 7, sin persistencia; y Toxiproxy, con su API accesible solo desde la máquina de desarrollo ([infraestructura.md](../../architecture/infraestructura.md), sección 2.1).
- **`replica/entornos/`:** los ejemplos de los dos perfiles, el normal y el de pruebas, con los nombres de las variables de [infraestructura.md](../../architecture/infraestructura.md), sección 5, y sin valores. El perfil de pruebas tiene vencimientos cortos de `JWT_EXPIRATION_WAITERS` y `REDIS_EXPIRATION_TIME`; el del JWT tiene que permitir los 3 minutos de WS-c10.
- **`replica/toxiproxy/`:** el proxy hacia la réplica, por el que pasa la app, y las dos formas de corte del skeleton (sección 4) listas para activarse por la API: "sin red" (rechaza las conexiones nuevas y cierra las abiertas) y "el sistema no responde" (deja las conexiones abiertas sin pasar datos).
- **Arranque sin MercadoPago ni archivos:** `MP_*`, `AWS_*` y `FRONT_URL` vacías o con valores de mentira, comprobando que ningún endpoint de la cadena del mozo ni del simulador las usa.
- **Prueba del contrato por HTTP**, a través de Toxiproxy, como la app: una por cada fila de la columna "Waiter App" del inventario (contexto, sección 3.1). Comprueba el método y la ruta, los guards de la tabla de trazabilidad (sin JWT responde 401 donde hay "J"), los campos del cuerpo que manda la app y los de la respuesta que lee. Los eventos se comprueban abriendo el stream: con un JWT vigente se abre; con uno vencido responde 401 antes de abrirse (C1).
- **El detector de secretos** de SEG-c10, sobre todo el historial y todas las ramas.

**No incluye:**

- Los datos iniciales y las cuentas de prueba: [TK-02](TK-02-datos-iniciales.md).
- La comprobación de O1 a O4 (SEG-c1 a SEG-c4), que necesita el simulador: [TK-03](TK-03-simulador-mesas-y-pedidos.md) y [TK-04](TK-04-simulador-cobros.md).
- Los escenarios del simulador: TK-03, TK-04 y [TK-12](TK-12-simulador-cancelar-pedido.md).
- El entorno de demo en Railway ([infraestructura.md](../../architecture/infraestructura.md), sección 2.2): no lo pide ningún criterio de esta descomposición (ver el [índice](README.md), "Fuera de esta descomposición").
- La app: [TK-05](TK-05-app-base.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `backend/` (solo para poner la copia y `UPSTREAM.md`), `compose.yaml`, `replica/entornos/` y `replica/toxiproxy/`. La prueba del contrato, fuera de `backend/`, en la carpeta que se decida (ver "Riesgos y decisiones pendientes").
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 2): los módulos de la copia tal como están, sin tocarlos: `AppModule`, `AuthModule`, `FirebaseAdminModule`, los guards, `RestaurantsModule`, `OrderModule`, `TableSessionModule`, `PaymentModule`, `SseModule` y `RedisModule`.

## Contrato que usa

Las filas de la columna "Waiter App" del inventario ([contexto, sección 3.1](../../context/panel-mozos-actual.md#31-endpoints-y-eventos-usados)), por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad):

- **HTTP:** T01, T05, T06, T07, T08, T09, T11, T12, T13 y T14.
- **Eventos de `/sse/waiters`:** T16, T17 e `in-person-payment-request-deleted`, que no tiene fila.

No comprueba las filas que la app no usa: T02, T03, T04, T10, T15 y T18.

## Requisitos de prueba del backlog

- **Un vencimiento corto, configurable, de la sesión y de las solicitudes de cobro:** el perfil de pruebas de `replica/entornos/`.
- **Una forma de provocar fallos parciales al mandar a cocina y al cancelar:** la parte de Toxiproxy, para la falta de respuesta, las demoras y los cortes ([infraestructura.md](../../architecture/infraestructura.md), sección 4).

## Dependencias

Ninguna. Es el primer ticket.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de SEG-c10 y de la parte de WS-c1, y una spec del contrato con una entrada por cada fila del inventario.
2. Escribir las pruebas primero: el detector de secretos, el arranque de la réplica y el contrato. Las del arranque y el contrato fallan, porque todavía no hay réplica.
3. Copiar `c18b0f7` en `backend/` sin tocar ningún archivo, y escribir `UPSTREAM.md`. Comprobar que el `diff` contra el commit da vacío.
4. Escribir los ejemplos de los perfiles en `replica/entornos/`, y armar el archivo local de variables, que no entra al repo, con las credenciales del proyecto de Firebase de Tabbie y un `JWT_SECRET` propio del entorno local.
5. Escribir `compose.yaml` con los cuatro servicios. Levantar y comprobar que la réplica se conecta a MySQL y Redis y crea el esquema desde sus entidades (`DB_SYNC` activada).
6. Arrancar con `MP_*`, `AWS_*` y `FRONT_URL` vacías. Si la copia no arranca, usar valores de mentira, nunca cambiar su código, y dejar anotado en el ejemplo qué variable lo necesita.
7. Configurar en `replica/toxiproxy/` el proxy hacia la réplica y las dos formas de corte. Comprobar por la API que cada una se activa, tiene el efecto esperado y se quita.
8. Completar las pruebas del contrato, a través de Toxiproxy y sin fallos activos, hasta que pasen todas.
9. Correr el detector de secretos sobre todo el historial y todas las ramas.
10. Actualizar [infraestructura.md](../../architecture/infraestructura.md) con los comandos reales del entorno local, y [estructura.md](../../architecture/estructura.md) si alguna carpeta quedó distinta.
11. Abrir el PR desde una rama `mc`, con el `diff` vacío de `backend/` como evidencia.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Backend](../definition-of-done.md#backend-réplica-y-simulador).
- **Propio del ticket:**
  - El PR muestra que el `diff` de `backend/` contra `c18b0f7` da vacío, salvo `UPSTREAM.md`.
  - La réplica arranca desde cero con `compose.yaml` y un archivo local de variables, siguiendo solo lo que dice [infraestructura.md](../../architecture/infraestructura.md).
  - Cada fila de la columna "Waiter App" del inventario tiene su prueba del contrato, y pasa a través de Toxiproxy.
  - Las dos formas de corte se activan y se quitan por la API de Toxiproxy, y una prueba comprueba el efecto de cada una.
  - Si una prueba del contrato no coincide con el contexto, se corrige el contexto, no la copia.

## Riesgos y decisiones pendientes

- **Riesgo técnico del skeleton** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 6): "La réplica no arranca sin las variables de MercadoPago ni de almacenamiento de archivos". Se despeja en el paso 6.
- **Predicción del límite** (0002): si al comparar el contrato con el `main` de Tabbie hay diferencias, la réplica pasa a un commit nuevo con un ADR que reemplaza a 0002. No se edita a mano ningún archivo de la copia ([estructura.md](../../architecture/estructura.md), "Copia aislada del backend").
- **Pendiente:** dónde viven las pruebas de integración de la réplica ([índice](README.md#decisiones-pendientes)).
- **Pendiente:** cómo obtiene la prueba del contrato un JWT de mozo antes de que existan las cuentas de TK-02 ([índice](README.md#decisiones-pendientes)).
- **Pendiente:** quién provoca los cortes y los fallos: "Falta decidir si los provoca el simulador por la API de Toxiproxy o se provocan aparte" ([componentes.md](../../architecture/componentes.md), "Decisiones pendientes").
