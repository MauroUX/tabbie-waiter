# Definition of Done por tipo de ticket

> Lo que tiene que cumplir un ticket para darse por terminado, según su tipo. Cada ticket de [tickets/](tickets/README.md) enlaza la de su tipo y suma lo propio.
>
> La base son el [backlog](README.md), la [estructura](../architecture/estructura.md), la [seguridad](../architecture/seguridad.md), el [modelo de datos](../architecture/modelo-de-datos.md) y las [decisiones de arquitectura](../adr/README.md). Cuando se configure el proyecto, esta DoD pasa a `AGENTS.md`.

**Referencias:** las mismas que en los ADRs. Un número de cuatro cifras remite a un ADR; "PRD", "contexto" y "backlog" remiten a esos tres documentos; los IDs (RF-n, RNF-n, M-n, Cn, Tnn, On, HU-nn, WS-cN, SEG-cN, PA-n, PR-n) son los de cada documento.

## Cómo se aplica

- **Hecho:** un ticket está hecho cuando cumple "Para todos", la DoD de su tipo y lo propio que agrega en su sección "Definition of Done".
- **Criterios:** el ticket hereda sus criterios de aceptación por ID y no los reescribe. El scenario ejecutable, con el HTTP concreto, vive en la spec del cambio de OpenSpec.
- **Tipos:** son los de [estructura.md](../architecture/estructura.md), sección 3, con dos ajustes:
  - **Datos** reemplaza a "Base de datos" y a "migración": la réplica crea el esquema desde sus entidades y no hay migraciones ([modelo-de-datos.md](../architecture/modelo-de-datos.md)).
  - **Bug** se suma, para los fallos que aparezcan después de cerrar un ticket.
- **El backend no se modifica** (0002; PRD, sección 9): ningún tipo de ticket cambia el código de `backend/`.

## Para todos

| Qué | Por qué |
|---|---|
| El primer paso es el cambio de OpenSpec, con un scenario por criterio heredado. | El ticket dice qué criterio se cumple; el scenario dice con qué petición y qué respuesta se comprueba, y eso cambia con el código, no con el backlog. |
| El test de cada scenario se escribe primero y falla; al cerrar el ticket, pasa. | Un test que nunca falló no prueba que detecta lo que el criterio pide. |
| La documentación de `docs/` que el cambio deja desactualizada se corrige en el mismo PR. | La spec, el código y los documentos se revisan e integran juntos ([estructura.md](../architecture/estructura.md), sección 3). |
| El PR se revisa y sale de una rama con las iniciales `mc`. | Ningún cambio entra sin otra mirada, y la rama dice de quién es el trabajo. |

## Backend (réplica y simulador)

| Qué | Por qué |
|---|---|
| Los criterios heredados pasan, incluida la parte de la réplica o del simulador de los que el ticket hereda en parte. | Un escenario o una configuración que no se prueba deja sin base a los criterios de la app que se apoyan en ella. |
| `backend/` queda idéntico a la copia de `c18b0f7`: el `diff` contra ese commit da vacío, salvo `UPSTREAM.md`. Lo propio va en `replica/` o en `simulator/`. | La app pasa al backend real cambiando solo la URL base (0002); un cambio en la copia lo rompe sin que se note. |
| Los errores se manejan: una petición rechazada, una variable que falta o un servicio que no responde terminan con un error explícito, nunca en silencio. | Las mediciones del skeleton y de M-2 se leen de los registros: un error escondido da una medición falsa. |
| Hay pruebas de integración por HTTP contra MySQL y Redis reales, desde fuera de `backend/`. | La copia no se prueba por dentro: importa el contrato que ve la app, y un MySQL o un Redis de mentira esconden lo que hace la copia, como los `decimal` que llegan como string o el vencimiento en Redis. |
| Los secretos van solo como variables de entorno; `replica/entornos/` trae solo ejemplos sin valores. | Con la cuenta de servicio de Firebase se administra el proyecto de Tabbie, y con `JWT_SECRET` se firma un JWT de cualquier rol (PR-1, SEG-c10). |

## Datos

| Qué | Por qué |
|---|---|
| Los datos se cargan sobre una base recién creada por la réplica, y se pueden volver a cargar desde cero. | Así se vuelve a empezar ([infraestructura.md](../architecture/infraestructura.md), sección 2.1), y cualquiera, incluido el evaluador, repite las pruebas sin preparar nada (backlog, "Comportamientos entre tablets"). |
| Respetan los tipos, las FK y los valores que admite cada columna según [modelo-de-datos.md](../architecture/modelo-de-datos.md): llenan las FK aunque acepten nulos, traen el uuid de `restaurant.id`, usan solo valores de los enums, ordenan los umbrales y ponen precios sin decimales. | La base no controla varias de estas reglas (modelo de datos, sección 4), así que un dato inválido no falla al cargar sino después, en la réplica o en la app. |
| Son sintéticos, sin datos de Tabbie, y las cuentas usan un dominio de ejemplo. Las credenciales de cobro del restaurante son de mentira y se reconocen como tales. | El repo es público y la demo corre en Internet, y la réplica devuelve esos datos por O2 a O4 (PR-2, PR-3, SEG-c11). |
| Cada carga dice cómo se deshace: con otra carga, fallando en alto o solo recreando la base. | No hay migraciones con su vuelta atrás, así que la forma de deshacer se decide al escribir la carga. |

## Frontend (app)

| Qué | Por qué |
|---|---|
| Cada pantalla tiene sus estados de carga, de error y vacío. | Sin base local (0005), la pantalla no tiene nada que mostrar mientras llegan los datos o si no llegan, y un salón sin mesas ocupadas es un estado normal. |
| Sin conexión, se comporta como dice el [walking skeleton](../architecture/walking-skeleton.md): aviso a los 5 s y recuperación sola, en 5 s, al volver la comunicación (RNF-4). | Hay un solo mecanismo para los cortes, el Monitor de conexión (0006); una pantalla con su propio manejo lo contradice. |
| Ninguna acción que cambia datos se repite sola, ni por la app ni por el cliente HTTP, y no se puede volver a tocar mientras está en curso (RNF-6, 0007). | Una acción repetida es un cobro duplicado o un pedido mandado dos veces (M-2). |
| Se ve en una tablet en horizontal y en español (RNF-10): completa en la referencia de 10,1" a 1920×1200 y en el mínimo de 8" a 1280×800, sin desplazamiento horizontal. | Es el dispositivo que entrega el restaurante (backlog, "Tamaño y resolución de la tablet"). |
| ktlint pasa sin errores, y el código no usa `!!`. | Un `!!` sobre un dato que el backend no mandó cierra la app en medio del turno; ktlint deja un solo estilo en todo el código. |

## Bug

| Qué | Por qué |
|---|---|
| Un test reproduce el fallo y falla antes del arreglo. | Prueba que el fallo existe y que el test lo detecta. |
| El arreglo es el mínimo que cierra el fallo. | Se revisa rápido y no arrastra otros cambios. |
| El test queda en verde. | Es la evidencia de que el arreglo cierra el fallo. |
| El PR trae un 5 porqués breve. | Llega a la causa y no al síntoma, para que el fallo no vuelva. |

**Un fallo en el código de la copia no se arregla en `backend/`:** se documenta como observación del contexto y, si la app tiene que rodearlo, es un ticket de Frontend (0002).
