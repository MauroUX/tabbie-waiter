## Why

TK-02 ([issue #3](https://github.com/MauroUX/tabbie-waiter/issues/3), [ticket](../../../docs/backlog/tickets/TK-02-datos-iniciales.md)) carga en una réplica recién creada los dos restaurantes sintéticos, con sus mesas, su menú y sus usuarios, y crea en el proyecto de Firebase de Tabbie las cuentas de prueba que les corresponden. Sin estos datos la réplica de TK-01 arranca vacía: ningún mozo puede iniciar sesión por T01 (los mozos tienen que existir antes de su primer inicio de sesión, `modelo-de-datos.md`, sección 4), y TK-04, el corte de la Entrega 2, no tiene contra qué arrancar. Es el primer ticket de tipo Datos.

## What Changes

- **SQL de los datos iniciales en `replica/datos-iniciales/`** (DP-16): dos restaurantes inventados, con sus umbrales ordenados, sus valores de mentira de MercadoPago, sus mesas y su menú; y cinco usuarios con email del dominio reservado para ejemplos (PR-3):
  - **Restaurante 1:** nombre, dirección y teléfono inventados; los tres umbrales ordenados (amarillo < rojo < rojo parpadeante), entre 10 y 10800 s, cortos para ver los tres colores de HU-02.c5 en pocos minutos; `mercadoPagoToken` y `mercadoPagoRefreshToken` de mentira, reconocibles como tales; al menos seis mesas numeradas desde 1, con `qrCode` único y sus lugares; un menú con productos de al menos tres categorías, precios sin decimales, y al menos un producto con una opción y sus valores.
  - **Restaurante 2:** sus propias mesas, su propio menú y sus propios valores de mentira de MercadoPago, para el aislamiento (RNF-7).
  - **Usuarios:** dos mozos del restaurante 1 y uno del restaurante 2, con rol `waiter` y su `restaurantId`; una cuenta que no es de mozo, con rol `user` y el restaurante 1 (DP-36); y una cuenta de comensal, con rol `user` y sin restaurante, solo para SEG-c4 (DP-36, DP-54).
- **Servicio de carga en `compose.yaml`** (DP-16, DP-51): corre una sola vez, espera a que la réplica termine sus migraciones y ejecuta el SQL. La réplica no tiene seeder.
- **Script de `replica/firebase/`**: crea en el proyecto de Firebase de Tabbie una cuenta por cada fila `user` de los datos iniciales, con la misma dirección; si la cuenta ya existe, no la duplica ni la toca. Las contraseñas son exclusivas de estas cuentas, se leen de un archivo local que no entra al repo y se entregan con el formulario de entrega (0009, RA-7).
- **Pruebas en `replica/tests/`** (DP-14): la carga sobre una base recién creada, la recarga desde cero con el mismo resultado, SEG-c11, y, marcadas locales (DP-43), el canje por T01 de cada cuenta, el script sin duplicados y el ID token sin `email` (DP-58).
- **Documentación:** el `Readme.md` dice que las credenciales de prueba se entregan con el formulario, sin listarlas (DP-35); `infraestructura.md`, sección 2.1, trae los comandos de carga, de recarga y del script de Firebase.

## Capabilities

### New Capabilities

- `datos-iniciales`: los datos iniciales sintéticos de la réplica, cómo se cargan y se vuelven a cargar desde cero, y las cuentas de prueba de Firebase que les corresponden. Lleva los scenarios de los criterios heredados SEG-c11 y WS-c1 (en parte), y los de la DoD de Datos y la propia del ticket.

### Modified Capabilities

- `contrato-replica`: la entrada de T01 suma el scenario del ID token válido sin `email` (DP-58), que TK-01 dejó para este ticket porque necesita una cuenta de Firebase. El comportamiento de T01 no cambia.

## No-alcance

Lo que este cambio **no** hace (ticket, "No incluye"):

- **El esquema:** lo crean las migraciones de la réplica al arrancar (TK-01). Este cambio no agrega ni modifica ninguna migración.
- **Las mesas ocupadas, los pedidos, los pedidos de ayuda, las solicitudes y los cobros:** los genera el simulador (TK-03, TK-08 y TK-13). Por eso T05 con el primer mozo devuelve la lista vacía, y la parte de WS-c1 con "dos mesas ocupadas" y la app es de TK-05.
- **La baja y el alta de una cuenta de prueba, para HU-01.c4:** va con la renovación, en la ampliación.
- **La carga en la base de Railway:** va con el entorno de demo, al final de la ampliación.
- **Ninguna ruta, cuerpo ni evento del contrato cambia** (DP-49): `docs/api/openapi.yaml` no se toca.
- **Ningún componente de la app.**
- **Ningún dato de Tabbie:** ni volcados, ni nombres, ni emails, ni credenciales reales (PR-2). El código de Tabbie no se lee (0010).

## Impact

- **Carpetas nuevas:** `replica/datos-iniciales/` (SQL), `replica/firebase/` (script y el ejemplo de su archivo local, solo con nombres), pruebas nuevas en `replica/tests/`.
- **`compose.yaml`:** un servicio nuevo de carga que corre una sola vez.
- **CI (`.github/workflows/replica.yml`):** la suite corre con los datos cargados; la carga y SEG-c11 entran en la CI (DP-43).
- **Hook `datos-que-no-salen`:** bloquea las contraseñas de las cuentas de prueba (DP-07) y deja pasar los emails del dominio reservado, sin debilitarse.
- **Proyecto de Firebase de Tabbie:** cinco cuentas de prueba, una por fila `user`. Las creó el humano; el script las encontró (`crear`: 0 creadas, 5 existentes, dos veces) y no toca las existentes. La prueba de DP-58 suma, una sola vez, la cuenta sin email `waiterapp-dp58-sin-email`.
- **Documentos:** `Readme.md` y `docs/architecture/infraestructura.md` (2.1); `estructura.md` si una carpeta queda distinta.
