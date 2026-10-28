#!/usr/bin/env bash
# Deploy LEARNING MS to the VPS without logging in interactively.
# Usage (from project root):
#   VPS_HOST=your.server.ip VPS_USER=root ./scripts/deploy-from-laptop.sh
# Or copy scripts/deploy.env.example → scripts/deploy.env and fill in values.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/scripts/deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/scripts/deploy.env"
fi

: "${VPS_HOST:?Set VPS_HOST (server IP or hostname)}"
: "${VPS_USER:?Set VPS_USER (e.g. root)}"
VPS_PORT="${VPS_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-/root/elearning}"
BRANCH="${DEPLOY_BRANCH:-codex/python-course-backend}"
SSH_KEY="${VPS_SSH_KEY_FILE:-$HOME/.ssh/id_rsa}"

SSH=(ssh -p "$VPS_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)

echo "→ Deploying branch $BRANCH to $VPS_USER@$VPS_HOST:$REMOTE_DIR"

"${SSH[@]}" "$VPS_USER@$VPS_HOST" bash -s <<REMOTE
set -euo pipefail
cd "$REMOTE_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
if [[ \$(id -u) -eq 0 ]]; then
  systemctl restart learning-ms
  systemctl is-active --quiet learning-ms
else
  sudo systemctl restart learning-ms
  sudo systemctl is-active --quiet learning-ms
fi
curl -fsS --max-time 10 http://127.0.0.1:8765/health >/dev/null
echo "learning-ms health OK"
REMOTE

echo "→ Done. Hard-refresh the site in the browser (Cmd+Shift+R)."
