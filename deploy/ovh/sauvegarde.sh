#!/usr/bin/env bash
# Sauvegarde quotidienne de la base (commandes, clients, carte, photos, réglages).
# Garde 30 jours de sauvegardes dans deploy/ovh/sauvegardes/. À copier aussi ailleurs (voir LISEZMOI).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p sauvegardes
fichier="sauvegardes/cave-$(date +%Y-%m-%d_%H%M).sql.gz"
docker compose exec -T base pg_dump -U cave -d cave --no-owner | gzip > "$fichier"
find sauvegardes -name 'cave-*.sql.gz' -mtime +30 -delete
echo "Sauvegarde : $fichier ($(du -h "$fichier" | cut -f1))"
