## Purpose

La base de la app del mozo: arranca contra la réplica en una de sus tres variantes, inicia sesión con la cuenta de prueba del mozo (Firebase y canje en T01), consulta las mesas activas de su restaurante (T05) con un solo cliente HTTP sin reintentos, habla solo por HTTPS fuera de la réplica local y anota cada cambio de su estado en un registro de diagnóstico sin datos sensibles.

## ADDED Requirements

### Requirement: SEG-c7 · Solo HTTPS fuera de la réplica local

Las variantes de demo y Tabbie SHALL hablar con el backend solo por HTTPS: el sistema MUST bloquear el tráfico sin cifrar hacia cualquier host. La variante de réplica local SHALL permitir HTTP sin cifrar solo hacia la máquina de desarrollo, y MUST bloquearlo hacia cualquier otro host. Un intento bloqueado SHALL terminar, para el mozo, en el estado de que no hay conexión, sin reintentos (PA-7, DP-27).

Criterio heredado, copiado tal cual de [seguridad.md](../../../../../docs/architecture/seguridad.md#43-criterios-nuevos) (DP-08).

> **SEG-c7 · Solo HTTPS fuera de la réplica local** (0003; PA-7, RA-6)
>
> - **Dado** una compilación de la variante de demo con una URL base `http://` que apunta a la réplica local
> - **Cuando** el mozo intenta iniciar sesión con una cuenta de prueba
> - **Entonces** la app no llega a la réplica: el sistema bloquea el tráfico sin cifrar, y la app muestra que no hay conexión
> - **Y** con la variante de réplica local, una URL base `http://` que apunta a un host que no es la máquina de desarrollo también se bloquea

#### Scenario: SEG-c7 · La variante de demo con una URL `http://` no llega a la réplica, y la local bloquea HTTP hacia otro host

- **GIVEN** una compilación de la variante de demo con la URL base `http://10.0.2.2:<puerto de la réplica>/`, que apunta a la réplica local, instalada en el emulador
- **WHEN** el mozo intenta iniciar sesión con la cuenta de prueba del primer mozo del restaurante 1
- **THEN** la app no llega a la réplica: el canje de T01 falla antes de abrir la conexión, porque el sistema bloquea el tráfico sin cifrar hacia ese host
- **AND** la app muestra que no hay conexión
- **AND** el registro de diagnóstico anota el inicio de sesión fallido por el tráfico sin cifrar bloqueado
- **AND**, con una compilación de la variante de réplica local, una petición del cliente HTTP de la app a una URL `http://` de un host que no es la máquina de desarrollo se bloquea antes de abrir la conexión, mientras que la misma petición hacia la máquina de desarrollo no se bloquea
- Se prueba en el dispositivo (emulador). La parte de la demo necesita la configuración local de Firebase y la cuenta de prueba, así que no corre en la CI (DP-43); su evidencia va en el PR.

### Requirement: WS-c1 · La app arranca contra la réplica (en parte)

La app SHALL iniciar sesión con email y contraseña en Firebase (T19) y canjear el ID token por el JWT de la réplica en T01, sin `Authorization` en el canje. SHALL guardar en memoria el JWT, su vencimiento, el `restaurantId` y el rol, y SHALL usar ese `restaurantId` en la consulta de T05, con `Authorization: Bearer <JWT>` (PA-2). SHALL mostrar las mesas activas que devuelve T05 en una lista sin diseño, sin pasar a la pantalla los emails ni las credenciales de cobro que trae la respuesta (O4). El registro de diagnóstico SHALL anotar la sesión iniciada y la primera consulta de mesas, con la hora, qué cambió y de dónde vino, y MUST NOT anotar nada de lo que excluye PA-6.

Criterio heredado, copiado tal cual de [walking-skeleton.md](../../../../../docs/architecture/walking-skeleton.md#51-criterios-del-skeleton) (DP-08). **En parte:** este cambio prueba el inicio de sesión, la lista sin diseño con las mesas de T05 y la primera consulta de mesas en el registro (ticket TK-04). La conexión de eventos y la primera consulta de solicitudes y cobros son de TK-05, que completa el criterio.

> **WS-c1 · La app arranca contra la réplica** (0002, 0004, 0006; HU-01 y HU-02, lo mínimo)
>
> - **Dado** que la réplica corre con sus datos iniciales, y el restaurante 1 tiene dos mesas ocupadas
> - **Cuando** la app arranca e inicia sesión con la cuenta de prueba del primer mozo del restaurante 1
> - **Entonces** la app muestra en su lista sin diseño las dos mesas que devuelve la réplica para el restaurante 1
> - **Y** el registro anota la conexión de eventos abierta y la primera consulta de mesas, solicitudes y cobros

#### Scenario: WS-c1 · El primer mozo del restaurante 1 inicia sesión y ve las dos mesas que ocupó ESC-1 (en parte)

- **GIVEN** que la réplica corre con sus datos iniciales y con Firebase activado (perfil `local.env`), recién cargada, y el simulador ocupó las mesas 1 y 2 del restaurante 1 con ESC-1
- **AND** una compilación de la variante de réplica local instalada en el emulador
- **WHEN** la app arranca e inicia sesión con la cuenta de prueba del primer mozo del restaurante 1
- **THEN** la app muestra en su lista sin diseño exactamente las dos mesas que devuelve la réplica para el restaurante 1, la 1 y la 2
- **AND** el registro de diagnóstico anota la sesión iniciada y la primera consulta de mesas, con la hora, el origen (la consulta) y la cantidad de mesas (2)
- **AND** el Logcat del proceso de la app no contiene la contraseña ni el texto `token=`
- **AND** el email del mozo no aparece en el registro de diagnóstico ni en lo que escribe la app en Logcat. Las líneas del SDK de Firebase (etiquetas que empiezan por `Firebase`) quedan fuera de esta comprobación: el SDK escribe el email al iniciar sesión y la app no lo controla (DP-96)
- Se prueba en el dispositivo (emulador), contra la réplica local. Necesita Firebase, así que no corre en la CI (DP-43); su evidencia, con la captura a 1280×800, va en el PR.
