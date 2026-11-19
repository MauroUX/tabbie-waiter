# Change tk-03-simulador-mesas-pedidos-y-cobros · imagen de las pruebas del simulador (servicio `pruebas-simulador`
# de compose.yaml). Contexto de build: ./simulator; este archivo: test/Dockerfile (design.md, D4).
# Etapa `simulador`: compila la línea de comandos (dist/cli.js). Etapa final: las pruebas, con git para leer el repo
# montado en /repo. Las pruebas no importan simulator/src/: corren `node /simulador/dist/cli.js`.
FROM node:20.20.2-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS simulador

WORKDIR /simulador

COPY package.json package-lock.json tsconfig.json ./
COPY src/ ./src/
RUN npm ci && npm run build

FROM node:20.20.2-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# El repo llega montado con otro dueño: git tiene que aceptarlo.
RUN git config --system --add safe.directory '*'

WORKDIR /pruebas

COPY test/package.json test/package-lock.json ./
RUN npm ci

COPY test/ ./

COPY --from=simulador /simulador /simulador

CMD ["npm", "test"]
