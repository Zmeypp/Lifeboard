#!/bin/bash

LOG_DIR="$HOME/lifeboard-startup-logs"
SQUEEKBOARD_DIR="$HOME/squeekboard-overlay/squeekboard-v1.43.1"
LIFEBOARD_DIR="$HOME/Desktop/Lifeboard"
LIFEBOARD_URL="http://localhost:3000"

mkdir -p "$LOG_DIR"

echo "===== Démarrage LifeBoard : $(date) =====" \
  >> "$LOG_DIR/startup.log"

# Laisse le temps à l'environnement graphique de terminer son démarrage
sleep 5

# --------------------------------------------------
# 1. Arrêt des anciens processus Squeekboard
# --------------------------------------------------

echo "Arrêt de Squeekboard..." >> "$LOG_DIR/startup.log"

pkill -9 -f squeekboard 2>/dev/null || true

sleep 2

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

sleep 3

# --------------------------------------------------
# 3. Arrêt d'un éventuel ancien serveur sur le port 3000
# --------------------------------------------------

echo "Libération du port 3000..." >> "$LOG_DIR/startup.log"

fuser -k 3000/tcp 2>/dev/null || true

sleep 2

# --------------------------------------------------
# 4. Démarrage de LifeBoard
# --------------------------------------------------

echo "Démarrage de LifeBoard..." >> "$LOG_DIR/startup.log"

cd "$LIFEBOARD_DIR" || {
  echo "Dossier LifeBoard introuvable : $LIFEBOARD_DIR" \
    >> "$LOG_DIR/startup.log"
  exit 1
}

nohup npm run start \
  >> "$LOG_DIR/lifeboard.log" 2>&1 &

LIFEBOARD_PID=$!

echo "LifeBoard PID : $LIFEBOARD_PID" \
  >> "$LOG_DIR/startup.log"

# --------------------------------------------------
# 5. Attente que LifeBoard soit accessible
# --------------------------------------------------

echo "Attente de $LIFEBOARD_URL..." >> "$LOG_DIR/startup.log"

for attempt in $(seq 1 60); do
  if curl --silent --fail --output /dev/null "$LIFEBOARD_URL"; then
    echo "LifeBoard accessible après $attempt tentative(s)." \
      >> "$LOG_DIR/startup.log"
    break
  fi

  sleep 1
done

# --------------------------------------------------
# 6. Démarrage de Firefox en mode kiosque
# --------------------------------------------------

echo "Démarrage de Firefox en mode kiosque..." \
  >> "$LOG_DIR/startup.log"

# Évite que Firefox réutilise une fenêtre déjà ouverte hors kiosque
pkill -f firefox 2>/dev/null || true
sleep 2

if command -v firefox >/dev/null 2>&1; then
  MOZ_ENABLE_WAYLAND=1 firefox \
    --kiosk \
    --private-window \
    "$LIFEBOARD_URL" \
    >> "$LOG_DIR/firefox.log" 2>&1 &

elif command -v firefox-esr >/dev/null 2>&1; then
  MOZ_ENABLE_WAYLAND=1 firefox-esr \
    --kiosk \
    --private-window \
    "$LIFEBOARD_URL" \
    >> "$LOG_DIR/firefox.log" 2>&1 &

else
  echo "Firefox ou Firefox ESR est introuvable." \
    >> "$LOG_DIR/startup.log"
fi