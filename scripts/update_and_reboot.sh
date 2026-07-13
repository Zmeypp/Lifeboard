#!/bin/bash

set -uo pipefail

LIFEBOARD_DIR="${1:-}"
LOG_DIR="$HOME/lifeboard-update-logs"
LOG_FILE="$LOG_DIR/update-$(date +%Y-%m-%d_%H-%M-%S).log"

mkdir -p "$LOG_DIR"

exec >> "$LOG_FILE" 2>&1

echo "========================================"
echo "Mise à jour LifeBoard"
echo "Date : $(date)"
echo "Dossier : $LIFEBOARD_DIR"
echo "========================================"

fail() {
  echo ""
  echo "ERREUR : $1"
  echo "La mise à jour est interrompue."
  exit 1
}

if [ -z "$LIFEBOARD_DIR" ]; then
  fail "Le dossier LifeBoard n'a pas été fourni."
fi

cd "$LIFEBOARD_DIR" ||
  fail "Impossible d'accéder au dossier : $LIFEBOARD_DIR"

if [ ! -d ".git" ]; then
  fail "Le dossier indiqué n'est pas un dépôt Git."
fi

echo ""
echo "Branche Git actuelle..."

BRANCH="$(git symbolic-ref --quiet --short HEAD)" ||
  fail "Impossible de déterminer la branche Git actuelle."

echo "Branche : $BRANCH"

echo ""
echo "Récupération des références distantes..."

git fetch --prune origin ||
  fail "Échec de git fetch."

if ! git show-ref \
  --verify \
  --quiet \
  "refs/remotes/origin/$BRANCH"
then
  fail "La branche distante origin/$BRANCH est introuvable."
fi

LOCAL_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse "origin/$BRANCH")"

echo "Commit local   : $LOCAL_COMMIT"
echo "Commit distant : $REMOTE_COMMIT"

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
  echo "Le code source est déjà à jour."
else
  echo ""
  echo "Alignement du Raspberry sur origin/$BRANCH..."

  git reset --hard "origin/$BRANCH" ||
    fail "Impossible d'aligner le dépôt local."
fi

echo ""
echo "Installation propre des dépendances..."

if [ -f "package-lock.json" ]; then
  npm ci --no-audit --no-fund ||
    fail "Échec de npm ci."

  echo ""
  echo "Complément d'installation des dépendances..."

  npm install --no-audit --no-fund ||
    fail "Échec de npm install."
else
  npm install --no-audit --no-fund ||
    fail "Échec de npm install."
fi

echo ""
echo "Compilation de LifeBoard..."

npm run build ||
  fail "Échec de npm run build."

echo ""
echo "Compilation terminée."
echo "Synchronisation des écritures disque..."

sync

echo ""
echo "Redémarrage du Raspberry Pi..."

sudo /usr/sbin/reboot ||
  fail "Impossible de redémarrer le Raspberry Pi."