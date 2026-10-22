# TK-11 · Renovación de la sesión que el mozo no nota

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [HU-01](../historias/HU-01-iniciar-sesion.md) · Iniciar sesión y mantenerla todo el turno (RF-3) |

## Objetivo

Que la sesión del mozo dure todo el turno sin que él lo note, y que vuelva al inicio de sesión solo cuando la renovación es rechazada.

## Criterios heredados

- [HU-01.c3](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · Renovación sin que el mozo se entere.
- [HU-01.c4](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · La renovación falla.
- [HU-01.h4](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · La sesión vence durante un corte.

## Alcance

**Incluye** lo que ve el mozo de la renovación que deja [TK-08](TK-08-renovacion-del-jwt.md) (0004, PA-8):

- **Renovación aceptada:** ningún mensaje, ningún pedido de datos, y la pantalla sigue donde estaba.
- **Renovación rechazada:** Firebase invalida al usuario, T01 rechaza el token o el rol ya no es `waiter`. La app borra la sesión y muestra el inicio de sesión; si el rol cambió, con el mensaje de RF-2.
- **Renovación que falla por la red:** cuenta como corte. La app muestra el aviso de RNF-4, reintenta con espera creciente y conserva la sesión; al volver la comunicación, renueva sola y actualiza las mesas en 5 s o menos.
- La sesión guardada se actualiza con el JWT nuevo en cada renovación.

**No incluye:**

- La mecánica de la renovación y la reapertura de eventos: [TK-08](TK-08-renovacion-del-jwt.md).
- El 401 en una acción: [TK-09](TK-09-cliente-de-acciones.md).
- Que las marcas de "Atendido" se mantienen cuando falla la renovación: HU-10.h7, fuera de esta descomposición.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `sesion/` y `comun/red/` (Monitor de conexión).
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Sesión, Monitor de conexión y Navegación principal (la vuelta al inicio de sesión).

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T19, T01 y T05.

## Requisitos de prueba del backlog

- **Un vencimiento corto, configurable, de la sesión:** el perfil de pruebas de [TK-01](TK-01-replica.md).
- **La cuenta dada de baja de HU-01.c4:** el script de cuentas de [TK-02](TK-02-datos-iniciales.md), que da de baja y vuelve a dar de alta una cuenta de prueba.

## Dependencias

- [TK-10](TK-10-inicio-de-sesion.md): la pantalla de inicio de sesión y la sesión guardada.
- [TK-08](TK-08-renovacion-del-jwt.md): la renovación.
- [TK-07](TK-07-cortes-y-recuperacion.md): el aviso sin conexión y la recuperación.

## Pasos

1. Crear el cambio de OpenSpec, con un scenario por cada criterio heredado.
2. Escribir las pruebas primero, y verlas fallar: con el perfil de pruebas, una renovación aceptada mientras el mozo opera; una con la cuenta dada de baja; y una con Toxiproxy cortado desde antes del vencimiento hasta después.
3. Escribir la salida de la renovación rechazada hacia el inicio de sesión, con el mensaje de RF-2 cuando corresponde.
4. Tratar la renovación que falla por la red como un corte, y renovar sola al volver la comunicación.
5. Actualizar la sesión guardada en cada renovación.
6. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app).
- **Propio del ticket:**
  - La cuenta dada de baja para HU-01.c4 se vuelve a dar de alta al terminar la prueba.
  - Un corte durante el vencimiento no saca al mozo de su sesión.

## Riesgos y decisiones pendientes

- **0004, Consecuencias:** "La sesión del turno depende de que la sesión de Firebase siga válida en la tablet".
- **PA-8** ([seguridad.md](../../architecture/seguridad.md)): "una cuenta dada de baja o que dejó de ser de mozo pierde el acceso en la próxima renovación".
- **Pendiente:** HU-01.c3 y HU-01.h4 se ven sobre "Órdenes", que construye HU-02 ([TK-13](TK-13-ordenes.md)) ([índice](README.md#decisiones-pendientes)).
