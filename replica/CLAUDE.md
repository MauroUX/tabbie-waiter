# Réplica

- **`backend/` no se toca (DP-46).** No existe hasta TK-01:
  - la importación la hace el humano, no el agente (DP-47): `settings.json` bloquea escribir en `backend/`, y copiar por la terminal sería esquivar ese bloqueo. Se compara `backend/` con un export de `c18b0f7` sacado del repo de Tabbie, con `git diff --no-index`, y tiene que dar vacío. El commit que importa la copia lleva la etiqueta `backend-base`, que se pushea;
  - después, se comprueba con `git diff --stat backend-base -- backend/`, que tiene que dar vacío, en local y en la CI. La CI necesita la etiqueta en el checkout;
  - la ficha de la copia es `docs/architecture/backend-upstream.md`, no un archivo dentro de `backend/` (DP-47).
- **Las pruebas** son Jest + Supertest, por HTTP contra la réplica levantada con Docker Compose, en `replica/tests/` (DP-14).
- **`docs/api/openapi.yaml`** se escribe a mano, y lo validan las pruebas de contrato (DP-09, DP-42).
- **La CI corre sin Firebase** (DP-43).
