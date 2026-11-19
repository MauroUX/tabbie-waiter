## MODIFIED Requirements

### Requirement: Contrato T01 · `POST /auth/login`

Fuente: contexto, C1, T01, sección 0 ("Convenciones del backend"), 3.3 (`access_token`) y 3.1 (#1); `modelo-de-datos.md`, 2.2 y sección 4; `infraestructura.md`, sección 5 (`USE_FIREBASE`, `JWT_*`); DP-43.

La réplica SHALL atender `POST /auth/login` **sin guards** (público), con el body `{firebaseIdToken}`.

- Con `USE_FIREBASE` activada, SHALL verificar el ID token con Firebase Admin, buscar el `user` por el `email` del token y, si no existe, insertarlo con rol `user` y sin restaurante. SHALL responder con un JWT propio en `access_token`, firmado con `JWT_SECRET`, que vence a los `JWT_EXPIRATION_WAITERS` (16 h por defecto) si el rol es `waiter` y a los `JWT_EXPIRATION` en los demás casos, y con `user.role` y `user.restaurantId`; un usuario sin restaurante recibe `restaurantId: "-1"`.
- No hay endpoint de renovación (C1).
- **Éxito (DP-55):** 201.
- **Cuerpo de la respuesta (DP-56):** `{"access_token": "<jwt>", "user": {"id", "email", "name", "role", "restaurantId"}}`, con `restaurantId` string y `"-1"` sin restaurante.
- **JWT propio (DP-57):** HS256 con `JWT_SECRET`, claims `{userId, role, iat, exp}`.
- **Errores (DP-58):** un body sin `firebaseIdToken`, un ID token inválido o vencido, o un ID token sin `email` responden 401, con un mensaje que nombra el motivo y sin JWT. El caso del ID token sin `email` necesita un ID token válido de una cuenta de Firebase, así que se prueba en TK-02, que crea las cuentas (DP-15).
- **Sin Firebase (DP-59):** con `USE_FIREBASE` desactivada responde 503, con el mensaje "Firebase desactivado (USE_FIREBASE)" y sin JWT.

#### Scenario: T01 es público

- **WHEN** se llama `POST /auth/login` sin encabezado `Authorization`, con un body `{firebaseIdToken}` cualquiera
- **THEN** la respuesta no es 401 por falta de JWT propio: con `USE_FIREBASE` desactivada es 503 (DP-59)

#### Scenario: T01 con `USE_FIREBASE` desactivada

- **GIVEN** la réplica arrancada con `USE_FIREBASE` desactivada y sin ninguna variable `FIREBASE_*`
- **WHEN** se llama `POST /auth/login` con un body `{firebaseIdToken}`
- **THEN** la réplica responde 503 con el mensaje "Firebase desactivado (USE_FIREBASE)", sin emitir ningún JWT (DP-59)
- **AND** la respuesta valida contra la entrada de T01 en `docs/api/openapi.yaml`

#### Scenario: T01 rechaza un ID token inválido (local, con Firebase)

- **GIVEN** la réplica arrancada con `USE_FIREBASE` activada y las credenciales del archivo local de variables
- **WHEN** se llama `POST /auth/login` con un `firebaseIdToken` que no es un ID token de Firebase
- **THEN** la réplica responde 401, sin emitir ningún JWT y sin insertar ninguna fila en `user` (DP-58)
- Esta prueba se marca **local**: no corre en la CI (DP-43), y su evidencia va en el PR.

#### Scenario: T01 rechaza un body sin `firebaseIdToken` (local, con Firebase)

- **GIVEN** la réplica arrancada con `USE_FIREBASE` activada y las credenciales del archivo local de variables
- **WHEN** se llama `POST /auth/login` con un body sin `firebaseIdToken`
- **THEN** la réplica responde 401 con un mensaje que nombra el campo, sin emitir ningún JWT y sin insertar ninguna fila en `user` (DP-58)
- Esta prueba se marca **local**: no corre en la CI (DP-43), y su evidencia va en el PR.

#### Scenario: T01 rechaza un ID token válido sin `email` (local, con Firebase; DP-58)

- **GIVEN** la réplica arrancada con `USE_FIREBASE` activada y las credenciales del archivo local de variables
- **AND** un ID token válido, emitido por el proyecto de Firebase de Tabbie, de una cuenta que no tiene `email`: la prueba firma un custom token con la cuenta de servicio, para el uid fijo `waiterapp-dp58-sin-email`, y lo canjea con REST `accounts:signInWithCustomToken`
- **WHEN** se llama `POST /auth/login` con ese `firebaseIdToken`
- **THEN** la réplica responde 401 con un mensaje que nombra el `email` que falta, sin emitir ningún JWT y sin insertar ninguna fila en `user` (DP-58)
- Lo prueba TK-02 porque necesita un ID token válido de una cuenta de Firebase (DP-15, DP-58). T01 ya lo cumple desde TK-01, así que el test nace en verde: su rojo se comprueba por mutación. El canje crea en Firebase, una sola vez, la cuenta sin email de ese uid. Esta prueba se marca **local**: no corre en la CI (DP-43), y su evidencia va en el PR.
