## 0. Antes del código

- [x] 0.1 OK del humano sobre este change (gate 1); se verifica con `openspec validate tk-02-datos-iniciales --strict` sin errores.
- [x] 0.2 Plan de `replica-feature` aprobado por el humano (gate 2), con los huecos del modelo de datos resueltos como DP-66 a DP-71 en `docs/backlog/tickets/README.md` y el change actualizado con `/opsx:update`. Se verifica con `openspec validate` y sin preguntas abiertas en `design.md`.

## 1. Tests primero, en rojo (`test-writer`)

Un test por scenario, con su ID o su origen en el nombre. Cada uno se ve fallar, con su motivo, antes de implementar.

- [x] 1.1 SEG-c11 · `replica/tests/seguridad/seg-c11.test.ts` (emails de `user` en `example.com`, la marca `FALSO-NO-ES-MERCADOPAGO-`, el servicio `carga` monta solo `replica/datos-iniciales/` y el SQL no lee fuera de esa carpeta) y su bloque de la lista del script en `datos/carga-desde-cero.sh`; se ve en rojo porque no hay datos, ni servicio de carga, ni script.
- [x] 1.2 Los datos iniciales cumplen el modelo de datos · `replica/tests/datos/modelo.test.ts` contra MySQL; se ve en rojo porque la base está vacía.
- [x] 1.3 Lo que deja la carga en una base recién creada · `replica/tests/datos/contenido.test.ts`; se ve en rojo.
- [x] 1.4 Recrear la base y volver a cargar da el mismo resultado · bloque de `datos/carga-desde-cero.sh`, con el control positivo de los dos restaurantes; se ve en rojo.
- [x] 1.5 Volver a levantar el stack sobre una base ya cargada no duplica nada · bloque de `datos/carga-desde-cero.sh`; se ve en rojo.
- [x] 1.6 La carga falla en alto sobre una base que no es la esperada · dos bloques de `datos/carga-desde-cero.sh` (sin migraciones y con un restaurante ajeno); se ven en rojo.
- [x] 1.7 WS-c1 (en parte) · `replica/tests/cuentas/ws-c1.test.ts`, local; se ve en rojo en local.
- [x] 1.8 Canje por T01 de cada cuenta de prueba · `replica/tests/cuentas/canje-t01.test.ts`, local; se ve en rojo en local.
- [x] 1.9 Cada fila `user` tiene su cuenta · `replica/tests/cuentas/cuentas.test.ts`, local; se ve en rojo en local.
- [x] 1.10 Segunda corrida del script · `replica/tests/cuentas/segunda-corrida.test.ts`, local, con `SEGUNDA_CORRIDA_DESDE` como dato; se ve en rojo en local.
- [x] 1.11 T01 rechaza un ID token válido sin `email` (DP-58) · `replica/tests/contrato/t01-sin-email.test.ts`, local. Nace en verde porque T01 ya lo cumple: se le lleva al humano y su rojo se comprueba por mutación.
- [x] 1.12 Congelar los tests: `git add` de cada archivo y `sha256sum` a `congelados.sha` en el scratchpad; la huella se muestra en el chat.

## 2. La carga (`implementer`, fase 1)

- [x] 2.1 Parada del humano: llena `.claude/hooks/valores-prohibidos.local` (C-08a), una contraseña por línea, antes de que se escriban datos con correos; se verifica con `test -f`, sin abrirlo.
- [x] 2.2 `replica/datos-iniciales/datos-iniciales.sql` con los dos restaurantes, sus mesas, su menú y sus cinco usuarios, con las claves fijas (D3; DP-66 a DP-71); se verifica con los tests 1.2 y 1.3.
- [x] 2.3 `replica/datos-iniciales/cargar.sh` y el servicio `carga` en `compose.yaml`, con la espera, las migraciones, la guardia y la transacción (D4), y `pruebas` dependiendo de él; se verifica con los tests 1.4, 1.5 y 1.6 (el plan autoriza `down -v` con `pruebas.env`).
- [x] 2.4 `replica/firebase/` con el modo `lista` y el servicio `cuentas` (D6); se verifica con el test 1.1.
- [x] 2.5 La CI corre `datos/carga-desde-cero.sh` y la suite con los datos cargados; se verifica con la CI en verde.

## 3. Las cuentas de Firebase (`implementer`, fase 2)

- [x] 3.1 Los modos `plan` y `crear` del script; `replica/entornos/cuentas.env.example` y `FIREBASE_WEB_API_KEY` en `local.env.example`, solo con nombres (D8); `env_file` de `cuentas.env` en `cuentas` y `pruebas`.
- [x] 3.2 Parada del humano: se le pasan la ruta y la lista de variables de `replica/entornos/cuentas.env` y la variable nueva de `local.env`, y el humano carga los valores.
- [x] 3.3 Parada del humano: con su OK, `cuentas plan`, que muestra qué cuentas crearía y cuáles ya existen; después, con su OK, `cuentas crear`. Se verifica con los tests 1.7, 1.8 y 1.9 en local.
- [x] 3.4 Parada del humano: con su OK, la primera corrida del test 1.11, que crea la cuenta sin email de DP-58.
- [x] 3.5 Parada del humano: con su OK, la segunda corrida de `cuentas crear`, con `SEGUNDA_CORRIDA_DESDE` anotado antes; se verifica con el test 1.10 en local, y su salida, sin tokens, queda para el PR.

## 4. Cierre

- [x] 4.1 La suite entera y `carga-desde-cero.sh` en verde en la CI, y las pruebas locales en verde con `PRUEBAS_LOCALES=1`; la huella de `congelados.sha` intacta.
- [x] 4.2 `docs/api/openapi.yaml` regenerado sin diferencias con el commiteado (no cambia ningún endpoint).
- [x] 4.3 Detector de secretos sobre todo el historial y todas las ramas, sin hallazgos.
- [x] 4.4 Documentación: el `Readme.md` dice que las credenciales de prueba se entregan con el formulario de entrega, sin listarlas; `infraestructura.md` trae en la sección 2.1 los comandos de carga, de recarga y del script, y en la 5 las variables nuevas; `estructura.md` si una carpeta quedó distinta; `docs/ia/harness.md` con `dbhub` en "Pendiente" (D10); "Comandos" de `AGENTS.md`. Se verifica leyendo cada sección contra los comandos que se corrieron.
- [x] 4.5 `/opsx:verify` sin hallazgos críticos.
