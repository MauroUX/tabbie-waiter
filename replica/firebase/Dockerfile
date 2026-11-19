# Script de las cuentas de prueba (TK-02, D6). Node 20 (0003), la misma imagen fijada que la réplica.
# Se corre con: docker compose --profile firebase run --rm --build cuentas <lista|plan|crear>
FROM node:20.20.2-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

USER node
ENTRYPOINT ["node", "src/cuentas.js"]
