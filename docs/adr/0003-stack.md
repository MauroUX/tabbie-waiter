# 0003 · Stack

## Contexto

- El proyecto tiene tres piezas: la app del mozo (0001), la réplica del backend y el simulador de comensales (0002).
- La réplica es una copia sin cambios del backend de Tabbie, así que su stack ya viene dado (0002).
- La app tiene que:
  - iniciar sesión en Firebase y canjear el ID token por el JWT del backend (C1, T01, T19);
  - consultar el backend por HTTP (T05 a T07) y ejecutar las acciones del mozo (T08, T09, T11 a T14);
  - recibir los eventos de `/sse/waiters` (T16, T17);
  - guardar en la tablet solo la sesión y las marcas de "Atendido" (RNF-8).
- Las pruebas necesitan provocar cortes de conexión y fallos entre la app y la réplica (RNF-4, M-2; backlog, "Requisitos de prueba").

## Decisión

**Réplica:** lo que trae la copia: NestJS 10, TypeORM, MySQL 8, Redis 7 y Node 20. No es una elección: viene con la copia.

**App:**

- Kotlin y Jetpack Compose (0001).
- MVVM con flujo de datos unidireccional.
- Hilt.
- Retrofit y OkHttp para HTTP.
- OkHttp SSE para los eventos.
- Firebase Authentication.
- DataStore.

**Simulador:** TypeScript sobre Node 20, un cliente HTTP por línea de comandos. Motivo: es el mismo lenguaje que la réplica, y no comparte código con la app.

**Pruebas de red:** Toxiproxy, un proxy TCP que se controla por API, entre la app y la réplica.

## Estado

Aceptado.

## Consecuencias

- El proyecto usa dos lenguajes: Kotlin en la app y TypeScript en la réplica y el simulador.
- El entorno de prueba necesita Node 20, MySQL 8, Redis 7 y Toxiproxy, además del SDK de Android.
- En local, la URL base de la app apunta siempre a Toxiproxy y no a la réplica (contexto, sección 1: una única URL base por ambiente, para HTTP y SSE). Sin fallos activos, Toxiproxy reenvía el tráfico sin tocarlo.
  - Los cortes y las demoras se provocan desde la API de Toxiproxy, sin tocar la app ni la réplica.
  - El tráfico con Firebase no pasa por Toxiproxy.
- El estado de cada pantalla vive en su ViewModel, en memoria (0005).
- OkHttp se usa sin sus reintentos automáticos en las acciones que cambian datos (0007).
