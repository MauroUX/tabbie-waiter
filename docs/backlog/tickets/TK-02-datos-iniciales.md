# TK-02 · Datos iniciales sintéticos y cuentas de prueba

| | |
|---|---|
| **Tipo** | Datos |
| **Origen** | [Walking skeleton](../../architecture/walking-skeleton.md): "Réplica: arranca con sus datos iniciales"; backlog, "Requisitos de prueba" y "Comportamientos entre tablets" |
| **Readme.md** | Ticket de base de datos de la sección 6 |

## Objetivo

Cargar en una réplica recién creada dos restaurantes sintéticos, con sus mesas, su menú y sus mozos, y crear en el proyecto de Firebase de Tabbie las cuentas de prueba que les corresponden.

## Criterios heredados

- [SEG-c11](../../architecture/seguridad.md#43-criterios-nuevos) · Datos iniciales sintéticos y cuentas de prueba reconocibles.
- [WS-c1](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app arranca contra la réplica. **En parte:** que la réplica corre con sus datos iniciales y que la cuenta de prueba del primer mozo del restaurante 1 inicia sesión por T01. El criterio completo es de [TK-05](TK-05-eventos-y-consulta-periodica.md).

## Alcance

**Incluye:**

- **Restaurante 1**, para el skeleton y para las pruebas con dos tablets:
  - nombre, dirección y teléfono inventados;
  - los tres umbrales de demora, ordenados (amarillo < rojo < rojo parpadeante) y entre 10 y 10800 s, con valores que dejen ver los tres colores de HU-02.c5 en pocos minutos;
  - `mercadoPagoToken` y `mercadoPagoRefreshToken` con valores de mentira que se reconocen como tales, para SEG-c4;
  - al menos seis mesas, numeradas desde 1, con su `qrCode` único y sus lugares. HU-02.c2 pide tres ocupadas y dos libres, HU-02.h2 nombra las mesas 3 y 6, y HU-04.c1 las mesas 4 y 5;
  - un menú con productos de al menos tres categorías, para agrupar los pedidos (HU-02.c2), precios sin decimales, y al menos un producto con una opción y sus valores, para que T05 traiga el árbol de ítems completo.
- **Restaurante 2**, para el aislamiento (RNF-7) de HU-01.h6 y HU-02.h7: sus propias mesas y su propio menú, y sus propios valores de mentira de MercadoPago. El skeleton no lo usa (DP-04), pero las historias del lote 1 sí.
- **Usuarios**, todos con email del dominio reservado para ejemplos (PR-3):
  - dos mozos del restaurante 1 y uno del restaurante 2, con rol `waiter` y su `restaurantId`. Tienen que existir antes de su primer inicio de sesión ([modelo-de-datos.md](../../architecture/modelo-de-datos.md), sección 4). El segundo mozo del restaurante 1 es la "otra tablet" de los cobros del simulador y de las pruebas con dos tablets del lote 1;
  - una cuenta que no es de mozo, con rol `user` y el restaurante 1 asignado. La usan HU-01.c2 y HU-01.h5, y SEG-c4 como "un usuario que tiene asignado el restaurante 1" (DP-36);
  - una cuenta de comensal, con rol `user` y sin restaurante, solo para las comprobaciones de seguridad: es "el comensal sin restaurante" de SEG-c4 (DP-36, ajustada por DP-54). Para todo lo demás, el comensal del simulador entra como invitado, con `POST /auth/guest` (DP-17).
- **`replica/firebase/`:** el script que crea en el proyecto de Firebase de Tabbie una cuenta por cada usuario de los datos iniciales, con las mismas direcciones. Si una cuenta ya existe, no la duplica. Las contraseñas son exclusivas de estas cuentas.
- **La carga** (DP-16): el SQL de `replica/datos-iniciales/` y el servicio de `compose.yaml` que corre una sola vez, espera a que terminen las migraciones de la réplica (DP-51) y lo ejecuta. La réplica no tiene seeder.
- **Las credenciales de prueba,** que no se publican: se entregan con el formulario de entrega, y el `Readme.md` dice eso en lugar de listarlas (backlog, "Comportamientos entre tablets"; RA-7; [0009](../../adr/0009-publicacion-del-repo-y-credenciales.md)).
- **La forma de cargar y de volver a cargar desde cero**, documentada con sus comandos en [infraestructura.md](../../architecture/infraestructura.md), sección 2.1.

**No incluye:**

- El esquema: lo crea la réplica al arrancar ([TK-01](TK-01-replica.md)).
- Las mesas ocupadas, los pedidos, los pedidos de ayuda, las solicitudes y los cobros: los genera el simulador ([TK-03](TK-03-simulador-mesas-pedidos-y-cobros.md), [TK-08](TK-08-simulador-ordenes.md) y [TK-13](TK-13-simulador-pagos.md)).
- La baja y el alta de una cuenta de prueba, para HU-01.c4: va con la renovación, en la ampliación.
- La carga en la base de Railway: va con el entorno de demo, al final de la ampliación.

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `replica/datos-iniciales/`, `replica/firebase/` y `compose.yaml`, para el servicio que carga los datos (DP-16). La prueba de la carga y de las cuentas, en `replica/tests/` (DP-14).
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 2): las tablas que leen `UsersModule`, `RestaurantsModule`, `TableModule` y los módulos de productos; `FirebaseAdminModule`, que verifica el ID token de las cuentas en T01. Ningún componente de la app.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad):

- **T19:** el script crea las cuentas en Firebase Authentication, y la prueba obtiene con ellas un ID token.
- **T01:** cada cuenta canjea su ID token y recibe su rol y su restaurante.
- **T05:** la prueba consulta las mesas activas del restaurante 1 con el JWT de su primer mozo, y no recibe ninguna, porque los datos iniciales no traen mesas ocupadas.

## Requisitos de prueba del backlog

- **Datos iniciales con dos restaurantes, y dos mozos en el primero:** este ticket lo cumple. En el lote 1 los usan HU-01.h6 y HU-02.h7 (dos restaurantes), y HU-06.h3, HU-07.h2 y HU-08.h4 (dos mozos).

## Dependencias

- [TK-01](TK-01-replica.md): la réplica base, cuyas migraciones crean el esquema sobre el que se cargan los datos.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de SEG-c11 y de la parte de WS-c1.
2. Escribir las pruebas primero, y verlas fallar: la carga sobre una base recién creada, la recarga desde cero, el inicio de sesión de cada cuenta por T01 y las comprobaciones de SEG-c11.
3. Escribir el servicio de `compose.yaml` que corre una sola vez, espera a que la réplica cree el esquema y ejecuta el SQL de `replica/datos-iniciales/` (DP-16; [estructura.md](../../architecture/estructura.md), sección 3).
4. Escribir los datos de los dos restaurantes, sus mesas, su menú y sus usuarios, revisando cada tabla contra [modelo-de-datos.md](../../architecture/modelo-de-datos.md): las columnas que no aceptan nulos y no tienen valor por defecto, el uuid de `restaurant.id`, las FK que aceptan nulos pero tienen que llenarse y los valores de los enums.
5. Escribir el script de `replica/firebase/`: crea las cuentas que faltan y no toca las que existen.
6. Cargar sobre una base recién creada, recrear la base y volver a cargar. Las dos veces el resultado tiene que ser el mismo.
7. Iniciar sesión con cada cuenta por T01 contra la réplica local y comprobar su rol y su restaurante.
8. Preparar las credenciales de prueba para el formulario de entrega, fuera del repo; escribir en el `Readme.md` que se entregan así, y documentar los pasos de carga en [infraestructura.md](../../architecture/infraestructura.md) (DP-35).
9. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Datos](../definition-of-done.md#datos).
- **Propio del ticket:**
  - Cada cuenta de Firebase coincide con una fila `user` de los datos, y cada fila `user` tiene su cuenta ([estructura.md](../../architecture/estructura.md), sección 3).
  - Cada mozo recibe por T01 el rol `waiter` y su `restaurantId`; la cuenta que no es de mozo recibe su rol y el restaurante 1.
  - Correr el script dos veces no duplica ninguna cuenta.
  - **Cómo se deshace:** solo recreando la base, que vacía también lo que generó el simulador. Las cuentas de Firebase no se tocan.

## Riesgos y decisiones

- **RA-7** ([seguridad.md](../../architecture/seguridad.md)): "Las cuentas de prueba existen en el proyecto de Firebase de Tabbie". Sus credenciales no se publican: se entregan con el formulario de entrega ([0009](../../adr/0009-publicacion-del-repo-y-credenciales.md)). Igual usan el dominio reservado y contraseñas exclusivas (PR-3), y el hook de pre-commit bloquea sus contraseñas (DP-07).
- **Modelo de datos, sección 4:** "El `@Check` de los umbrales no existe en MySQL"; "Los precios no tienen decimales"; "`restaurant.id` lo genera TypeORM, no MySQL"; "Los mozos tienen que existir antes de su primer inicio de sesión".
- **Decidido (DP-16):** los datos iniciales son SQL propio en `replica/datos-iniciales/`, que carga un servicio de Compose que corre una sola vez ([componentes.md](../../architecture/componentes.md#decisiones-tomadas-2026-11-14)).
- **Decidido (DP-17, DP-36 y DP-54):** el comensal del simulador entra como invitado. Este ticket crea una sola cuenta de comensal, para SEG-c4, y le da el rol `user` a la cuenta que no es de mozo.
- **Decidido (DP-15):** este ticket prueba el canje con Firebase (T01) de cada cuenta; la prueba del contrato de [TK-01](TK-01-replica.md) no lo necesita.
- **Decidido (DP-37):** SEG-c11 compara los datos iniciales con las cuentas que crea el script de `replica/firebase/`, no con una lista del `Readme.md`.
- **Decidido (DP-43):** la carga y SEG-c11 corren en la CI; el canje de cada cuenta por T01 necesita el proyecto de Firebase de Tabbie, así que se marca como prueba local y su evidencia va en el PR.
