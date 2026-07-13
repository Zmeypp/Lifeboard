#!/bin/bash

set -u

LIFEBOARD_DIR="$1"
LOG_DIR="$HOME/lifeboard-update-logs"
LOG_FILE="$LOG_DIR/update-$(date +%Y-%m-%d_%H-%M-%S).log"

mkdir -p "$LOG_DIR"

exec >> "$LOG_FILE" 2>&1

echo "========================================"
echo "Mise à jour LifeBoard"
echo "Date : $(date)"
echo "Dossier : $LIFEBOARD_DIR"
echo "========================================"

cd "$LIFEBOARD_DIR" || {
  echo "Impossible d'accéder au dossier : $LIFEBOARD_DIR"
  exit 1
}

echo ""
echo "Récupération des modifications Git..."

git pull --ff-only || {
  echo "Échec de git pull."
  exit 1
}

echo ""
echo "Compilation de LifeBoard..."

npm run build || {
  echo "Échec de npm run build."
  exit 1
}

echo ""
echo "Compilation terminée."
echo "Redémarrage du Raspberry Pi..."

sync

sudo /usr/sbin/reboot