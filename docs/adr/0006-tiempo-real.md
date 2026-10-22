# 0006 · Tiempo real: eventos más consulta periódica

## Contexto

- Por `/sse/waiters` el backend emite solo tres eventos: `order-confirmed-notification`, `in-person-payment-request` e `in-person-payment-request-deleted` (T16, T17; contexto, sección 3.1).
- Los emite desde la memoria de su única instancia, sin heartbeat ni replay: lo que se emite durante un corte se pierde. Un reinicio o un despliegue cierra todas las conexiones (contexto, sección 5).
- Los demás cambios no emiten eventos en ese stream: crear, editar o cancelar pedidos, mandar a cocina, los cobros, el cierre de mesa, los pedidos de ayuda y las solicitudes que borran `/pay`, `/add-payment` y el cierre de mesa (C9; contexto, sección 5).
- El stream recibe el JWT en la URL (0004).
- Los requisitos de tiempo real son:
  - RNF-1: un pedido confirmado, o una solicitud de cobro presencial que no es de MercadoPago, aparece en 2 s o menos;
  - RNF-2: cualquier cambio hecho fuera de la tablet se refleja en 30 s o menos;
  - RNF-3: después de cada acción, la app actualiza las mesas y las solicitudes;
  - RNF-4: si la tablet pasa más de 5 s sin comunicarse, la app avisa, y al recuperarse actualiza mesas, solicitudes y cobros en 5 s o menos.

## Decisión

**Eventos:** una sola conexión a `/sse/waiters` para los tres eventos (RNF-1).

**Consulta periódica:**

- Las mesas, las solicitudes y los cobros (T05, T06 y T07) se consultan periódicamente, para todo lo que no llega por eventos (RNF-2). El intervalo es menor a 30 s.
- Después de cada acción, la app actualiza las mesas y las solicitudes (RNF-3).

**Cortes:**

- Como el stream no tiene heartbeat, la consulta periódica también detecta los cortes.
- Además corre un sondeo liviano cada 5 s o menos, con una de las consultas que ya existen. No se agregan endpoints (0002).
- El aviso de RNF-4 se muestra cuando falla una consulta o cuando pasan 5 s sin respuesta.
- Ante un error, la conexión de eventos se reabre con espera creciente, siempre con un JWT vigente (0004).
- Al reconectar, la app actualiza mesas, solicitudes y cobros (RNF-4).

## Estado

Aceptado.

## Consecuencias

- Hay tráfico constante de consultas mientras la app está abierta: las consultas periódicas, una consulta de cobros por cada mesa (T07) y el sondeo.
- La réplica y el backend real corren en **una sola instancia**, porque con más de una, un evento no llega a los clientes conectados a otra.
- Un reinicio o un despliegue del backend corta todas las conexiones, y la app se recupera sola.
- Lo que se pierde durante un corte se recupera con la actualización al reconectar, no con los eventos.
