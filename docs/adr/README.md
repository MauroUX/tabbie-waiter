# Decisiones de arquitectura: Tabbie Waiter App

> Registro de las decisiones de arquitectura (ADR) de la Tabbie Waiter App. La base es el [PRD](../prd/tabbie-waiter-mvp.md), el [documento de contexto](../context/panel-mozos-actual.md) y el [backlog](../backlog/README.md).

## Formato

- **Archivo:** uno por decisión, `NNNN-<titulo-corto>.md`, numerado en orden.
- **Secciones:** formato de Michael Nygard, con exactamente cinco secciones:
  - **Título:** `# NNNN · <título>`.
  - **Contexto:** la situación y las fuerzas en juego.
  - **Decisión:** lo que se decide.
  - **Estado:** Propuesto, Aceptado, Aceptado; en parte reemplazado por NNNN, o Reemplazado por NNNN.
  - **Consecuencias:** lo que resulta de aplicar la decisión, lo bueno y lo malo.
- **Cambios:** un ADR aceptado no se reescribe. Si la decisión cambia, un ADR nuevo lo reemplaza, y el anterior pasa a "Reemplazado por NNNN". Si el ADR nuevo reemplaza solo una parte, el anterior pasa a "Aceptado; en parte reemplazado por NNNN", y el nuevo dice qué parte reemplaza.
- **Referencias:**
  - Cada ADR cita por su ID los requisitos y métricas del PRD (RF-n, RNF-n, M-n), las capacidades, filas y observaciones del contexto (Cn, Tnn, On) y las historias del backlog (HU-nn).
  - "PRD", "contexto" y "backlog" remiten a los tres documentos de arriba. Un número de cuatro cifras remite a otro ADR.

## Índice

| Número | Título | Estado |
|---|---|---|
| [0001](0001-app-nativa-android.md) | App nativa Android para tablet | Aceptado |
| [0002](0002-replica-del-backend.md) | Réplica del backend: copia sin cambios y simulador de comensales | Aceptado; en parte reemplazado por 0009 y 0010 |
| [0003](0003-stack.md) | Stack | Aceptado |
| [0004](0004-autenticacion-y-renovacion.md) | Autenticación y renovación de la sesión | Aceptado; en parte reemplazado por 0008 |
| [0005](0005-estado-sin-base-local.md) | Estado de la app sin base de datos local | Aceptado |
| [0006](0006-tiempo-real.md) | Tiempo real: eventos más consulta periódica | Aceptado; en parte reemplazado por 0008 |
| [0007](0007-acciones-que-cambian-datos.md) | Acciones que cambian datos | Aceptado |
| [0008](0008-jwt-del-stream-en-el-encabezado.md) | JWT del stream en el encabezado | Aceptado |
| [0009](0009-publicacion-del-repo-y-credenciales.md) | Publicación del repo y credenciales de prueba | Aceptado |
| [0010](0010-replica-propia-desde-el-contrato.md) | Réplica propia desde el contrato | Aceptado |

## Decisiones tomadas (2026-11-14)

Fuente de cada una: decisión del humano después de la revisión de la Entrega 1.

- **Resueltas antes:** qué se registra en los logs se resolvió en PA-6 ([sección 2.1](../architecture/seguridad.md#21-de-la-app)) de [seguridad.md](../architecture/seguridad.md).
- **DP-01 · Publicación del repo:** el repo sigue público hasta la entrega final (diciembre de 2026); el dueño de Tabbie autoriza publicar O1 a O4 y copiar su código en `backend/`, sin ninguna credencial ni cuenta en el repo ([0009](0009-publicacion-del-repo-y-credenciales.md)). Desde DP-48 no se copia código de Tabbie ([0010](0010-replica-propia-desde-el-contrato.md)).
- **DP-02 · Proyecto de Firebase de Tabbie:** es de desarrollo, lo confirmó su dueño el 2026-11-14; la réplica y las cuentas de prueba lo siguen usando, como dice 0002 ([0009](0009-publicacion-del-repo-y-credenciales.md)).
- **DP-35 · Credenciales de las cuentas de prueba:** no se publican; se entregan con el formulario de entrega, y el `Readme.md` lo dice en lugar de listarlas ([0009](0009-publicacion-del-repo-y-credenciales.md)).
- **DP-25 · Intervalos de consulta (0006):** el sondeo del Monitor de conexión corre cada 5 s con las mesas activas (T05) y hace también de consulta periódica de las mesas; las solicitudes (T06) y los cobros (T07) se consultan cada 15 s y siempre al reconectar.
- **DP-28 · JWT en el encabezado del stream (0004, 0006):** el stream recibe el JWT en `Authorization: Bearer`, porque `jwt.strategy.ts` lo lee antes que el query param; TK-05 lo comprueba contra la réplica, y RA-6 de `seguridad.md` se cierra entonces ([0008](0008-jwt-del-stream-en-el-encabezado.md)).
- **DP-34 · Limpieza de las marcas de "Atendido" (0005):** en cada actualización de las mesas, se borran las marcas de las sesiones de mesa que ya no están activas.

## Decisiones tomadas (2026-11-17)

Fuente: decisión del humano en la revisión de la réplica. El detalle está en [0010](0010-replica-propia-desde-el-contrato.md) y en el [índice de tickets](../backlog/tickets/README.md#decisiones-tomadas-2026-11-17).

- **DP-48 a DP-53 · Réplica propia desde el contrato:** la réplica deja de ser una copia de `c18b0f7` y pasa a ser un proyecto NestJS propio en `replica/`, construido desde el contexto, con O1 a O4 reproducidos a propósito, migraciones propias, el OpenAPI generado desde el código y un reparto de endpoints entre TK-01, TK-03, TK-08 y TK-13. Reemplaza en parte a 0002 ([0010](0010-replica-propia-desde-el-contrato.md)).
