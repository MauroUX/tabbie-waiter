# 0002 · Réplica del backend: copia sin cambios y simulador de comensales

## Contexto

- La app no se puede probar contra el backend productivo de Tabbie.
- El backend no se modifica (PRD, sección 9). La app rodea con su propio comportamiento los huecos O1 a O4: "Atendido" por tablet, no cancelar pedidos cobrados, no confirmar cobros que van a fallar y no mostrar datos sensibles (PRD, sección 5).
- El contexto documenta el backend `order-pay-backend`, rama `main`, commit `c18b0f7` (contexto, sección 0).
- Las métricas M-1 a M-3 se miden en un turno simulado, con un simulador de comensales que ocupa mesas, confirma pedidos, pide cobros y pide ayuda. M-2 incluye cortes de conexión provocados durante los cobros (PRD, sección 8).
- Las pruebas de las historias necesitan (backlog, "Requisitos de prueba"):
  - datos iniciales con dos restaurantes, y dos mozos en el primero;
  - un vencimiento corto, configurable, de la sesión y de las solicitudes de cobro;
  - fallos parciales al mandar a cocina y al cancelar;
  - una solicitud sin comensal identificado (RF-25), creada desde el simulador.

## Decisión

**Réplica:**

- Es una **copia sin cambios** del backend actual: `order-pay-backend`, rama `main`, commit `c18b0f7`, el mismo que documenta el contexto.
- Tiene el mismo contrato, los mismos eventos y el mismo comportamiento, incluidos los huecos O1 a O4. No agrega guards, eventos ni endpoints.
- Se copian el código y su configuración de build. No se copian datos, variables de entorno ni la configuración de despliegue de Tabbie.
- Valida el inicio de sesión con el **mismo proyecto de Firebase de Tabbie** (T01, T19). Así la app pasa al backend real cambiando solo la URL base.
- Sus datos iniciales son propios y sintéticos.
- Lo que la réplica necesita para las pruebas (datos iniciales, vencimientos cortos y fallos provocados) se resuelve fuera de su código: con datos, variables de entorno, el simulador y un proxy de red (0003).

**Simulador de comensales:** usa los mismos endpoints que la app del comensal para unirse a la mesa, crear y confirmar pedidos, pedir ayuda, pedir un cobro presencial y cancelar pedidos.

### Predicción del límite

"Los cambios de la Waiter App no van a requerir cambios en el backend de Tabbie, y el contrato de los endpoints y eventos que usa la app (contexto, sección 3.1, columna Waiter App) no va a cambiar mientras dure el MVP."

**Cómo se comprueba:**

- Antes de cada entrega y antes de pasar al backend real, se compara ese contrato entre el commit copiado y el `main` de Tabbie.
- Si cambió, la réplica se actualiza a un commit nuevo, con un ADR que reemplaza a este.
- Si el cambio rompe la app, la ventana de compatibilidad la abre el backend de Tabbie, con fecha de cierre.

## Estado

Aceptado.

## Consecuencias

- La app hereda O1 a O4 y los rodea con su comportamiento (C3, C6, C7, C11).
- La réplica necesita las credenciales del proyecto de Firebase de Tabbie, como secreto del entorno.
- Las cuentas de prueba existen en ese proyecto de Firebase.
  - No tienen el rol `waiter` ni un restaurante en la base del backend real. Si una de ellas inicia sesión contra el backend real, `POST /auth/login` crea su fila `user` en esa base (T01).
  - Sus credenciales se documentan en el `Readme.md` (backlog, "Comportamientos entre tablets"), así que también sirven para iniciar sesión en el proyecto de Firebase de Tabbie.
- La copia puede quedar atrás del backend real, y la predicción del límite es la que lo vigila.
