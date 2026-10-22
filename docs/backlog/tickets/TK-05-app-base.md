# TK-05 · App: proyecto, variantes, inicio de sesión mínimo y registro de diagnóstico

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Arranque e inicio de sesión" y "Registro de diagnóstico" en el alcance |

## Objetivo

Crear el proyecto Android con sus tres variantes, iniciar sesión con una cuenta de prueba de mozo y mostrar en una lista sin diseño las mesas activas de su restaurante, anotando cada cambio de estado en el registro de diagnóstico.

## Criterios heredados

- [SEG-c7](../../architecture/seguridad.md#43-criterios-nuevos) · Solo HTTPS fuera de la réplica local.
- [WS-c1](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app arranca contra la réplica. **En parte:** el inicio de sesión, la lista sin diseño con las mesas de T05 y la primera consulta de mesas en el registro. El criterio completo es de [TK-06](TK-06-eventos-y-consulta-periodica.md).

## Alcance

**Incluye:**

- **Proyecto Gradle** en `android/`, con un único módulo `app`, el wrapper y el catálogo de versiones, y el stack de 0003: Kotlin, Jetpack Compose, MVVM con flujo de datos unidireccional y Hilt. ktlint configurado.
- **Variantes** ([infraestructura.md](../../architecture/infraestructura.md), sección 2.3): réplica local, réplica de demo y Tabbie. Cambian solo la URL base; la local, además, permite HTTP sin cifrar solo hacia la máquina de desarrollo (PA-7).
- **Firebase Authentication:** la app registrada en el proyecto de Firebase de Tabbie, una sola vez para las tres variantes.
- **Sesión, lo mínimo:** email y contraseña en Firebase y canje del ID token por el JWT en T01. Guarda en memoria el JWT, su `exp`, el `restaurantId` y el rol, y usa ese restaurante en todas las llamadas (PA-2).
- **Pantalla de inicio de sesión sin diseño:** email, contraseña y "Entrar".
- **Cliente HTTP, la base:** Retrofit y OkHttp, con la URL base de la variante, y `Authorization: Bearer <JWT>` en todas las llamadas menos el canje.
- **Salón, lo mínimo:** consulta T05 con el `restaurantId` de la sesión y muestra las mesas en una lista sin diseño.
- **Registro de diagnóstico** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 4): anota cada cambio del estado con la hora, qué cambió y de dónde vino, y se lee desde la máquina, sin pantalla. No anota el JWT, la URL del stream, emails, nombres de comensales ni tokens de MercadoPago (PA-6).

**No incluye:**

- La conexión de eventos y la consulta periódica de mesas, solicitudes y cobros: [TK-06](TK-06-eventos-y-consulta-periodica.md).
- El aviso sin conexión y la recuperación: [TK-07](TK-07-cortes-y-recuperacion.md).
- La renovación del JWT y el 401: [TK-08](TK-08-renovacion-del-jwt.md).
- El cliente de las acciones que cambian datos: [TK-09](TK-09-cliente-de-acciones.md).
- El diseño del inicio de sesión, sus errores, el rechazo de quien no es mozo y la sesión guardada en DataStore: [TK-10](TK-10-inicio-de-sesion.md).
- La navegación principal y "Órdenes": [TK-13](TK-13-ordenes.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `android/gradle/`, `android/app/` y, dentro del paquete base, la raíz (aplicación de Hilt y actividad), `sesion/`, `salon/` y `comun/red/`, con sus pruebas en `test/` y `androidTest/`.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Sesión (inicio de sesión y canje), Cliente HTTP, Salón (consulta de mesas) y Pantalla de inicio de sesión, en su versión mínima.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T19 (Firebase Authentication), T01 (canje) y T05 (mesas activas).

## Requisitos de prueba del backlog

- **Datos iniciales con dos restaurantes, y dos mozos en el primero:** la cuenta del primer mozo del restaurante 1, de [TK-02](TK-02-datos-iniciales.md).

## Dependencias

- [TK-01](TK-01-replica.md): la réplica detrás de Toxiproxy.
- [TK-02](TK-02-datos-iniciales.md): las cuentas de prueba.
- Para ver mesas en la lista hace falta ocuparlas con [TK-03](TK-03-simulador-mesas-y-pedidos.md); sin él, la prueba ve la lista vacía.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de SEG-c7 y de la parte de WS-c1.
2. Escribir las pruebas primero, y verlas fallar: las dos de SEG-c7, el inicio de sesión contra la réplica local y la lista con las mesas que devuelve T05.
3. Crear el proyecto Gradle con el stack de 0003 y ktlint, y las tres variantes con su URL base y su configuración de tráfico sin cifrar.
4. Registrar la app en el proyecto de Firebase de Tabbie y conectar el SDK.
5. Escribir la Sesión mínima, el Cliente HTTP base y el Salón mínimo, conectados con Hilt.
6. Escribir la pantalla de inicio de sesión y la lista sin diseño.
7. Escribir el registro de diagnóstico, y comprobar que no anota nada de lo que excluye PA-6.
8. Documentar en [infraestructura.md](../../architecture/infraestructura.md) cómo se compila e instala cada variante, y fijar en [estructura.md](../../architecture/estructura.md) el nombre del paquete base.
9. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app). Los estados de carga, error y vacío aplican a la lista sin diseño; la tablet en horizontal y en español aplica desde las pantallas con diseño ([TK-10](TK-10-inicio-de-sesion.md) en adelante).
- **Propio del ticket:**
  - Las tres variantes compilan, y solo difieren en la URL base y en el tráfico sin cifrar de la local.
  - El registro de diagnóstico se lee desde la máquina, sin abrir la app.

## Riesgos y decisiones pendientes

- **Registro en Firebase:** "Las tres usan el proyecto de Firebase de Tabbie (0002), donde hay que registrar la app Android" ([infraestructura.md](../../architecture/infraestructura.md), sección 2.3). Hace falta alguien con acceso a ese proyecto.
- **PA-6** ([seguridad.md](../../architecture/seguridad.md)): el registro de diagnóstico es nuevo y es donde es más fácil filtrar un dato sensible.
- **Pendiente:** "Reintentos de OkHttp en las consultas: 0007 desactiva `retryOnConnectionFailure` en las acciones que cambian datos. No dice si las consultas usan el mismo cliente o uno con los reintentos de OkHttp" ([componentes.md](../../architecture/componentes.md), "Decisiones pendientes").
