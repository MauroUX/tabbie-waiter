# TK-04 · App: proyecto, variantes, inicio de sesión mínimo y registro de diagnóstico

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Arranque e inicio de sesión" y "Registro de diagnóstico" en el alcance |
| **Wireframe** | Ninguno: las pantallas del skeleton son sin diseño. La primera con wireframe es "Órdenes" ([TK-09](TK-09-ordenes.md)). |

## Objetivo

Crear el proyecto Android con sus tres variantes, iniciar sesión con una cuenta de prueba de mozo y mostrar en una lista sin diseño las mesas activas de su restaurante, anotando cada cambio de estado en el registro de diagnóstico.

## Criterios heredados

- [SEG-c7](../../architecture/seguridad.md#43-criterios-nuevos) · Solo HTTPS fuera de la réplica local.
- [WS-c1](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app arranca contra la réplica. **En parte:** el inicio de sesión, la lista sin diseño con las mesas de T05 y la primera consulta de mesas en el registro. El criterio completo es de [TK-05](TK-05-eventos-y-consulta-periodica.md).

## Alcance

**Incluye:**

- **Proyecto Gradle** en `android/`, con un único módulo `app`, el wrapper y el catálogo de versiones, y el stack de 0003: Kotlin, Jetpack Compose, MVVM con flujo de datos unidireccional y Hilt. ktlint configurado, para la CI (DP-11).
- **Variantes** ([infraestructura.md](../../architecture/infraestructura.md), sección 2.3): réplica local, réplica de demo y Tabbie. Cambian solo la URL base; la local, además, permite HTTP sin cifrar solo hacia la máquina de desarrollo (PA-7). La réplica local se alcanza directo, sin Toxiproxy, que va en la ampliación (DP-04).
- **Firebase Authentication:** la app registrada en el proyecto de Firebase de Tabbie, una sola vez para las tres variantes.
- **Sesión, lo mínimo:** email y contraseña en Firebase y canje del ID token por el JWT en T01. Guarda en memoria el JWT, su `exp`, el `restaurantId` y el rol, y usa ese restaurante en todas las llamadas (PA-2).
- **Pantalla de inicio de sesión sin diseño:** email, contraseña y "Entrar".
- **Cliente HTTP, la base:** Retrofit y OkHttp, un solo cliente sin reintentos automáticos (DP-27), con la URL base de la variante y `Authorization: Bearer <JWT>` en todas las llamadas menos el canje.
- **Salón, lo mínimo:** consulta T05 con el `restaurantId` de la sesión y muestra las mesas en una lista sin diseño.
- **Registro de diagnóstico** ([walking-skeleton.md](../../architecture/walking-skeleton.md), sección 4): anota cada cambio del estado con la hora, qué cambió y de dónde vino, y se lee desde la máquina, sin pantalla. No anota el JWT, la URL del stream, emails, nombres de comensales ni tokens de MercadoPago (PA-6).

**No incluye:**

- La conexión de eventos y la consulta periódica de mesas, solicitudes y cobros: [TK-05](TK-05-eventos-y-consulta-periodica.md).
- El aviso sin conexión y la reconexión: [TK-06](TK-06-aviso-y-reconexion.md).
- El cliente de las acciones que cambian datos: [TK-07](TK-07-cliente-de-acciones.md).
- La navegación principal y "Órdenes": [TK-09](TK-09-ordenes.md).
- El diseño del inicio de sesión, sus errores, el rechazo de quien no es mozo y la sesión guardada en DataStore: [TK-11](TK-11-inicio-de-sesion.md).
- La renovación del JWT y el 401: van en la ampliación.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `android/`, con `sesion/`, `salon/` (lo mínimo), `comun/red/` y la raíz del paquete base, y sus pruebas.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Sesión (inicio y canje), Cliente HTTP (la base), Salón (lo mínimo) y la pantalla de inicio de sesión, sin diseño.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T19 (inicio de sesión en Firebase), T01 (canje) y T05 (mesas activas).

## Requisitos de prueba del backlog

Ninguno de la lista del backlog. Usa la cuenta del primer mozo del restaurante 1 de [TK-02](TK-02-datos-iniciales.md).

## Dependencias

- [TK-01](TK-01-replica.md): la réplica local.
- [TK-02](TK-02-datos-iniciales.md): las cuentas de prueba.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de SEG-c7 y de la parte de WS-c1.
2. Escribir las pruebas primero, y verlas fallar: pruebas locales de Sesión y del Cliente HTTP, y una prueba en el dispositivo que inicia sesión contra la réplica local y ve las mesas del restaurante 1.
3. Crear el proyecto Gradle con el stack de 0003 y ktlint.
4. Configurar las tres variantes, con la regla de HTTP sin cifrar solo en la local.
5. Escribir la Sesión mínima, el Cliente HTTP base y Salón mínimo, con la lista sin diseño.
6. Escribir el registro de diagnóstico.
7. Comprobar SEG-c7 con una compilación de la variante de demo apuntando a una URL `http://`.
8. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app). La pantalla es sin diseño: RNF-10 aplica desde [TK-09](TK-09-ordenes.md).
- **Propio del ticket:**
  - El registro de diagnóstico se lee desde la máquina y no contiene nada de lo que excluye PA-6.
  - Las tres variantes compilan, y solo la local permite HTTP sin cifrar.

## Riesgos y decisiones

- **PA-7** ([seguridad.md](../../architecture/seguridad.md)): la réplica local no tiene TLS, así que la variante local permite HTTP sin cifrar solo hacia la máquina de desarrollo.
- **Decidido (DP-27):** un solo cliente HTTP, sin reintentos automáticos, para las consultas y las acciones ([componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14)).
- **Decidido (DP-41):** en el lote 1, la URL base de la variante local apunta a la réplica; desde la ampliación, a Toxiproxy ([infraestructura.md](../../architecture/infraestructura.md), sección 2.3).
