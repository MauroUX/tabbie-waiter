## 1. Paradas del humano y entorno

- [x] 1.1 El humano registra la app `com.tabbie.waiter` en el proyecto de Firebase de Tabbie y deja `android/app/google-services.json`; se comprueba que existe y que `git check-ignore` lo ignora, sin leerlo
- [x] 1.2 Con el OK del humano, crear el AVD `tablet-8-1280x800` (D12); se comprueba con `emulator -list-avds` y, arrancado, `adb shell wm size` da 1280x800
- [x] 1.3 El humano carga `CONTRASENA_MOZO1_R1` en su entorno (D9); se comprueba que la variable existe, sin mostrar su valor
- [x] 1.4 Con el OK del humano, levantar la réplica con `local.env` desde cero (`down -v` y `up`) y ocupar las mesas 1 y 2 del restaurante 1 con ESC-1; se comprueba con el registro del turno del simulador

## 2. Proyecto y tests en rojo

- [x] 2.1 Crear el proyecto Gradle (wrapper 9.6.0, catálogo de versiones de D11, módulo `app`, Spotless con ktlint, tres variantes, `.gitignore`) y comprobar que `assembleLocalDebug` compila un proyecto vacío
- [x] 2.2 Test de SEG-c7 en el dispositivo (demo con `http://` y local hacia otro host), escrito antes que el código; se ve fallar
- [x] 2.3 Test de WS-c1 (en parte) en el dispositivo, contra la réplica local, escrito antes que el código; se ve fallar
- [x] 2.4 Tests locales de la Sesión, el Cliente HTTP, el Salón, el registro de diagnóstico y las dos pantallas, con sus estados y bordes del plan; se ven fallar contra el esqueleto y se congelan por su huella

## 3. Implementación

- [x] 3.1 Cliente HTTP base (D6) y modelos de red de T01 y T05; los tests del cliente pasan
- [x] 3.2 Sesión mínima en memoria y `AutenticacionFirebase` con el SDK (D7); los tests de la Sesión pasan
- [x] 3.3 Salón mínimo y su pantalla; los tests del Salón y de su pantalla pasan
- [x] 3.4 Pantalla de inicio de sesión y navegación mínima (D8); los tests de la pantalla pasan
- [x] 3.5 Registro de diagnóstico en Logcat (D5); los tests del registro y de PA-6 pasan
- [x] 3.6 Configuración de seguridad de red por variante (D4); el test de SEG-c7 pasa en el emulador, en `local` y en `demo` con `-PurlBase=http://10.0.2.2:<puerto>/`
- [x] 3.7 El test de WS-c1 pasa en el emulador contra la réplica local, y la captura a 1280×800 muestra las mesas 1 y 2

## 4. CI, documentación y cierre

- [ ] 4.1 `.github/workflows/app.yml` (D10); sale en verde en el PR sin `google-services.json`
- [x] 4.2 La sección "Comandos" de `android/CLAUDE.md` con los comandos reales, y `estructura.md`, `infraestructura.md` y DP-88 a DP-96 en `docs/backlog/tickets/README.md`; se comprueba que ningún documento contradice el código
- [x] 4.3 ktlint sin errores, ningún `!!`, `retryOnConnectionFailure` solo en `false`, ningún `Level.HEADERS` ni `Level.BODY`, y la huella de los tests congelados en OK
- [x] 4.4 `/opsx:verify` sin hallazgos críticos

## 5. Revisión adversarial (D14)

- [x] 5.1 Tests nuevos de DP-97, DP-99 y DP-100, escritos antes del arreglo; se ven fallar y se congelan
- [x] 5.2 Reglas de extracción (DP-97), error inesperado (DP-99) y tope de 4 s por consulta (DP-100); los tests nuevos y los anteriores pasan
- [x] 5.3 La contraseña fuera de Gradle (DP-101): `app/build.gradle.kts` sin `contrasenaMozo`, el script `android/scripts/pruebas-en-dispositivo.sh` y el historial de Gradle sin la contraseña; los tests en el dispositivo pasan con el script en `local` y en `demo`
- [x] 5.4 Lo menor (DP-102): la validación del wrapper en la CI y el token nulo de Firebase; DP-98 en `android/CLAUDE.md`; DP-97 a DP-102 en `docs/backlog/tickets/README.md`
