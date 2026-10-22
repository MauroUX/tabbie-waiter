# 0005 · Estado de la app sin base de datos local

## Contexto

- En la tablet solo quedan guardadas la sesión del mozo y las marcas de "Atendido". Ningún otro dato de la operación queda en el dispositivo (RNF-8).
- Operar sin conexión está en el no-alcance del MVP (PRD, sección 5).
- Una copia local de los datos del backend sería una segunda fuente de verdad, que tarde o temprano deja de coincidir.
- Las mesas activas llegan con datos sensibles: los emails de los comensales y los tokens de MercadoPago del restaurante (O4). La app no los muestra (RF-9) ni persiste las respuestas (C3).
- "Atendido" se registra en el dispositivo, por sesión de mesa, porque el backend no permite apagar el pedido de ayuda (C7, O1, RF-16).
- El SDK de Firebase guarda por su cuenta su sesión y el refresh token, en el almacenamiento privado de la app.
- Al cerrar sesión, las marcas de "Atendido" se mantienen, porque son de la mesa, no del mozo (RF-4).

## Decisión

- El backend es la única fuente de verdad.
- La app tiene el estado de la operación solo en memoria y lo recarga del backend (0006).
- **Sesión del mozo (RNF-8):**
  - DataStore guarda el JWT, su `exp`, el `restaurantId` y el rol, cifrados con una clave del Android Keystore.
  - La sesión de Firebase la guarda su SDK.
  - Lo que guarda DataStore y lo que guarda el SDK de Firebase forman juntos "la sesión del mozo".
- **Marcas de "Atendido":** DataStore las guarda por sesión de mesa (RF-16).
- **Cerrar sesión (RF-4):** borra la sesión de DataStore y la de Firebase, pero no las marcas de "Atendido".
- No se usa Room.

## Estado

Aceptado.

## Consecuencias

- Al reiniciar la app se recarga todo del backend.
- Sin conexión no hay datos que mostrar, y el aviso de RNF-4 lo indica.
- Los datos sensibles de O4 llegan a la memoria de la app, pero no al almacenamiento de la tablet.
- La sesión de Firebase queda en el almacenamiento privado de la app, sin la clave del Keystore.
- Si en el futuro entra la operación sin conexión, un ADR nuevo reemplaza a este.
