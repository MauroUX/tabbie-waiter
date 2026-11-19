# Simulador de comensales (TK-03, design D7). Node 20 (0003), misma imagen y digest que replica/Dockerfile.
# Etapas: `build` compila src/ a dist/; `runtime` trae solo dist/ (el simulador no tiene dependencias de ejecución).
FROM node:20.20.2-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build


FROM node:20.20.2-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist

# Los registros del turno van a /registros, que compose monta desde simulator/registros/.
RUN mkdir /registros && chown node:node /registros
USER node

ENTRYPOINT ["node", "dist/cli.js"]
