# Decisiones de arquitectura: Tabbie Waiter App

> Registro de las decisiones de arquitectura (ADR) de la Tabbie Waiter App. La base es el [PRD](../prd/tabbie-waiter-mvp.md), el [documento de contexto](../context/panel-mozos-actual.md) y el [backlog](../backlog/README.md).

## Formato

- **Archivo:** uno por decisión, `NNNN-<titulo-corto>.md`, numerado en orden.
- **Secciones:** formato de Michael Nygard, con exactamente cinco secciones:
  - **Título:** `# NNNN · <título>`.
  - **Contexto:** la situación y las fuerzas en juego.
  - **Decisión:** lo que se decide.
  - **Estado:** Propuesto, Aceptado o Reemplazado por NNNN.
  - **Consecuencias:** lo que resulta de aplicar la decisión, lo bueno y lo malo.
- **Cambios:** un ADR aceptado no se reescribe. Si la decisión cambia, un ADR nuevo lo reemplaza, y el anterior pasa a "Reemplazado por NNNN".
- **Referencias:**
  - Cada ADR cita por su ID los requisitos y métricas del PRD (RF-n, RNF-n, M-n), las capacidades, filas y observaciones del contexto (Cn, Tnn, On) y las historias del backlog (HU-nn).
  - "PRD", "contexto" y "backlog" remiten a los tres documentos de arriba. Un número de cuatro cifras remite a otro ADR.

## Índice

| Número | Título | Estado |
|---|---|---|
| [0001](0001-app-nativa-android.md) | App nativa Android para tablet | Aceptado |
| [0002](0002-replica-del-backend.md) | Réplica del backend: copia sin cambios y simulador de comensales | Aceptado |
| [0003](0003-stack.md) | Stack | Aceptado |
| [0004](0004-autenticacion-y-renovacion.md) | Autenticación y renovación de la sesión | Aceptado |
| [0005](0005-estado-sin-base-local.md) | Estado de la app sin base de datos local | Aceptado |
| [0006](0006-tiempo-real.md) | Tiempo real: eventos más consulta periódica | Aceptado |
| [0007](0007-acciones-que-cambian-datos.md) | Acciones que cambian datos | Aceptado |

## Decisiones pendientes

- **Resueltas:** las cuentas de prueba publicadas y qué se registra en los logs se resolvieron en [seguridad.md](../architecture/seguridad.md): las cuentas, en [RA-7](../architecture/seguridad.md#ra-7--las-cuentas-de-prueba-existen-en-el-proyecto-de-firebase-de-tabbie); los logs, en [PA-6](../architecture/seguridad.md#pa-6--no-escribe-datos-sensibles-en-los-registros).
- **Limpieza de las marcas de "Atendido" (0005):** las marcas de sesiones de mesa ya cerradas no se vuelven a usar, y nada las borra.
- **Intervalos de consulta (0006):** 0006 fija los límites (menos de 30 s para la consulta periódica y 5 s o menos para el sondeo), pero no los valores ni qué consulta usa el sondeo.
- **JWT en el encabezado del stream (0004, 0006):** el backend también toma el JWT del encabezado `Authorization` (contexto, sección 0). Falta comprobar contra la réplica si el stream de eventos lo acepta ahí. Si funciona, un ADR nuevo reemplaza esa parte de 0004 y 0006, y RA-6 de `seguridad.md` se cierra.
