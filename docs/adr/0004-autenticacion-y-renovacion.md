# 0004 · Autenticación y renovación de la sesión

## Contexto

- El backend canjea el ID token de Firebase por un JWT propio en `POST /auth/login` (C1, T01). Las demás rutas validan ese JWT, no el de Firebase (contexto, sección 0).
- El JWT de un mozo dura `JWT_EXPIRATION_WAITERS` (16 h por defecto), y **el backend no tiene endpoint de renovación** (C1).
- El stream de eventos recibe el JWT en la URL. Con un JWT vencido, el backend responde 401 antes de abrir el stream (C1; contexto, sección 5).
- La app se autentica igual que el panel actual (PRD, sección 9), con un único modo de acceso: email y contraseña (RF-1; PRD, sección 5).
- Solo usan la app los mozos (RF-2), y cada mozo solo ve y opera su restaurante (RNF-7).
- El turno no tiene límite de duración: el mozo no vuelve a iniciar sesión salvo que cierre sesión o que falle la renovación (RNF-5, RF-3).
- Si se corta la comunicación, la app avisa y se recupera sola (RNF-4).
- Una acción que cambia datos nunca se repite sola (RNF-6).

## Decisión

**Inicio de sesión:**

- Solo con email y contraseña en Firebase, y canje en `POST /auth/login` (RF-1). El ID token de Firebase se usa solo en ese canje; las demás llamadas llevan el JWT del backend.
- Si el rol no es `waiter`, la app cierra la sesión de Firebase, descarta el JWT y muestra el mensaje de RF-2.
- La app toma el restaurante del inicio de sesión (`user.restaurantId`) y lo usa en todas las llamadas (RNF-7).

**Renovación:**

- **Renovar es volver a canjear:** antes de que venza el JWT (según su `exp`) y ante un 401, la app pide un ID token nuevo a Firebase y vuelve a llamar a `POST /auth/login` (RF-3).
- Hay una sola renovación en curso a la vez.
- Si la renovación es **rechazada**, la app lleva al mozo al inicio de sesión (RF-3). Hay rechazo cuando:
  - Firebase invalida al usuario;
  - `POST /auth/login` rechaza el token;
  - el rol ya no es `waiter`, y en ese caso la app muestra el mensaje de RF-2.
- Si la renovación falla por un **error de red**, se trata como un corte: la app muestra el aviso de RNF-4, reintenta con espera creciente y conserva la sesión.
- Al renovar, la conexión de eventos se reabre con el JWT nuevo (0006).

**401 en una llamada:**

- Un 401 en una **consulta** se repite una vez con el JWT nuevo.
- Un 401 en una **acción que cambia datos** no se repite: la app renueva, actualiza el estado y deja que el mozo la intente de nuevo (RNF-6, 0007).

## Estado

Aceptado.

## Consecuencias

- La sesión del turno depende de que la sesión de Firebase siga válida en la tablet.
- Un corte de red no saca al mozo de su sesión: al volver la comunicación, la app renueva y sigue (RNF-4, RNF-5).
- La renovación se prueba con un vencimiento corto del JWT, por la variable de entorno `JWT_EXPIRATION_WAITERS` de la réplica (0002).
