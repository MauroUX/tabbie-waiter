# TK-10 · Inicio de sesión: pantalla, errores, rechazo y sesión guardada

| | |
|---|---|
| **Tipo** | Frontend (app) |
| **Origen** | [HU-01](../historias/HU-01-iniciar-sesion.md) · Iniciar sesión y mantenerla todo el turno (RF-1, RF-2) |

## Objetivo

Que el mozo entre con su email y su contraseña a la operación de su restaurante, que quien no es mozo no llegue a ninguna pantalla de la operación, y que la sesión sobreviva a un reinicio.

## Criterios heredados

- [HU-01.c1](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · Entrar con email y contraseña.
- [HU-01.c2](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · Rechazo de quien no es mozo.
- [HU-01.h1](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · Credenciales incorrectas.
- [HU-01.h2](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · Sin conexión al entrar.
- [HU-01.h3](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · La sesión sobrevive a un reinicio.
- [HU-01.h5](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · El rechazo no deja la sesión guardada.
- [HU-01.h6](../historias/HU-01-iniciar-sesion.md#criterios-de-aceptación) · Solo su restaurante.

## Alcance

**Incluye:**

- **Pantalla de inicio de sesión** con diseño, en español y para tablet en horizontal: email, contraseña y "Entrar"; el aviso de datos incorrectos (HU-01.h1) y el de que no hay conexión (HU-01.h2), sin salir del inicio de sesión.
- **Control del rol** (PA-1, 0004): si el rol que devuelve T01 no es `waiter`, cierra la sesión de Firebase, descarta el JWT, muestra el mensaje de RF-2 y no guarda nada de esa sesión.
- **Sesión guardada** (PA-3, 0005): DataStore cifrado con una clave del Android Keystore, con el JWT, su `exp`, el `restaurantId` y el rol. Junto con la sesión que guarda el SDK de Firebase, al reabrir la app entra sin pedir datos.
- **Navegación según la sesión:** sin sesión se ve solo el inicio de sesión, y ninguna pantalla de la operación, tampoco con "Atrás".
- **Un único restaurante** (PA-2): el de T01, en todas las llamadas.

**No incluye:**

- La renovación que el mozo no nota y la que falla: [TK-11](TK-11-renovacion-de-la-sesion.md).
- La navegación principal con "Órdenes" y "Pagos", y la pantalla "Órdenes": [TK-13](TK-13-ordenes.md).
- Cerrar sesión: HU-09, fuera de esta descomposición.
- HU-01.h8, campos vacíos: está entre los descartados de la historia.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `sesion/`, `comun/almacenamiento/` y la raíz del paquete base, donde la navegación decide entre el inicio de sesión y la operación.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 1): Sesión, Pantalla de inicio de sesión y Navegación principal (solo la decisión según la sesión), y el DataStore cifrado.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad): T19 (inicio de sesión en Firebase), T01 (canje, rol y restaurante) y T05 (las mesas de su restaurante).

## Requisitos de prueba del backlog

- **Datos iniciales con dos restaurantes:** HU-01.h6 se prueba con el segundo restaurante, con mesas ocupadas por ESC-8 ([TK-04](TK-04-simulador-cobros.md)). La cuenta que no es de mozo es de [TK-02](TK-02-datos-iniciales.md).

## Dependencias

- [TK-09](TK-09-cliente-de-acciones.md): el walking skeleton terminado. Usa sobre todo el inicio de sesión mínimo de [TK-05](TK-05-app-base.md) y el aviso sin conexión de [TK-07](TK-07-cortes-y-recuperacion.md).
- [TK-04](TK-04-simulador-cobros.md): ESC-8, para HU-01.h6.

## Pasos

1. Crear el cambio de OpenSpec, con un scenario por cada criterio heredado.
2. Escribir las pruebas primero, y verlas fallar: pruebas locales del ViewModel y de Sesión, y pruebas en el dispositivo contra la réplica local con la cuenta de mozo, la que no es de mozo, datos incorrectos, Toxiproxy cortado y un reinicio de la app.
3. Escribir la pantalla de inicio de sesión, con sus estados de carga, de error y sin conexión.
4. Escribir el control del rol, sin dejar nada guardado.
5. Guardar la sesión en DataStore cifrado y recuperarla al abrir la app.
6. Hacer que la navegación muestre el inicio de sesión o la operación según el estado de Sesión.
7. Abrir el PR desde una rama `mc`, con capturas en la tablet de referencia y en la mínima.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Frontend](../definition-of-done.md#frontend-app).
- **Propio del ticket:**
  - Después de un rechazo, el almacenamiento privado de la app no tiene sesión de DataStore ni de Firebase.
  - El JWT, el `restaurantId` y el rol no aparecen en texto claro en el archivo de la sesión (PA-3).

## Riesgos y decisiones pendientes

- **RA-7** ([seguridad.md](../../architecture/seguridad.md)): las cuentas de prueba son públicas; "ese usuario no tiene el rol `waiter` en el backend real, así que la app lo rechaza y no llega a la operación (PA-1, HU-01.c2)".
- **PA-3, Límite:** "la sesión de Firebase queda en el almacenamiento privado de la app sin la clave del Keystore (0005, Consecuencias)".
- **Pendiente:** HU-01.c1, HU-01.h3 y HU-01.h6 verifican "Órdenes", que construye HU-02 ([TK-13](TK-13-ordenes.md)), y el backlog ordena HU-01 antes ([índice](README.md#decisiones-pendientes)).
