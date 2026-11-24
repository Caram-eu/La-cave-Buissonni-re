#!/usr/bin/env bash
# Construction sur Vercel : mise à jour du schéma de la base, puis construction du site.
# DIRECT_URL (connexion directe Neon, sans « -pooler ») sert aux migrations ; DATABASE_URL (avec pooler) au site.
set -euo pipefail
if [ -n "${DIRECT_URL:-}" ]; then
  DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
else
  npx prisma migrate deploy
fi
npx prisma generate
npx next build
