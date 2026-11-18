# Estructura del proyecto: Tabbie Waiter App

> La estructura de carpetas del monorepo, el propósito de cada una, el patrón que sigue cada parte y qué carpetas toca cada tipo de ticket.
>
> La base son las [decisiones de arquitectura](../adr/README.md), la [vista general](README.md) y los [componentes](componentes.md). Las decisiones están en los ADRs; este documento las ubica en carpetas.

**Es una estructura propuesta.** Todavía no existe ninguna de estas carpetas fuera de `docs/`: se crean al armar el proyecto. Cuando existan, este documento se actualiza con lo que quedó.

**Referencias:** las mismas que en los ADRs. Un número de cuatro cifras remite a un ADR; "PRD", "contexto" y "backlog" remiten a esos tres documentos; los IDs (RF-n, RNF-n, Cn, Tnn, HU-nn) son los de cada documento. Los componentes (Sesión, Salón, Cobros…) son los de [componentes.md](componentes.md).

## 1. Árbol

Hasta el segundo nivel; en `android/`, hasta los paquetes de cada funcionalidad.

```text
tabbie-waiter/
├── compose.yaml                 Servicios del entorno de prueba: MySQL 8, Redis 7, Toxiproxy y la carga de los datos iniciales
├── Readme.md                    Entrega del proyecto: ficha, producto, arquitectura, datos, API, historias, tickets y PRs
├── Prompts.md                   Los prompts usados en cada sección del Readme
├── AGENTS.md                    Instrucciones para agentes, con la Definition of Done (llega con el setup, DP-06)
├── CLAUDE.md                    Instrucciones para Claude Code (llega con el setup, DP-06)
├── .gitignore                   Lo que no entra al repo, como los archivos locales de variables (llega con el setup, DP-06)
├── .gitattributes               Finales de línea y tipos de archivo (llega con el setup, DP-06)
├── openspec/                    Specs y cambios de OpenSpec (llega con el setup, DP-06)
│
├── .claude/
│   └── hooks/                   Hook de pre-commit que bloquea credenciales y cuentas (DP-07)
│
├── .github/
│   └── workflows/               CI con GitHub Actions: ktlint, tests de la app, tests de la réplica, el control del OpenAPI y gitleaks (DP-11, DP-52)
│
├── replica/                     La réplica: un backend propio en NestJS, construido desde el contrato del contexto (0003, 0010)
│   ├── src/                     El código de la réplica, con sus módulos (componentes.md, sección 2) y su Dockerfile en la raíz de replica/
│   │   └── migrations/          Migraciones de TypeORM con las 13 tablas del inventario, cada una con cómo se deshace (DP-51)
│   ├── datos-iniciales/         SQL propio con los datos sintéticos: dos restaurantes, dos mozos en el primero y uno en el segundo (DP-16)
│   ├── firebase/                Script que crea las cuentas de prueba en el proyecto de Firebase de Tabbie
│   ├── toxiproxy/               Configuración de los proxies entre la app y la réplica
│   ├── entornos/                Perfiles de variables de entorno de la réplica: solo ejemplos, sin valores
│   └── tests/                   Pruebas de integración y de contrato de la réplica, y las comprobaciones de O1 a O4: TypeScript con Jest y Supertest (DP-14)
│
├── android/                     Proyecto Gradle de la app del mozo (0001, 0003)
│   ├── gradle/                  Wrapper de Gradle y catálogo de versiones
│   └── app/                     Único módulo: la app
│       └── src/
│           ├── main/…/<paquete base>/
│           │   ├── sesion/          Inicio de sesión, canje, renovación, control del rol y cierre de sesión
│           │   ├── salon/           Mesas activas, pedidos, "Órdenes", sus acciones y las marcas de "Atendido"
│           │   ├── cobros/          Solicitudes y cobros de cada mesa, "Pagos" y sus acciones
│           │   ├── impresora/       La impresora virtual
│           │   └── comun/           Lo que comparten las funcionalidades
│           │       ├── red/             Cliente HTTP y Monitor de conexión
│           │       ├── eventos/         La conexión única a /sse/waiters
│           │       └── almacenamiento/  DataStore cifrado de la sesión y DataStore de las marcas
│           ├── test/            Pruebas locales, con los mismos paquetes que main
│           └── androidTest/     Pruebas en el dispositivo, con los mismos paquetes que main
│
├── simulator/                   Simulador de comensales: CLI en TypeScript sobre Node 20 (0002, 0003)
│   └── src/                     Línea de comandos, sesión y cliente HTTP del comensal, escenarios, registro y medición
│
└── docs/                        La documentación del proyecto
    ├── prd/                     PRD del MVP
    ├── context/                 El panel de mozos actual y su trazabilidad hasta el código
    ├── backlog/                 Épicas, historias de usuario, criterios de aceptación, Definition of Done y tickets
    ├── adr/                     Decisiones de arquitectura
    ├── architecture/            Vista general, componentes, walking skeleton, estructura, infraestructura y seguridad
    ├── api/                     openapi.yaml, generado desde el código de la réplica con @nestjs/swagger, con los campos sensibles marcados (DP-52)
    └── design/                  Wireframes de baja fidelidad, enlazados desde los tickets de frontend (DP-10)
```

**Dónde corre cada contenedor** del diagrama de contenedores ([README.md](README.md), sección 2):

| Contenedor | Dónde está |
|---|---|
| Waiter App | `android/` |
| Réplica del backend | `replica/`: el código en `src/`, con las migraciones, y sus datos, cuentas de prueba, Toxiproxy, variables de entorno y pruebas |
| Simulador de comensales | `simulator/` |
| MySQL 8, Redis 7 y Toxiproxy | Servicios de `compose.yaml`. Toxiproxy, desde la ampliación (DP-41), toma su configuración de `replica/toxiproxy/`. Otro servicio, que corre una sola vez, carga el SQL de `replica/datos-iniciales/` (DP-16). |
| Firebase Authentication | Ninguna carpeta: es externo, el proyecto de Firebase de Tabbie (0002). Solo el script de `replica/firebase/` crea cuentas en él. |

Cómo se levantan juntos la réplica, sus servicios y el simulador lo detalla [infraestructura.md](infraestructura.md).

### Dónde va cada componente de la app

Los componentes de [componentes.md](componentes.md), sección 1, se reparten así:

| Paquete | Componentes |
|---|---|
| `sesion/` | Sesión; pantalla de inicio de sesión |
| `salon/` | Salón; Marcas de "Atendido"; pantalla "Órdenes"; las acciones de "Órdenes": mandar a cocina, cancelar pedidos y registrar un cobro manual |
| `cobros/` | Cobros; pantalla "Pagos"; las acciones de "Pagos": confirmar y eliminar una solicitud, y cerrar una mesa |
| `impresora/` | Pantalla de la impresora virtual, con los datos de Salón |
| `comun/red/` | Cliente HTTP, sin reintentos en las acciones que cambian datos (0007); Monitor de conexión |
| `comun/eventos/` | Eventos |
| `comun/almacenamiento/` | DataStore cifrado con una clave del Android Keystore, para la sesión; DataStore de las marcas (0005) |
| Raíz de `<paquete base>` | La aplicación de Hilt, la actividad y la navegación principal, que junta lo de todas las funcionalidades |

El componente Acciones de [componentes.md](componentes.md) queda repartido: cada acción vive en la funcionalidad de la pantalla desde la que se dispara, y aplica ahí la revisión previa, el bloqueo y la actualización posterior (0007). La regla de no reintentar es del Cliente HTTP, en `comun/red/`.

El nombre de `<paquete base>` se fija al crear el proyecto Gradle.

## 2. Patrones y por qué

### Monorepo

La app, la réplica, el simulador y la documentación están en un solo repositorio.

- **Por qué:** un cambio y su spec entran en el mismo commit. Una historia que cambia la app y el escenario del simulador que la prueba, o una decisión que cambia un ADR y el código que la aplica, se revisan y se integran juntos.
- **Qué implica:** dos lenguajes y dos cadenas de build en un mismo repositorio, Gradle en `android/` y Node 20 en `replica/` y `simulator/` (0003). Cada parte se construye desde su carpeta, sin depender de las otras: la app no comparte código con el simulador (0003), y ninguna de las dos con la réplica.

### Réplica propia desde el contrato

`replica/` es un backend propio en NestJS, construido desde el contrato y el comportamiento que documenta el contexto, no una copia del código de Tabbie ([0010](../adr/0010-replica-propia-desde-el-contrato.md), DP-48).

- **Por qué:** la app se prueba contra lo que usa del backend (las filas de la columna "Waiter App", los tres eventos de `/sse/waiters` y lo que el simulador necesita, DP-49), sin traer lo demás. El código de Tabbie no se lee: la fuente es el contexto, y lo que le falte se marca como hueco.
- **El contrato manda:** las rutas, los cuerpos y los eventos son los del contexto, y O1 a O4 se reproducen a propósito (DP-50). `docs/api/openapi.yaml` se genera desde `replica/src/` y la CI falla si difiere del commiteado (DP-52), así que un cambio del contrato se ve en el diff.
- **El esquema sale de las migraciones** de `replica/src/migrations/`, escritas desde [modelo-de-datos.md](modelo-de-datos.md), con `synchronize` desactivado (DP-51).
- **Sin endpoints de prueba:** lo que las pruebas necesitan de la réplica (datos iniciales, vencimientos cortos y fallos provocados) se resuelve con datos, variables de entorno, el simulador y Toxiproxy (0002, DP-48). Las variables que se ajustan (`JWT_EXPIRATION_WAITERS`, `REDIS_EXPIRATION_TIME`, `USE_FIREBASE` y `FIREBASE_*`) las lee la réplica al arrancar ([componentes.md](componentes.md), sección 2).
- **Secretos:** `replica/entornos/` tiene solo ejemplos de cada perfil, con los nombres de las variables y sin valores. Las credenciales del proyecto de Firebase de Tabbie son un secreto del entorno (0002) y no entran en el repositorio; el detalle va en [seguridad.md](seguridad.md).
- **Diferencias con el backend real:** la réplica no tiene que ser idéntica. Las diferencias que aparezcan al conectar la app con el backend real se ajustan entonces, en la réplica o en la app (0010).

### App por funcionalidad y por capas

`android/` es un proyecto Gradle con un único módulo, `app`. Sus paquetes se organizan primero por funcionalidad y, dentro de cada una, por las capas de 0003.

- **Por funcionalidad:** `sesion/`, `salon/`, `cobros/` e `impresora/` siguen las partes del turno del mozo, y las historias del backlog caen casi siempre en una sola: HU-01 y HU-09 en `sesion/`; HU-02 a HU-05, HU-10 y HU-12 en `salon/`; HU-06 a HU-08 y HU-13 en `cobros/`; HU-11 en `impresora/`. Un ticket de una historia toca sobre todo un paquete.
- **Por capas, dentro de cada funcionalidad:** MVVM con flujo de datos unidireccional (0003), en las capas de [componentes.md](componentes.md), sección 1:
  - **interfaz y ViewModel:** las pantallas en Jetpack Compose y el ViewModel de cada una, que tiene el estado de la pantalla en memoria (0005);
  - **repositorios:** las reglas de la operación y el estado compartido entre pantallas;
  - **clientes de red y almacenamiento:** no están en cada funcionalidad, sino en `comun/`.
- **Por qué `comun/`:** los clientes los usan todas las funcionalidades, y algunos tienen que ser únicos. La app mantiene una sola conexión al stream de eventos para los tres eventos (0006), así que Eventos no puede repetirse en Salón y en Cobros; el Cliente HTTP aplica en un solo lugar el JWT, la renovación ante un 401 y la regla de no reintentar (0004, 0007).
- **Dependencias permitidas:**
  - dentro de una funcionalidad, la interfaz depende del ViewModel y el ViewModel de los repositorios, nunca al revés;
  - una funcionalidad puede usar los repositorios de otra, pero no sus pantallas: `cobros/` e `impresora/` usan Salón, como en el diagrama de componentes;
  - `comun/` no depende de ninguna funcionalidad. Cuando necesita algo de una (el Cliente HTTP le pide la renovación a Sesión, 0004), lo pide por una interfaz que define `comun/` y que la funcionalidad implementa, conectadas con Hilt (0003).

## 3. Qué carpeta toca cada tipo de ticket

El backend de Tabbie no se modifica (0002; PRD, sección 9). La réplica es código propio en `replica/` (0010): los tickets de backend la construyen, endpoint por endpoint, sin cambiar el contrato del contexto si el ticket no lo dice (DP-49, DP-53). Todos los tickets, de cualquier tipo, actualizan en el mismo commit la documentación que cambia en `docs/`.

| Tipo | Carpetas que toca | Qué hace | Ejemplos | Qué no toca |
|---|---|---|---|---|
| **Frontend** | `android/`: el paquete de la funcionalidad de la historia y, si hace falta, `comun/` o la navegación principal | Pantallas, ViewModels y repositorios de la app, con sus pruebas en `test/` y `androidTest/` | HU-07 en `cobros/`; el aviso sin conexión del walking skeleton en `comun/red/` y la navegación principal | `replica/`, `simulator/` |
| **Backend** | `replica/src/` (con las migraciones), `replica/entornos/`, `replica/toxiproxy/` y `replica/tests/`, `compose.yaml`, `simulator/` y `docs/api/openapi.yaml`, generado | Los endpoints y eventos de la réplica con sus migraciones, cómo corre en las pruebas (variables de entorno, servicios, proxies), sus pruebas de integración y de contrato, y los escenarios del simulador que generan lo que el comensal hace | Un endpoint del reparto de DP-53, como T13 en TK-13; un escenario nuevo del simulador, como ESC-6 para RF-25; un vencimiento corto de las solicitudes de cobro para HU-06 | `android/`; una ruta, un cuerpo o un evento distinto del contexto, salvo que el ticket lo diga (DP-49) |
| **Base de datos** | `replica/datos-iniciales/`, `replica/firebase/` y, si cambia un servicio, `compose.yaml` | Datos iniciales sintéticos y su configuración: restaurantes, mesas, mozos y sus cuentas de prueba en Firebase, que tienen que coincidir con las filas `user` de los datos | Los dos restaurantes con dos mozos en el primero (0002); una mesa con pedidos ya cobrados para HU-04 | El esquema: las migraciones son de los tickets de Backend (DP-51) |

**Datos iniciales:** son SQL propio en `replica/datos-iniciales/`, no en `replica/src/`. Los carga un servicio de `compose.yaml` que corre una sola vez, espera a que terminen las migraciones de la réplica y ejecuta el SQL. La réplica no tiene seeder ([componentes.md](componentes.md#decisiones-tomadas-2026-11-14), DP-16, DP-51).
