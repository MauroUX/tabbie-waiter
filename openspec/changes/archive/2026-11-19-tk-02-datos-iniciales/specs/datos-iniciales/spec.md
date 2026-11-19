## Purpose

Los datos iniciales sintéticos de la réplica (dos restaurantes con sus mesas, su menú y sus usuarios), cómo se cargan sobre una base recién creada y se vuelven a cargar desde cero, y las cuentas de prueba del proyecto de Firebase de Tabbie que les corresponden (DP-16, DP-37, PR-2, PR-3).

**Origen de cada requirement.** Los que llevan un ID (SEG-c11, WS-c1) son criterios heredados del ticket, con su texto copiado tal cual (DP-08). Los demás no son criterios: son lo que el ticket pide probar por su Definition of Done (la de Datos y la propia de TK-02) o por una decisión (DP-nn), y cada uno nombra su origen.

**Dónde corre cada prueba (DP-43).** La carga, la recarga y SEG-c11 corren en la CI, con `USE_FIREBASE` desactivada. Lo que necesita el proyecto de Firebase de Tabbie (el canje por T01, el script de cuentas) se marca **local**: corre solo con `PRUEBAS_LOCALES=1` y el perfil `local.env`, y su evidencia, sin tokens ni contraseñas, va en el PR.

## ADDED Requirements

### Requirement: SEG-c11 · Datos iniciales sintéticos y cuentas de prueba reconocibles

Los datos iniciales SHALL ser propios e inventados: todos los emails de la tabla `user` y de las cuentas de prueba que crea el script de `replica/firebase/` MUST ser del dominio reservado para ejemplos (`example.com`, PR-3); `mercadoPagoToken` y `mercadoPagoRefreshToken` MUST tener valores de mentira, reconocibles como tales (PR-2); y la carga MUST usar solo archivos del repo, sin volcados.

Criterio heredado, copiado tal cual de [seguridad.md](../../../../../docs/architecture/seguridad.md#43-criterios-nuevos) (DP-08). Su "Dado" compara los datos iniciales con las cuentas que crea el script a partir de ellos, no con una lista del `Readme.md` (DP-37).

> **SEG-c11 · Datos iniciales sintéticos y cuentas de prueba reconocibles** (0002; PR-2, PR-3, RA-7)
>
> - **Dado** los datos iniciales del repo y las cuentas de prueba que crea el script de `replica/firebase/` a partir de ellos (DP-37)
> - **Cuando** se carga una réplica vacía solo con los datos iniciales del repo, y se listan sus usuarios, restaurantes y credenciales de cobro, y las cuentas de prueba de Firebase
> - **Entonces** todos los emails, de los datos iniciales y de las cuentas de prueba, son del dominio reservado para ejemplos
> - **Y** los valores de `mercadoPagoToken` y `mercadoPagoRefreshToken` son de mentira, reconocibles como tales
> - **Y** la carga no usó ningún volcado ni archivo fuera del repo

#### Scenario: SEG-c11 · Datos iniciales sintéticos y cuentas de prueba reconocibles

- **GIVEN** una réplica recién creada (`docker compose down -v` y `up`), cargada solo por el servicio de carga con los archivos de `replica/datos-iniciales/`
- **AND** la lista de cuentas que da el script de `replica/firebase/` en su modo `lista`, que lee la base y no toca Firebase
- **WHEN** se listan desde MySQL todas las filas de `user` (con su `email`) y de `restaurant` (con `mercadoPagoToken` y `mercadoPagoRefreshToken`), y la lista de cuentas del script
- **THEN** cada `email` de `user` y cada email de la lista del script termina en `@example.com`, y las dos listas tienen exactamente los mismos emails
- **AND** cada `mercadoPagoToken` y cada `mercadoPagoRefreshToken` empieza con la marca `FALSO-NO-ES-MERCADOPAGO-` (DP-71) y no tiene el formato de un token real de MercadoPago (no empieza con `APP_USR-` ni con `TEST-`)
- **AND** el servicio de carga monta del repo solo `replica/datos-iniciales/`, de solo lectura, y ningún archivo de esa carpeta lee algo fuera de ella: el SQL no tiene `LOAD DATA`, `SOURCE` ni `\.`
- Corre en la CI (DP-43), en dos partes con el mismo ID: la base, MercadoPago y la carga, en Jest; la lista del script, en el script de la máquina que también recrea la base, porque necesita correr el servicio del script. La parte con las cuentas reales de Firebase la cubre el requirement "Cada fila `user` tiene su cuenta de Firebase", local.

### Requirement: WS-c1 · La réplica corre con sus datos iniciales y el primer mozo inicia sesión (en parte)

La réplica SHALL correr con sus datos iniciales, y la cuenta de prueba del primer mozo del restaurante 1 MUST iniciar sesión por T01 y recibir el rol `waiter` y el restaurante 1.

Criterio heredado, copiado tal cual de [walking-skeleton.md](../../../../../docs/architecture/walking-skeleton.md#5-criterios-de-aceptación) (DP-08). **En parte:** este cambio prueba solo que la réplica corre con sus datos iniciales y que la cuenta de prueba del primer mozo del restaurante 1 inicia sesión por T01 (ticket TK-02). Las dos mesas ocupadas las genera el simulador (TK-03), y el criterio completo, con la app, es de TK-05.

> **WS-c1 · La app arranca contra la réplica** (0002, 0004, 0006; HU-01 y HU-02, lo mínimo)
>
> - **Dado** que la réplica corre con sus datos iniciales, y el restaurante 1 tiene dos mesas ocupadas
> - **Cuando** la app arranca e inicia sesión con la cuenta de prueba del primer mozo del restaurante 1
> - **Entonces** la app muestra en su lista sin diseño las dos mesas que devuelve la réplica para el restaurante 1
> - **Y** el registro anota la conexión de eventos abierta y la primera consulta de mesas, solicitudes y cobros

#### Scenario: WS-c1 · El primer mozo del restaurante 1 inicia sesión por T01 contra la réplica con sus datos iniciales (en parte; local, con Firebase)

- **GIVEN** la réplica recién creada con `local.env` (`USE_FIREBASE` activada), con sus datos iniciales cargados
- **AND** la cuenta de prueba del primer mozo del restaurante 1 creada por el script de `replica/firebase/`
- **WHEN** la prueba obtiene el ID token de esa cuenta con su email y su contraseña, y llama `POST /auth/login` con `{firebaseIdToken}`
- **THEN** la réplica responde 201 con un `access_token`, `user.role` igual a `waiter` y `user.restaurantId` igual al uuid del restaurante 1
- **AND** la tabla `user` no tiene ninguna fila nueva: el mozo ya existía
- **AND** `GET /restaurants/<uuid del restaurante 1>/tables/active` con ese JWT responde 200 con una lista vacía, porque los datos iniciales no traen mesas ocupadas (ticket, "Contrato que usa", T05)
- Esta prueba se marca **local** (DP-43), y su evidencia va en el PR.

### Requirement: Los datos iniciales cumplen el modelo de datos (DoD de Datos)

Origen: Definition of Done, "Datos", fila 2; `modelo-de-datos.md`, sección 4. No es un criterio heredado.

Sobre la base real, después de la carga, los datos SHALL respetar lo que la base no controla: `restaurant.id` MUST ser un uuid; las FK que aceptan nulos MUST estar llenas (`table.restaurantId`, `product.restaurantId`, `product_option.productId`, `product_option_value.productOptionId`, y `user.restaurantId` de todo usuario que no sea el comensal); los enums MUST tener solo sus valores (`user.role`, `restaurant.paymentStyle`, `product_option.type`); los umbrales MUST estar ordenados (`yellowTicketSeconds < redTicketSeconds < redPulseTicketSeconds`) y entre 10 y 10800; y los precios MUST no tener decimales.

#### Scenario: Los datos cargados respetan los tipos, las FK, los enums, los umbrales y los precios

- **GIVEN** una réplica recién creada con sus datos iniciales cargados
- **WHEN** se consulta MySQL directamente, sin pasar por la réplica
- **THEN** cada `restaurant.id` tiene la forma de un uuid (8-4-4-4-12 hexadecimales)
- **AND** ninguna fila tiene nula una de las FK listadas en el requirement, y cada una apunta a una fila que existe
- **AND** `user.role`, `restaurant.paymentStyle` y `product_option.type` solo tienen valores de sus enums
- **AND** en cada restaurante, `10 <= yellowTicketSeconds < redTicketSeconds < redPulseTicketSeconds <= 10800`
- **AND** ningún precio del SQL de `replica/datos-iniciales/` (`product.price` y `product_option_value.price`) tiene decimales, y cada precio de la base es igual al que escribe el SQL
- Corre en la CI.

### Requirement: La carga deja los dos restaurantes que pide el ticket

Origen: ticket TK-02, "Alcance", y backlog, "Requisitos de prueba" (dos restaurantes, y dos mozos en el primero). No es un criterio heredado.

Una carga sobre una base recién creada SHALL dejar exactamente dos restaurantes y cinco usuarios, con las mesas y el menú de cada restaurante, y nada de lo que genera el simulador.

#### Scenario: Lo que deja la carga en una base recién creada

- **GIVEN** una réplica recién creada con sus datos iniciales cargados
- **WHEN** se consulta MySQL directamente
- **THEN** hay dos restaurantes, cada uno con nombre, dirección y teléfono, y valores de mentira propios en `mercadoPagoToken` y `mercadoPagoRefreshToken`, distintos entre los dos restaurantes
- **AND** el restaurante 1 tiene al menos seis mesas numeradas de 1 en adelante sin saltos, y el restaurante 2 tiene sus propias mesas; todos los `qrCode` son distintos y cada mesa tiene `seats` mayor que cero
- **AND** el menú del restaurante 1 tiene productos de al menos tres categorías distintas, y al menos un producto con una opción que tiene al menos un valor; el restaurante 2 tiene su propio menú
- **AND** hay dos usuarios `waiter` del restaurante 1, uno `waiter` del restaurante 2, uno `user` con el restaurante 1 y uno `user` sin restaurante, todos con `isGuest` en falso
- **AND** ninguna mesa está ocupada (`isBusy` falso y `activeSessionId` nulo), y `table_session`, `order` y `payment` están vacías
- Corre en la CI.

### Requirement: La carga corre una sola vez y se vuelve a hacer desde cero (DoD de Datos)

Origen: Definition of Done, "Datos", filas 1 y 4; DP-16 y DP-51; ticket TK-02, "Definition of Done" ("Cómo se deshace: solo recreando la base"). No es un criterio heredado.

El servicio de carga SHALL esperar a que la réplica termine sus migraciones y ejecutar el SQL una sola vez; MUST no duplicar ni cambiar datos sobre una base que ya tiene los datos iniciales; MUST fallar en alto, con un mensaje que dice por qué, si la base no tiene las migraciones o tiene restaurantes que no son los de los datos iniciales. La carga se deshace solo recreando la base, y dos cargas desde cero MUST dar exactamente el mismo resultado.

#### Scenario: Recrear la base y volver a cargar da el mismo resultado

- **GIVEN** una réplica recién creada y cargada, y la foto de sus datos: el conteo de filas de cada una de las 13 tablas y los valores de cada fila de las tablas que carga el SQL, ordenados por su PK
- **WHEN** se recrea la base (`docker compose down -v`) y se vuelve a levantar con la carga
- **THEN** la foto de la segunda carga es idéntica a la de la primera, conteo por conteo y valor por valor, incluidos los uuid de los restaurantes y los ID autoincrementales
- Corre en la CI, en el script de la máquina `replica/tests/datos/carga-desde-cero.sh`, porque recrea la base.

#### Scenario: Volver a levantar el stack sobre una base ya cargada no duplica nada

- **GIVEN** una réplica cargada
- **WHEN** se vuelve a levantar el stack sin borrar los volúmenes, y el servicio de carga corre otra vez
- **THEN** el servicio termina con éxito, dice en su salida que los datos iniciales ya estaban, y la foto de los datos no cambia
- Corre en la CI, en `replica/tests/datos/carga-desde-cero.sh`.

#### Scenario: La carga falla en alto sobre una base que no es la esperada

- **GIVEN** una base sin la tabla de migraciones de la réplica, o con un restaurante que no es de los datos iniciales
- **WHEN** corre el servicio de carga
- **THEN** termina con un código de salida distinto de cero y un mensaje que nombra el motivo, sin insertar ninguna fila
- Corre en la CI, en `replica/tests/datos/carga-desde-cero.sh`.

### Requirement: Cada fila `user` tiene su cuenta de Firebase, y cada cuenta del script su fila (DoD de TK-02)

Origen: ticket TK-02, "Definition of Done", propio ("Cada cuenta de Firebase coincide con una fila `user` de los datos, y cada fila `user` tiene su cuenta"); `estructura.md`, sección 3; DP-37. No es un criterio heredado.

El script de `replica/firebase/` SHALL derivar su lista de cuentas de los datos iniciales cargados, con un email por fila `user` que no es invitado, y MUST crear en el proyecto de Firebase de Tabbie, con la contraseña de su variable `CONTRASENA_<PAPEL>` (DP-71), solo las cuentas de esa lista que faltan. MUST no listar, leer ni tocar ninguna otra cuenta del proyecto: busca cada cuenta por su email. Tiene tres modos: `lista` (sin Firebase), `plan` (busca y no escribe) y `crear`. Solo acepta emails con el prefijo `waiterapp.` del dominio `example.com` (D1).

"Cada cuenta de Firebase" se lee como cada cuenta de prueba de los datos iniciales. La cuenta sin email `waiterapp-dp58-sin-email` no lo es: la crea la prueba local de DP-58 para T01, no tiene fila `user` ni contraseña, y figura en `infraestructura.md`, sección 2.1, y en RA-7 (hallazgo 4 de la revisión adversarial).

#### Scenario: Cada fila `user` tiene su cuenta (local, con Firebase)

- **GIVEN** la réplica cargada con sus datos iniciales y el script de `replica/firebase/` ya corrido en modo `crear`, con el OK del humano
- **WHEN** la prueba inicia sesión en Firebase (REST `accounts:signInWithPassword`, con `FIREBASE_WEB_API_KEY`) con cada `email` de la tabla `user` y la contraseña de su variable
- **THEN** cada inicio de sesión responde con éxito y con ese mismo email: cada fila `user` tiene su cuenta (Firebase admite una sola cuenta por email)
- **AND** la lista del script tiene exactamente los emails de la tabla `user`, ni uno más; lo comprueba en la CI la parte de SEG-c11 que corre el modo `lista`
- Esta prueba se marca **local** (DP-43), y su evidencia va en el PR.

### Requirement: Correr el script dos veces no duplica ninguna cuenta (DoD de TK-02)

Origen: ticket TK-02, "Definition of Done", propio ("Correr el script dos veces no duplica ninguna cuenta") y "Alcance" ("Si una cuenta ya existe, no la duplica"). No es un criterio heredado.

Una segunda corrida del script SHALL no crear ninguna cuenta y MUST dejar sin cambios las que ya existen.

#### Scenario: Segunda corrida del script (local, con Firebase)

- **GIVEN** que todas las cuentas de la lista del script ya existen en Firebase, y el instante `SEGUNDA_CORRIDA_DESDE`, anotado justo antes de la segunda corrida y pasado a la prueba como dato
- **WHEN** se corre el script otra vez en modo `crear`, con el OK del humano, y después la prueba
- **THEN** la salida del script informa cero cuentas creadas y todas como existentes, sin cambios (evidencia en el PR)
- **AND** para cada email, la prueba inicia sesión y consulta su cuenta (REST `accounts:lookup`): su fecha de creación y la de su última contraseña son anteriores a `SEGUNDA_CORRIDA_DESDE`, así que la segunda corrida no la creó de nuevo ni le cambió la contraseña
- Esta prueba se marca **local** (DP-43), y su evidencia va en el PR.

### Requirement: Cada cuenta recibe por T01 su rol y su restaurante (DoD de TK-02)

Origen: ticket TK-02, "Definition of Done", propio ("Cada mozo recibe por T01 el rol `waiter` y su `restaurantId`; la cuenta que no es de mozo recibe su rol y el restaurante 1"); DP-15; para el comensal, el cuerpo de T01 de DP-56. No es un criterio heredado.

Cada cuenta de prueba SHALL canjear su ID token por T01 y recibir el rol y el restaurante de su fila `user`, sin que T01 inserte ninguna fila nueva.

#### Scenario: Canje por T01 de cada cuenta de prueba (local, con Firebase)

- **GIVEN** la réplica con `local.env` y sus datos iniciales cargados, y las cuentas creadas por el script
- **WHEN** la prueba obtiene el ID token de cada cuenta con su email y su contraseña, y llama `POST /auth/login`
- **THEN** cada mozo recibe 201 con `user.role` igual a `waiter` y `user.restaurantId` igual al uuid de su restaurante
- **AND** la cuenta que no es de mozo recibe `user.role` igual a `user` y `user.restaurantId` igual al uuid del restaurante 1
- **AND** la cuenta de comensal recibe `user.role` igual a `user` y `user.restaurantId` igual a `"-1"`
- **AND** la tabla `user` termina con las mismas filas que dejó la carga, sin ninguna nueva
- Esta prueba se marca **local** (DP-43); su evidencia, sin tokens, va en el PR.
