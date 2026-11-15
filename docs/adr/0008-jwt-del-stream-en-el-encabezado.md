# 0008 · JWT del stream en el encabezado

## Contexto

- 0004 y 0006 ponen el JWT del mozo en la URL del stream de eventos (`/sse/waiters?token=<jwt>`), como lo hace el panel actual (contexto, sección 5).
- Con el JWT en la URL, el token puede quedar en registros de acceso de servidores o proxies intermedios, o en registros de la app. Quien la lea tiene un JWT de mozo válido hasta su vencimiento, 16 h por defecto (RA-6 de [seguridad.md](../architecture/seguridad.md)).
- El backend también toma el JWT del encabezado `Authorization` (contexto, sección 0). En la copia, `src/guards/auth/jwt.strategy.ts` lo extrae con `ExtractJwt.fromExtractors`, primero del encabezado `Authorization: Bearer` y después del query param `token`.
- El stream (`src/sse/sse-controller.ts`) usa el mismo `JwtAuthGuard` que las demás rutas, así que el mismo orden vale para él.
- El backend no se modifica (0002).

## Decisión

- La app abre el stream de eventos con el JWT en el encabezado `Authorization: Bearer <jwt>`, igual que las demás llamadas, y no lo pone en la URL.
- Reemplaza la parte de 0004 y 0006 que pone el JWT en la URL del stream. El resto de 0004 y 0006 sigue igual: el stream se reabre con el JWT vigente al renovar y después de cada corte.
- [TK-05](../backlog/tickets/TK-05-eventos-y-consulta-periodica.md) lo comprueba contra la réplica: el stream abre con el JWT en el encabezado y responde 401 con un JWT vencido en el encabezado.
- RA-6 de [seguridad.md](../architecture/seguridad.md) se cierra cuando TK-05 lo comprueba.

## Estado

Aceptado.

## Consecuencias

- La URL del stream ya no lleva el JWT, así que no hay token en los registros de acceso por la URL.
- El cliente de eventos tiene que mandar encabezados, como el resto de las llamadas de la app.
- Si TK-05 encuentra que la réplica no acepta el JWT en el encabezado del stream, un ADR nuevo reemplaza a este y RA-6 sigue abierto.
- Fuente: decisión del humano después de la revisión de la Entrega 1 (DP-28).
