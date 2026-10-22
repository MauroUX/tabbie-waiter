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
├── compose.yaml                 Servicios del entorno de prueba: MySQL 8, Redis 7 y Toxiproxy
├── Readme.md                    Entrega del proyecto: ficha, producto, arquitectura, datos, API, historias, tickets y PRs
├── Prompts.md                   Los prompts usados en cada sección del Readme
├── AGENTS.md                    Instrucciones para agentes (llega al configurar el proyecto)
├── CLAUDE.md                    Instrucciones para Claude Code (llega al configurar el proyecto)
├── openspec/                    Specs y cambios de OpenSpec (llega al configurar el proyecto)
│
├── backend/                     Copia sin cambios de order-pay-backend, rama main, commit c18b0f7 (0002)
│   ├── UPSTREAM.md              De qué repositorio y commit sale la copia, y cómo se compara el contrato
│   └── …                        El código y la configuración de build, tal como están en ese commit
│
├── replica/                     Lo propio de la réplica, fuera de la copia (0002, 0003)
│   ├── datos-iniciales/         Datos sintéticos: dos restaurantes, dos mozos en el primero y uno en el segundo
│   ├── firebase/                Script que crea las cuentas de prueba en el proyecto de Firebase de Tabbie
│   ├── toxiproxy/               Configuración de los proxies entre la app y la réplica
│   └── entornos/                Perfiles de variables de entorno de la réplica: solo ejemplos, sin valores
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
    ├── backlog/                 Épicas, historias de usuario y criterios de aceptación
    ├── adr/                     Decisiones de arquitectura
    ├── architecture/            Vista general, componentes, walking skeleton, estructura, infraestructura y seguridad
    └── api/                     Especificación de los endpoints y eventos que usa la app
```

**Dónde corre cada contenedor** del diagrama de contenedores ([README.md](README.md), sección 2):

| Contenedor | Dónde está |
|---|---|
| Waiter App | `android/` |
| Réplica del backend | `backend/` (el código, sin cambios) y `replica/` (sus datos, cuentas de prueba, Toxiproxy y variables de entorno) |
| Simulador de comensales | `simulator/` |
| MySQL 8, Redis 7 y Toxiproxy | Servicios de `compose.yaml`. Toxiproxy toma su configuración de `replica/toxiproxy/`. |
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
- **Qué implica:** dos lenguajes y dos cadenas de build en un mismo repositorio, Gradle en `android/` y Node 20 en `backend/` y `simulator/` (0003). Cada parte se construye desde su carpeta, sin depender de las otras: la app no comparte código con el simulador (0003), y ninguna de las dos con la réplica.

### Copia aislada del backend

`backend/` es una copia sin cambios de `order-pay-backend`, rama `main`, commit `c18b0f7` (0002), separada de todo lo propio.

- **Por qué:** la réplica tiene que ser idéntica al backend real para que la app pase a él cambiando solo la URL base (0002). Si nada propio entra en `backend/`, que la copia sigue sin cambios se comprueba con un `diff` contra el commit original, que da vacío. La única excepción es `UPSTREAM.md`, la ficha de la copia, que no está en el original y queda fuera de esa comparación.
- **Lo propio va en `replica/`:** lo que las pruebas necesitan de la réplica (datos iniciales, vencimientos cortos y fallos provocados) se resuelve fuera de su código, con datos, variables de entorno, el simulador y Toxiproxy (0002). Las variables que se ajustan (`JWT_EXPIRATION_WAITERS`, `REDIS_EXPIRATION_TIME`, `USE_FIREBASE` y `FIREBASE_*`) ya las lee la copia ([componentes.md](componentes.md), sección 2).
- **Secretos:** `replica/entornos/` tiene solo ejemplos de cada perfil, con los nombres de las variables y sin valores. Las credenciales del proyecto de Firebase de Tabbie son un secreto del entorno (0002) y no entran en el repositorio; el detalle va en [seguridad.md](seguridad.md).
- **Actualizar la copia:** si la predicción del límite de 0002 detecta que el contrato cambió, `backend/` se reemplaza entero por el commit nuevo, se actualiza `UPSTREAM.md` y un ADR nuevo reemplaza a 0002. Nunca se edita a mano un archivo de la copia.

### App por funcionalidad y por capas

`android/` es un proyecto Gradle con un único módulo, `app`. Sus paquetes se organizan primero por funcionalidad y, dentro de cada una, por las capas de 0003.

- **Por funcionalidad:** `sesion/`, `salon/`, `cobros/` e `impresora/` siguen las partes del turno del mozo, y las historias del backlog caen casi siempre en una sola: HU-01 y HU-09 en `sesion/`; HU-02 a HU-05 y HU-10 en `salon/`; HU-06 a HU-08 en `cobros/`; HU-11 en `impresora/`. Un ticket de una historia toca sobre todo un paquete.
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

El backend de Tabbie no se modifica (0002; PRD, sección 9), así que los tickets de backend y de base de datos no cambian su código: trabajan en lo que rodea a la copia. Todos los tickets, de cualquier tipo, actualizan en el mismo commit la documentación que cambia en `docs/`.

| Tipo | Carpetas que toca | Qué hace | Ejemplos | Qué no toca |
|---|---|---|---|---|
| **Frontend** | `android/`: el paquete de la funcionalidad de la historia y, si hace falta, `comun/` o la navegación principal | Pantallas, ViewModels y repositorios de la app, con sus pruebas en `test/` y `androidTest/` | HU-07 en `cobros/`; el aviso sin conexión del walking skeleton en `comun/red/` y la navegación principal | `backend/`, `replica/`, `simulator/` |
| **Backend** | `replica/entornos/` y `replica/toxiproxy/`, `compose.yaml` y `simulator/` | Cómo corre la réplica en las pruebas (variables de entorno, servicios, proxies) y los escenarios del simulador que generan lo que el comensal hace | Un escenario nuevo del simulador, como ESC-6 para RF-25; un vencimiento corto de las solicitudes de cobro para HU-06 | `backend/`, salvo para reemplazar la copia por un commit nuevo con un ADR que reemplace a 0002 |
| **Base de datos** | `replica/datos-iniciales/`, `replica/firebase/` y, si cambia un servicio, `compose.yaml` | Datos iniciales sintéticos y su configuración: restaurantes, mesas, mozos y sus cuentas de prueba en Firebase, que tienen que coincidir con las filas `user` de los datos | Los dos restaurantes con dos mozos en el primero (0002); una mesa con pedidos ya cobrados para HU-04 | El esquema: no hay migraciones, porque el esquema viene con la copia y no se modifica |

**Datos iniciales:** cómo se cargan, con el seeder que trae la copia o por fuera, sigue pendiente ([componentes.md](componentes.md), "Decisiones pendientes"). En cualquier caso, los datos viven en `replica/datos-iniciales/` y no en `backend/`: si el seeder de la copia no puede leerlos sin cambiar su código, se cargan por fuera.
