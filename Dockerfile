# Image du site La Cave Buissonnière (option « serveur OVH avec Docker »).
# Trois étages : dépendances -> outils (construction, scripts) -> site (image légère).

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Étage « outils » : sert aussi à lancer les scripts (chargement des données, accès administrateur)
FROM deps AS outils
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
RUN npx prisma generate && npx next build

# Outil de migration Prisma, installé à part avec toutes ses dépendances (même version que le projet)
FROM node:22-bookworm-slim AS migrations
WORKDIR /migrations
COPY package.json /tmp/package.json
RUN npm init -y >/dev/null && npm install --no-audit --no-fund "prisma@$(node -p "require('/tmp/package.json').devDependencies.prisma")"

FROM node:22-bookworm-slim AS site
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl && rm -rf /var/lib/apt/lists/* \
  && groupadd -r cave && useradd -r -g cave cave
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=outils /app/.next/standalone ./
COPY --from=outils /app/.next/static ./.next/static
COPY --from=outils /app/public ./public
COPY --from=outils /app/prisma ./prisma
# moteur Prisma du site, et outil de migration (mise à jour du schéma au démarrage)
COPY --from=outils /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=outils /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=migrations /migrations/node_modules /opt/migrations/node_modules
USER cave
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD curl -fs http://localhost:3000/api/sante || exit 1
CMD ["sh", "-c", "node /opt/migrations/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma && node server.js"]
