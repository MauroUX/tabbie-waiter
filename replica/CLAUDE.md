# Réplica

- **`backend/` no se toca (DP-46).** No existe hasta TK-01:
  - al importar la copia, se compara `backend/` con un export de `c18b0f7` sacado del repo de Tabbie, con `git diff --no-index`, y tiene que dar vacío salvo `UPSTREAM.md`. El commit que importa la copia lleva la etiqueta `backend-base`, que se pushea;
  - después, se comprueba con `git diff --stat backend-base -- backend/ ':!backend/UPSTREAM.md'`, que tiene que dar vacío, en local y en la CI. La CI necesita la etiqueta en el checkout.
- **Las pruebas** son Jest + Supertest, por HTTP contra la réplica levantada con Docker Compose, en `replica/tests/` (DP-14).
- **`docs/api/openapi.yaml`** se escribe a mano, y lo validan las pruebas de contrato (DP-09, DP-42).
- **La CI corre sin Firebase** (DP-43).
