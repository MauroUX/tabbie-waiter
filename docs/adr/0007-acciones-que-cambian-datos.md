# 0007 · Acciones que cambian datos

## Contexto

- Las acciones del mozo que cambian datos son: mandar a cocina (T08), cancelar pedidos (T09), registrar un cobro manual (T11), confirmar una solicitud de cobro (T12), eliminarla (T13) y cerrar una mesa (T14).
- El panel actual repite una vez toda acción que falla. En `/pay` y `/add-payment`, que no son idempotentes, eso puede registrar un cobro dos veces (contexto, sección 1; PRD, sección 1).
- Una acción que cambia datos nunca se repite sola (RNF-6), y no puede haber cobros duplicados, incluso con cortes provocados durante los cobros (M-2).
- OkHttp (0003) trae activado por defecto `retryOnConnectionFailure`: ante algunos errores de conexión reenvía la petición por su cuenta, aunque sea un `POST`.
- El backend no controla lo que hacen dos tablets casi al mismo tiempo: confirmar una solicitud no revisa que siga existiendo, y el cobro manual solo se controla contra el total de la mesa, no contra el saldo (backlog, "Riesgos aceptados").
- El backlog fija que, antes de actuar, la app actualiza el estado que la acción necesita (backlog, "Riesgos aceptados").

## Decisión

- **Sin reintentos:** el cliente HTTP de las acciones que cambian datos no reintenta. No lo hace la app, y tampoco OkHttp, que se usa con `retryOnConnectionFailure` desactivado (RNF-6).
- **Revisión previa:** antes de cada acción, la app actualiza el estado que la acción necesita: la solicitud, el saldo, los cobros del pedido o la mesa. Si la acción ya no corresponde, avisa y no actúa.
- **Bloqueo:** mientras una acción está en curso, no se puede repetir (RF-29 lo pide para el cierre de mesa).
- **Actualización posterior:**
  - al terminar, la app actualiza las mesas y las solicitudes (RNF-3);
  - si la acción falla o no responde, las actualiza antes de dejar intentarla de nuevo (RNF-6);
  - un 401 sigue la regla de 0004: no se repite.

## Estado

Aceptado.

## Consecuencias

- Si una acción no responde, la app no sabe si se registró. El mozo decide si repetirla después de ver el estado actualizado.
- Sin los reintentos de OkHttp, un fallo de conexión que antes se resolvía en silencio llega al mozo como error.
- Las consultas y las acciones tienen reglas de reintento distintas (0004).
- M-2 se prueba cortando la conexión con Toxiproxy durante los cobros (0003).
- **Riesgo aceptado:** entre la revisión previa y la acción queda un margen.
  - Si otra tablet actúa en ese margen, el resultado puede ser un cobro duplicado, un cobro manual que supera el saldo, un pedido cancelado que acaba de recibir un cobro o una mesa que se cierra dos veces (HU-04.h7, HU-05.h1, HU-05.h8, HU-07.h2, HU-08.h4).
  - Se acepta porque el backend no se modifica e inicialmente hay una sola tablet por restaurante (PRD, sección 9).
