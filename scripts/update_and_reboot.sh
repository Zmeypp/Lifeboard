#!/bin/bash

set -uo pipefail

LIFEBOARD_DIR="${1:-}"
LOG_DIR="$HOME/lifeboard-update-logs"
LOG_FILE="$LOG_DIR/update-$(date +%Y-%m-%d_%H-%M-%S).log"

STATUS_FILE="$HOME/lifeboard-update-status.json"
BUILD_DIR="$HOME/lifeboard-update-build"

START_SCRIPT_SOURCE="$BUILD_DIR/start-lifeboard.sh"
START_SCRIPT_TARGET="$HOME/start-lifeboard.sh"

mkdir -p "$LOG_DIR"

exec >> "$LOG_FILE" 2>&1

write_status() {
  local status="$1"
  local progress="$2"
  local message="$3"
  local error="${4:-}"

  STATUS="$status" \
  PROGRESS="$progress" \
  MESSAGE="$message" \
  ERROR_MESSAGE="$error" \
  STATUS_FILE="$STATUS_FILE" \
  python3 - <<'PY'
import json
import os
from datetime import datetime, timezone
from pathlib import Path

status_file = Path(os.environ["STATUS_FILE"])
temporary_file = status_file.with_suffix(".tmp")

data = {
    "status": os.environ["STATUS"],
    "progress": int(os.environ["PROGRESS"]),
    "message": os.environ["MESSAGE"],
    "error": os.environ["ERROR_MESSAGE"] or None,
    "updatedAt": datetime.now(timezone.utc).isoformat(),
}

temporary_file.write_text(
    json.dumps(data, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

temporary_file.replace(status_file)
PY
}

fail() {
  echo ""
  echo "ERREUR : $1"
  echo "La mise à jour est interrompue."

  write_status \
    "error" \
    "${CURRENT_PROGRESS:-0}" \
    "La mise à jour a échoué." \
    "$1"

  exit 1
}

CURRENT_PROGRESS=2

write_status \
  "running" \
  "$CURRENT_PROGRESS" \
  "Préparation de la mise à jour…"

echo "========================================"
echo "Mise à jour LifeBoard"
echo "Date : $(date)"
echo "Dossier actif : $LIFEBOARD_DIR"
echo "Dossier de build : $BUILD_DIR"
echo "========================================"

if [ -z "$LIFEBOARD_DIR" ]; then
  fail "Le dossier LifeBoard n'a pas été fourni."
fi

cd "$LIFEBOARD_DIR" ||
  fail "Impossible d'accéder au dossier : $LIFEBOARD_DIR"

if [ ! -d ".git" ]; then
  fail "Le dossier indiqué n'est pas un dépôt Git."
fi

CURRENT_PROGRESS=7

write_status \
  "running" \
  "$CURRENT_PROGRESS" \
  "Détermination de la branche Git…"

BRANCH="$(git symbolic-ref --quiet --short HEAD)" ||
  fail "Impossible de déterminer la branche Git actuelle."

echo "Branche : $BRANCH"

CURRENT_PROGRESS=12

write_status \
  "running" \
  "$CURRENT_PROGRESS" \
  "Récupération des mises à jour Git…"

git fetch --prune origin ||
  fail "Échec de git fetch."

if ! git show-ref \
  --verify \
  --quiet \
  "refs/remotes/origin/$BRANCH"
then
  fail "La branche distante origin/$BRANCH est introuvable."
fi

CURRENT_PROGRESS=18

write_status \
  "running" \
  "$CURRENT_PROGRESS" \
  "Préparation du dossier de compilation…"

REMOTE_URL="$(git remote get-url origin)" ||
  fail "Impossible de récupérer l'URL du dépôt distant."

echo "Dépôt distant : $REMOTE_URL"

rm -rf "$BUILD_DIR" ||
  fail "Impossible de supprimer l'ancien dossier de compilation."

git clone \
  --branch "$BRANCH" \
  --single-branch \
  "$REMOTE_URL" \
  "$BUILD_DIR" ||
  fail "Impossible de cloner la dernière version distante."

cd "$BUILD_DIR" ||
  fail "Impossible d'accéder au dossier temporaire."

git fetch --prune origin ||
  fail "Échec de git fetch dans le dossier temporaire."

git reset --hard "origin/$BRANCH" ||
  fail "Impossible d'aligner le dossier temporaire."

CURRENT_PROGRESS=28

write_status \
  "running" \
  "$CURRENT_PROGRESS" \
  "Installation des dépendances…"

if [ -f "package-lock.json" ]; then
  env \
    -u NODE_ENV \
    -u NPM_CONFIG_PRODUCTION \
    -u NPM_CONFIG_OMIT \
    npm ci --include=dev --no-audit --no-fund ||
    fail "Échec de npm ci."
else
  env \
    -u NODE_ENV \
    -u NPM_CONFIG_PRODUCTION \
    -u NPM_CONFIG_OMIT \
    npm install --include=dev --no-audit --no-fund ||
    fail "Échec de npm install."
fi

CURRENT_PROGRESS=60

write_status \
  "running" \
  "$CURRENT_PROGRESS" \
  "Compilation de LifeBoard…"

NODE_ENV=production npm run build ||
  fail "Échec de npm run build."

CURRENT_PROGRESS=88

write_status \
  "running" \
  "$CURRENT_PROGRESS" \
  "Préparation de la nouvelle version…"

if [ ! -d "$BUILD_DIR/.next" ]; then
  fail "Le dossier de compilation .next est introuvable."
fi

if [ ! -d "$BUILD_DIR/node_modules" ]; then
  fail "Le dossier node_modules compilé est introuvable."
fi


# --------------------------------------------------
# Mise à jour du script de démarrage
# --------------------------------------------------

if [ -f "$START_SCRIPT_SOURCE" ]; then
  if (
    [ ! -f "$START_SCRIPT_TARGET" ] ||
    ! cmp --silent \
      "$START_SCRIPT_SOURCE" \
      "$START_SCRIPT_TARGET"
  ); then
    echo "Une nouvelle version de start-lifeboard.sh a été détectée."

    START_SCRIPT_TEMP="$HOME/.start-lifeboard.sh.tmp"

    cp "$START_SCRIPT_SOURCE" "$START_SCRIPT_TEMP" ||
      fail "Impossible de préparer le nouveau script de démarrage."

    chmod 755 "$START_SCRIPT_TEMP" ||
      fail "Impossible de rendre le nouveau script de démarrage exécutable."

    mv "$START_SCRIPT_TEMP" "$START_SCRIPT_TARGET" ||
      fail "Impossible d'installer le nouveau script de démarrage."

    echo "Le script $START_SCRIPT_TARGET a été mis à jour."
  else
    echo "Le script de démarrage est déjà à jour."
  fi
else
  fail "Le fichier $START_SCRIPT_SOURCE est introuvable dans la nouvelle version."
fi

CURRENT_PROGRESS=96

write_status \
  "running" \
  "$CURRENT_PROGRESS" \
  "Finalisation de la mise à jour…"

sync

CURRENT_PROGRESS=100

write_status \
  "rebooting" \
  "$CURRENT_PROGRESS" \
  "Le système va redémarrer dans un instant. Veuillez patienter."

# Indique au script de démarrage qu'une mise à jour
# doit être publiée avant de lancer LifeBoard.
touch "$BUILD_DIR/.lifeboard-update-ready" ||
  fail "Impossible de marquer la mise à jour comme prête."

sync

# Laisse au navigateur plusieurs secondes pour afficher 100 %.
sleep 5

sudo /usr/sbin/reboot ||
  fail "Impossible de redémarrer le Raspberry Pi."