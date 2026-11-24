#!/usr/bin/env bash
# Restaure une sauvegarde : ./restauration.sh sauvegardes/cave-AAAA-MM-JJ_HHMM.sql.gz
# ATTENTION : remplace tout le contenu actuel de la base par celui de la sauvegarde.
set -euo pipefail
cd "$(dirname "$0")"
[ -f "${1:-}" ] || { echo "Utilisation : $0 sauvegardes/cave-....sql.gz"; exit 1; }
read -r -p "Remplacer TOUTE la base actuelle par $1 ? Tapez OUI : " ok
[ "$ok" = "OUI" ] || { echo "Annulé."; exit 1; }
echo "Sauvegarde de sécurité de l'état actuel avant restauration…"
./sauvegarde.sh
docker compose stop site
docker compose exec -T base psql -U cave -d postgres -c "DROP DATABASE IF EXISTS cave;" -c "CREATE DATABASE cave OWNER cave;"
gunzip -c "$1" | docker compose exec -T base psql -U cave -d cave -q
docker compose start site
echo "Base restaurée depuis $1."
