#!/bin/bash

set -uo pipefail

LOG_DIR="$HOME/lifeboard-startup-logs"
SQUEEKBOARD_DIR="$HOME/squeekboard-overlay/squeekboard-v1.43.1"
LIFEBOARD_DIR="$HOME/Desktop/Lifeboard"
LIFEBOARD_URL="http://localhost:3000"

UPDATE_BUILD_DIR="$HOME/lifeboard-update-build"
UPDATE_READY_FILE="$UPDATE_BUILD_DIR/.lifeboard-update-ready"

NODE_VERSION="v24.18.0"
NODE_BIN_DIR="$HOME/.nvm/versions/node/$NODE_VERSION/bin"

STATUS_FILE="$HOME/lifeboard-update-status.json"

SPLASH_SCRIPT="$LIFEBOARD_DIR/scripts/lifeboard_splash.py"
SPLASH_LOG="$LOG_DIR/splash.log"
SPLASH_PID=""

mkdir -p "$LOG_DIR"

echo "===== Démarrage LifeBoard : $(date) =====" \
  >> "$LOG_DIR/startup.log"

cleanup_splash() {
  if (
    [ -n "${SPLASH_PID:-}" ] &&
    kill -0 "$SPLASH_PID" 2>/dev/null
  ); then
    echo "Fermeture du splashscreen..." \
      >> "$LOG_DIR/startup.log"

    kill "$SPLASH_PID" 2>/dev/null || true
  fi
}

trap cleanup_splash EXIT

if [ -f "$SPLASH_SCRIPT" ]; then
  echo "Démarrage du splashscreen..." \
    >> "$LOG_DIR/startup.log"

  python3 "$SPLASH_SCRIPT" \
    >> "$SPLASH_LOG" 2>&1 &

  SPLASH_PID=$!

  echo "Splash PID : $SPLASH_PID" \
    >> "$LOG_DIR/startup.log"
else
  echo "Splashscreen introuvable : $SPLASH_SCRIPT" \
    >> "$LOG_DIR/startup.log"
fi

reset_update_status() {
  STATUS_FILE="$STATUS_FILE" python3 - <<'PY'
import json
import os
from datetime import datetime, timezone
from pathlib import Path

status_file = Path(os.environ["STATUS_FILE"])
temporary_file = status_file.with_suffix(".tmp")

data = {
    "status": "idle",
    "progress": 0,
    "message": "LifeBoard a redémarré avec succès.",
    "error": None,
    "updatedAt": datetime.now(timezone.utc).isoformat(),
}

temporary_file.write_text(
    json.dumps(data, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

temporary_file.replace(status_file)
PY
}

# Laisse le temps à l'environnement graphique de terminer son démarrage
sleep 1

# --------------------------------------------------
# 1. Arrêt des anciens processus Squeekboard
# --------------------------------------------------

echo "Arrêt de Squeekboard..." >> "$LOG_DIR/startup.log"

pkill -9 -f squeekboard 2>/dev/null || true

sleep 0.2

# --------------------------------------------------
# 2. Démarrage de Squeekboard en overlay
# --------------------------------------------------

echo "Démarrage de Squeekboard..." >> "$LOG_DIR/startup.log"

cd "$SQUEEKBOARD_DIR" || {
  echo "Dossier Squeekboard introuvable : $SQUEEKBOARD_DIR" \
    >> "$LOG_DIR/startup.log"
  exit 1
}

nohup env SQUEEKBOARD_LAYER=overlay \
  ./build/src/squeekboard \
  >> "$LOG_DIR/squeekboard.log" 2>&1 &

SQUEEKBOARD_PID=$!

echo "Squeekboard PID : $SQUEEKBOARD_PID" \
  >> "$LOG_DIR/startup.log"

sleep 0.5

# --------------------------------------------------
# 3. Arrêt d'un éventuel ancien serveur sur le port 3000
# --------------------------------------------------

echo "Libération du port 3000..." >> "$LOG_DIR/startup.log"

fuser -k 3000/tcp 2>/dev/null || true

sleep 0.2

# --------------------------------------------------
# 4. Publication d'une mise à jour en attente
# --------------------------------------------------

if [ -f "$UPDATE_READY_FILE" ]; then
  echo "Mise à jour LifeBoard détectée." \
    >> "$LOG_DIR/startup.log"

  if [ ! -d "$UPDATE_BUILD_DIR/.next" ]; then
    echo "ERREUR : nouveau dossier .next introuvable." \
      >> "$LOG_DIR/startup.log"
    exit 1
  fi

  if [ ! -d "$UPDATE_BUILD_DIR/node_modules" ]; then
    echo "ERREUR : nouvelles dépendances introuvables." \
      >> "$LOG_DIR/startup.log"
    exit 1
  fi

  cd "$LIFEBOARD_DIR" || {
    echo "Dossier LifeBoard introuvable : $LIFEBOARD_DIR" \
      >> "$LOG_DIR/startup.log"
    exit 1
  }

  BRANCH="$(git symbolic-ref --quiet --short HEAD)" || {
    echo "ERREUR : impossible de déterminer la branche Git." \
      >> "$LOG_DIR/startup.log"
    exit 1
  }

  echo "Publication de origin/$BRANCH..." \
  >> "$LOG_DIR/startup.log"

# Le git fetch a déjà été réalisé par update_and_reboot.sh
# avant le redémarrage. Il ne faut pas dépendre du réseau
# pendant le démarrage du Raspberry Pi.
git reset --hard "origin/$BRANCH" \
  >> "$LOG_DIR/startup.log" 2>&1 || {
    echo "ERREUR : échec de git reset sur origin/$BRANCH." \
      >> "$LOG_DIR/startup.log"
    exit 1
  }

  rm -rf "$LIFEBOARD_DIR/.next"
  rm -rf "$LIFEBOARD_DIR/node_modules"

  # Les deux dossiers sont dans $HOME, donc normalement sur le même
  # système de fichiers : mv est presque instantané, contrairement à cp.
  mv "$UPDATE_BUILD_DIR/.next" "$LIFEBOARD_DIR/.next" || {
    echo "ERREUR : impossible d'installer le nouveau build." \
      >> "$LOG_DIR/startup.log"
    exit 1
  }

  mv "$UPDATE_BUILD_DIR/node_modules" "$LIFEBOARD_DIR/node_modules" || {
    echo "ERREUR : impossible d'installer les nouvelles dépendances." \
      >> "$LOG_DIR/startup.log"
    exit 1
  }

  rm -rf "$UPDATE_BUILD_DIR"

  sync

  echo "Mise à jour LifeBoard publiée avec succès." \
    >> "$LOG_DIR/startup.log"
fi

# --------------------------------------------------
# 5. Démarrage de LifeBoard
# --------------------------------------------------

echo "Démarrage de LifeBoard..." >> "$LOG_DIR/startup.log"

export NVM_DIR="$HOME/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh"
fi

export PATH="$NODE_BIN_DIR:$PATH"

echo "Node utilisé : $(command -v node)" \
  >> "$LOG_DIR/startup.log"

echo "NPM utilisé : $(command -v npm)" \
  >> "$LOG_DIR/startup.log"

cd "$LIFEBOARD_DIR" || {
  echo "Dossier LifeBoard introuvable : $LIFEBOARD_DIR" \
    >> "$LOG_DIR/startup.log"
  exit 1
}

export VIRTUAL_ENV="$LIFEBOARD_DIR/.venv"
export PATH="$VIRTUAL_ENV/bin:$NODE_BIN_DIR:$PATH"

export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

echo "Python utilisé : $(command -v python)" \
  >> "$LOG_DIR/startup.log"

echo "Version Python : $(python --version 2>&1)" \
  >> "$LOG_DIR/startup.log"

nohup "$NODE_BIN_DIR/npm" run start \
  >> "$LOG_DIR/lifeboard.log" 2>&1 &

LIFEBOARD_PID=$!

echo "LifeBoard PID : $LIFEBOARD_PID" \
  >> "$LOG_DIR/startup.log"

# --------------------------------------------------
# 6. Attente que LifeBoard soit accessible
# --------------------------------------------------

echo "Attente de $LIFEBOARD_URL..." >> "$LOG_DIR/startup.log"

LIFEBOARD_READY=false

for attempt in $(seq 1 300); do
  if curl --silent --fail --output /dev/null "$LIFEBOARD_URL"; then
    LIFEBOARD_READY=true

    echo "LifeBoard accessible après $attempt tentative(s)." \
      >> "$LOG_DIR/startup.log"

    break
  fi

  if ! kill -0 "$LIFEBOARD_PID" 2>/dev/null; then
    echo "Le processus LifeBoard s'est arrêté." \
      >> "$LOG_DIR/startup.log"

    break
  fi

  sleep 0.2
done

if [ "$LIFEBOARD_READY" != "true" ]; then
  echo "LifeBoard indisponible, Firefox ne sera pas lancé." \
    >> "$LOG_DIR/startup.log"

  exit 1
fi

reset_update_status

echo "Statut de mise à jour réinitialisé." \
  >> "$LOG_DIR/startup.log"

# --------------------------------------------------
# 7. Démarrage de Firefox en mode kiosque
# --------------------------------------------------

echo "Démarrage de Firefox en mode kiosque..." \
  >> "$LOG_DIR/startup.log"

pkill -f firefox 2>/dev/null || true

sleep 0.2

FIREFOX_PID=""

if command -v firefox >/dev/null 2>&1; then
  MOZ_ENABLE_WAYLAND=1 firefox \
    --kiosk \
    "$LIFEBOARD_URL" \
    >> "$LOG_DIR/firefox.log" 2>&1 &

  FIREFOX_PID=$!
elif command -v firefox-esr >/dev/null 2>&1; then
  MOZ_ENABLE_WAYLAND=1 firefox-esr \
    --kiosk \
    "$LIFEBOARD_URL" \
    >> "$LOG_DIR/firefox.log" 2>&1 &

  FIREFOX_PID=$!
else
  echo "Firefox ou Firefox ESR est introuvable." \
    >> "$LOG_DIR/startup.log"

  exit 1
fi

echo "Firefox PID : $FIREFOX_PID" \
  >> "$LOG_DIR/startup.log"

echo "Attente de l'affichage de Firefox..." \
  >> "$LOG_DIR/startup.log"

# Le processus Firefox démarre avant que sa fenêtre kiosque
# soit réellement affichée. On laisse donc le splash visible
# quelques secondes supplémentaires.
for attempt in $(seq 1 30); do
  if ! kill -0 "$FIREFOX_PID" 2>/dev/null; then
    echo "Firefox s'est arrêté avant son affichage." \
      >> "$LOG_DIR/startup.log"
    break
  fi

  sleep 0.2
done

cleanup_splash
SPLASH_PID=""

echo "Démarrage LifeBoard terminé." \
  >> "$LOG_DIR/startup.log"