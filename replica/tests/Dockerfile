# Change tk-01-replica-base · imagen de las pruebas de contrato de la réplica (servicio `pruebas` de compose.yaml).
# Node 20 (0003), git para leer el repo montado y gitleaks para SEG-c10 (DP-62).
FROM node:20.20.2-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f /usr/bin/gitleaks /usr/local/bin/gitleaks

# El repo llega montado con otro dueño: git tiene que aceptarlo.
RUN git config --system --add safe.directory '*'

WORKDIR /pruebas

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "test"]
