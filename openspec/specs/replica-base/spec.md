# replica-base Specification

## Purpose

La réplica del backend arranca desde cero en el entorno local con `compose.yaml`, crea su esquema con migraciones propias y se versiona sin ningún secreto. Es la base sobre la que se prueban la app y los demás endpoints (0010, DP-48, DP-51).

## Requirements

### Requirement: SEG-c10 · Los secretos no están en el repo

La réplica SHALL leer sus secretos (`JWT_SECRET`, las variables `FIREBASE_*`, `DB_PASSWORD` y `REDIS_PASSWORD`) solo de variables de entorno, y el repo MUST traer solo los archivos de ejemplo de `replica/entornos/`, con los nombres de las variables y sin valores de secretos.

Criterio heredado, copiado tal cual de [seguridad.md](../../../docs/architecture/seguridad.md#43-criterios-nuevos) (DP-08):

> **SEG-c10 · Los secretos no están en el repo** (0002; PR-1)
>
> - **Dado** el repo con todo su historial, en todas sus ramas
> - **Cuando** se lo revisa con un detector de secretos y se buscan los valores de `JWT_SECRET`, de las variables `FIREBASE_*` y de las contraseñas de MySQL y Redis de cada entorno
> - **Entonces** no aparece ningún valor de esos secretos
> - **Y** sus nombres aparecen solo en el archivo de ejemplo, sin valores

#### Scenario: SEG-c10 · Los secretos no están en el repo

- **GIVEN** el repo con todo su historial, en todas sus ramas (`git log --all`, después de traer las ramas de `origin`)
- **WHEN** se lo revisa con gitleaks, con la versión fijada en el diseño, sobre todo el historial y todas las ramas
- **AND** se buscan en ese historial los valores de `JWT_SECRET`, de las variables `FIREBASE_*`, de `DB_PASSWORD` y de `REDIS_PASSWORD` del archivo local de variables, con un script que imprime solo el nombre de la variable y nunca el valor
- **THEN** gitleaks no informa ningún hallazgo y la búsqueda de valores no encuentra ninguno
- **AND** en los archivos de variables que versiona el repo (`replica/entornos/*.env.example`) esas variables aparecen con el nombre y sin valor
- **AND** el repo no versiona ningún otro archivo de variables de entorno (lectura de "solo en el archivo de ejemplo", DP-62)
- **AND** (control positivo) gitleaks, con la misma configuración, sí detecta un secreto de mentira en un repo temporal que crea la prueba y borra al terminar

### Requirement: WS-c1 · La réplica arranca desde cero y atiende la base (en parte)

La réplica SHALL arrancar desde cero con `compose.yaml` y el archivo local de variables, siguiendo solo `infraestructura.md`; MUST correr sus migraciones al arrancar, con `synchronize` desactivado, hasta dejar las 13 tablas del inventario (contexto, 3.2); y MUST atender T01, T05 y el stream de `/sse/waiters`.

Criterio heredado, copiado tal cual de [walking-skeleton.md](../../../docs/architecture/walking-skeleton.md#51-criterios-del-skeleton) (DP-08). **En parte:** este cambio prueba solo que la réplica arranca desde cero con `compose.yaml`, corre sus migraciones y atiende T01, T05 y el stream de `/sse/waiters` (ticket TK-01). El criterio completo, con la app, es de TK-05.

> **WS-c1 · La app arranca contra la réplica** (0002, 0004, 0006; HU-01 y HU-02, lo mínimo)
>
> - **Dado** que la réplica corre con sus datos iniciales, y el restaurante 1 tiene dos mesas ocupadas
> - **Cuando** la app arranca e inicia sesión con la cuenta de prueba del primer mozo del restaurante 1
> - **Entonces** la app muestra en su lista sin diseño las dos mesas que devuelve la réplica para el restaurante 1
> - **Y** el registro anota la conexión de eventos abierta y la primera consulta de mesas, solicitudes y cobros

#### Scenario: WS-c1 · La réplica arranca desde cero, corre sus migraciones y atiende T01, T05 y el stream (en parte)

- **GIVEN** que no hay volúmenes de MySQL ni de Redis (`docker compose down -v`) y el archivo local de variables del perfil de pruebas, con `USE_FIREBASE` desactivada y un `JWT_SECRET` de prueba
- **WHEN** se levanta `compose.yaml` con los pasos de `infraestructura.md`, sección 2.1
- **THEN** la réplica queda escuchando, conectada a MySQL y a Redis, sin credenciales de Firebase
- **AND** la tabla de migraciones de TypeORM registra cada migración de `replica/src/migrations/` como ejecutada
- **AND** la base tiene exactamente las 13 tablas del inventario más la tabla de migraciones, con las columnas de `modelo-de-datos.md`
- **AND** `POST /auth/login`, `GET /restaurants/:id/tables/active` y `GET /sse/waiters` existen: ninguno responde 404
