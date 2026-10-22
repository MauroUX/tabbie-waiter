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
- [WS-c1](../../architecture/walking-skeleton.md#5-criterios-de-aceptación) · La app arranca contra la réplica. **En parte:** que la réplica corre con sus datos iniciales y que la cuenta de prueba del primer mozo del restaurante 1 inicia sesión por T01. El criterio completo es de [TK-06](TK-06-eventos-y-consulta-periodica.md).

## Alcance

**Incluye:**

- **Restaurante 1**, para las pruebas con dos tablets:
  - nombre, dirección y teléfono inventados;
  - los tres umbrales de demora, ordenados (amarillo < rojo < rojo parpadeante) y entre 10 y 10800 s, con valores que dejen ver los tres colores de HU-02.c5 en pocos minutos;
  - `mercadoPagoToken` y `mercadoPagoRefreshToken` con valores de mentira que se reconocen como tales, para SEG-c4;
  - al menos seis mesas, numeradas desde 1, con su `qrCode` único y sus lugares. HU-02.c2 pide tres ocupadas y dos libres, HU-02.h2 nombra las mesas 3 y 6, y HU-04.c1 las mesas 4 y 5;
  - un menú con productos de al menos tres categorías, para agrupar los pedidos (HU-02.c2), precios sin decimales, y al menos un producto con una opción y sus valores, para que T05 traiga el árbol de ítems completo.
- **Restaurante 2**, para el aislamiento (RNF-7): sus propias mesas y su propio menú, y sus propios valores de mentira de MercadoPago.
- **Usuarios**, todos con email del dominio reservado para ejemplos (PR-3):
  - dos mozos del restaurante 1 y uno del restaurante 2, con rol `waiter` y su `restaurantId`. Tienen que existir antes de su primer inicio de sesión ([modelo-de-datos.md](../../architecture/modelo-de-datos.md), sección 4);
  - una cuenta que no es de mozo, con el restaurante 1 asignado. La usan HU-01.c2 y HU-01.h5, y SEG-c4 como "un usuario que tiene asignado el restaurante 1";
  - las cuentas de los comensales, solo si se decide que el comensal se autentica con una cuenta (ver "Riesgos y decisiones pendientes"). SEG-c3 pide un comensal con email.
- **`replica/firebase/`:** el script que crea en el proyecto de Firebase de Tabbie una cuenta por cada usuario de los datos iniciales, con las mismas direcciones. Si una cuenta ya existe, no la duplica. También da de baja una cuenta de prueba y la vuelve a dar de alta, para HU-01.c4 ("la cuenta se dio de baja"). Las contraseñas son exclusivas de estas cuentas.
- **Las credenciales de prueba** documentadas en el `Readme.md` (backlog, "Comportamientos entre tablets"; RA-7).
- **La forma de cargar y de volver a cargar desde cero**, documentada con sus comandos en [infraestructura.md](../../architecture/infraestructura.md), secciones 2.1 y 2.2.

**No incluye:**

- El esquema: lo crea la réplica al arrancar ([TK-01](TK-01-replica.md)).
- Las mesas ocupadas, los pedidos, los pedidos de ayuda y las solicitudes de cobro: los genera el simulador ([TK-03](TK-03-simulador-mesas-y-pedidos.md) y [TK-04](TK-04-simulador-cobros.md)).
- La mesa con pedidos ya cobrados para HU-04: [TK-15](TK-15-mesa-con-pedidos-cobrados.md).

## Dónde se trabaja

- **Carpetas** ([estructura.md](../../architecture/estructura.md)): `replica/datos-iniciales/` y `replica/firebase/`. `compose.yaml` solo si la carga necesita un servicio.
- **Componentes** ([componentes.md](../../architecture/componentes.md), sección 2): las tablas que leen `UsersModule`, `RestaurantsModule`, `TableModule` y los módulos de productos; `FirebaseAdminModule`, que verifica el ID token de las cuentas en T01. Ningún componente de la app.

## Contrato que usa

Por su fila de la [tabla de trazabilidad](../../context/panel-mozos-actual.md#2-tabla-de-trazabilidad):

- **T19:** el script crea las cuentas en Firebase Authentication, y la prueba obtiene con ellas un ID token.
- **T01:** cada cuenta canjea su ID token y recibe su rol y su restaurante.
- **T05:** la prueba consulta las mesas activas del restaurante 1 con el JWT de su primer mozo, y no recibe ninguna, porque los datos iniciales no traen mesas ocupadas.

## Requisitos de prueba del backlog

- **Datos iniciales con dos restaurantes, y dos mozos en el primero:** este ticket lo cumple. Lo usan HU-01, HU-02 y HU-03 (dos restaurantes) y HU-03 y HU-06 a HU-11 (dos mozos).

## Dependencias

- [TK-01](TK-01-replica.md): la réplica que crea el esquema sobre el que se cargan los datos.

## Pasos

1. Crear el cambio de OpenSpec, con los scenarios de SEG-c11 y de la parte de WS-c1.
2. Escribir las pruebas primero, y verlas fallar: la carga sobre una base recién creada, la recarga desde cero, el inicio de sesión de cada cuenta por T01 y las comprobaciones de SEG-c11.
3. Aplicar la decisión sobre cómo se cargan los datos. Si el seeder de la copia no puede leerlos desde `replica/datos-iniciales/` sin cambiar su código, se cargan por fuera ([estructura.md](../../architecture/estructura.md), sección 3).
4. Escribir los datos de los dos restaurantes, sus mesas, su menú y sus usuarios, revisando cada tabla contra [modelo-de-datos.md](../../architecture/modelo-de-datos.md): las columnas que no aceptan nulos y no tienen valor por defecto, el uuid de `restaurant.id`, las FK que aceptan nulos pero tienen que llenarse y los valores de los enums.
5. Escribir el script de `replica/firebase/`: crea las cuentas que faltan, no toca las que existen, y da de baja o de alta una cuenta cuando se le pide.
6. Cargar sobre una base recién creada, recrear la base y volver a cargar. Las dos veces el resultado tiene que ser el mismo.
7. Iniciar sesión con cada cuenta por T01 contra la réplica local y comprobar su rol y su restaurante.
8. Documentar las credenciales de prueba en el `Readme.md`, y los pasos de carga en [infraestructura.md](../../architecture/infraestructura.md).
9. Abrir el PR desde una rama `mc`.

## Definition of Done

- La de [Para todos](../definition-of-done.md#para-todos) y la de [Datos](../definition-of-done.md#datos).
- **Propio del ticket:**
  - Cada cuenta de Firebase coincide con una fila `user` de los datos, y cada fila `user` tiene su cuenta ([estructura.md](../../architecture/estructura.md), sección 3).
  - Cada mozo recibe por T01 el rol `waiter` y su `restaurantId`; la cuenta que no es de mozo recibe su rol y el restaurante 1.
  - Correr el script dos veces no duplica ninguna cuenta.
  - **Cómo se deshace:** solo recreando la base, que vacía también lo que generó el simulador. Las cuentas de Firebase no se tocan.

## Riesgos y decisiones pendientes

- **RA-7** ([seguridad.md](../../architecture/seguridad.md)): "Las cuentas de prueba existen en el proyecto de Firebase de Tabbie", y sus credenciales se publican en el `Readme.md`. Por eso usan el dominio reservado y contraseñas exclusivas (PR-3).
- **Modelo de datos, sección 4:** "El `@Check` de los umbrales no existe en MySQL"; "Los precios no tienen decimales"; "`restaurant.id` lo genera TypeORM, no MySQL"; "Los mozos tienen que existir antes de su primer inicio de sesión".
- **Pendiente:** "Carga de los datos iniciales: … Falta decidir cómo se cargan: con el seeder que trae la copia (`src/seeder/`) o por fuera" ([componentes.md](../../architecture/componentes.md), "Decisiones pendientes").
- **Pendiente:** "Cómo se autentica el comensal: con una cuenta de Firebase y `POST /auth/login` (1, T01), o como invitado con `POST /auth/guest` (2, T02)" ([componentes.md](../../architecture/componentes.md)). Si es con cuenta, este ticket crea también las de los comensales.
- **Pendiente:** dónde viven las pruebas de integración de la réplica ([índice](README.md#decisiones-pendientes)).
