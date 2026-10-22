# 0001 · App nativa Android para tablet

## Contexto

- El mozo opera todo el turno en una tablet que entrega el restaurante, configurada en modo kiosco (PRD, secciones 2 y 9).
- Más adelante la operación va a necesitar imprimir comandas en una impresora Bluetooth, operar sin conexión y recibir avisos con la pantalla bloqueada (PRD, sección 1).
  - Las tres están en el no-alcance del MVP (PRD, sección 5), pero condicionan la plataforma: la que se elija ahora tiene que poder ofrecerlas después.
- El PRD fija como restricción una app nativa Android para tablet (PRD, sección 9), y todas las pantallas se usan en una tablet en orientación horizontal (RNF-10).

## Decisión

- La Waiter App es una app nativa Android, en Kotlin con Jetpack Compose.
- Es solo para tablet, en orientación horizontal (RNF-10).

**Alternativas descartadas:** una app web instalable (PWA) y React Native.

- Las dos reemplazan el panel web.
- **PWA:** el navegador limita el acceso a la impresora Bluetooth y los avisos con la pantalla bloqueada.
- **React Native:** agrega una capa sobre las mismas APIs nativas que usa una app en Kotlin.

## Estado

Aceptado.

## Consecuencias

- Hay que compilar y distribuir un APK.
- El proyecto mantiene Kotlin, en la app, además de TypeScript, en la réplica y el simulador (0002, 0003).
