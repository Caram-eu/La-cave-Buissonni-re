#!/usr/bin/env bash
# Tâche du soir : rappels de la veille (après l'heure limite de 19 h) et nettoyage RGPD.
# Lit seulement SITE_URL et CRON_SECRET dans deploy/ovh/.env.
set -euo pipefail
cd "$(dirname "$0")"
val() { grep -E "^$1=" .env | head -1 | cut -d= -f2- | sed -e 's/[[:space:]]#.*$//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"; }
SITE_URL="$(val SITE_URL)"
CRON_SECRET="$(val CRON_SECRET)"
curl -fsS --max-time 120 -H "Authorization: Bearer ${CRON_SECRET}" "${SITE_URL%/}/api/taches/quotidiennes"
echo
