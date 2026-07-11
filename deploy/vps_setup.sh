#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-learning-ms}"
APP_HOST="${APP_HOST:-0.0.0.0}"
PORT="${PORT:-8765}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
ENV_FILE="${ENV_FILE:-/etc/learning-ms.env}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_USER="${APP_USER:-$(id -un)}"

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "Missing ${PYTHON_BIN}. Install Python 3 before running this script." >&2
  exit 1
fi

"${PYTHON_BIN}" -m venv "${APP_DIR}/.venv"
"${APP_DIR}/.venv/bin/python" -m pip install --upgrade pip
"${APP_DIR}/.venv/bin/python" -m pip install -r "${APP_DIR}/requirements.txt"

mkdir -p "${APP_DIR}/data"

if [ ! -f "${ENV_FILE}" ]; then
  sudo tee "${ENV_FILE}" >/dev/null <<ENV
APP_HOST=${APP_HOST}
PORT=${PORT}
COOKIE_SECURE=0
AUTH_COOKIE_NAME=dba_session
REQUIRE_LOGIN=1
ALLOW_SIGNUP=0
SESSION_DAYS=30
SYSTEM_ADMIN_USERNAME=admin
SYSTEM_ADMIN_PASSWORD=change_this_admin_password
SYSTEM_ADMIN_DISPLAY_NAME=Admin
TEACHER_USERNAME=teacher
TEACHER_PASSWORD=change_this_teacher_password
TEACHER_DISPLAY_NAME=Teacher
STUDENT_USERNAME=student
STUDENT_PASSWORD=change_this_student_password
STUDENT_DISPLAY_NAME=Student
COOKIE_NAME=dba_student_id
LESSON_SLUG=cs-fundamentals-lesson-1
LESSON1_VIDEO_DIR=assets/videos/lesson1
LESSON2_VIDEO_DIR=assets/videos/lesson2
SQLITE_DB_PATH=${APP_DIR}/data/learning_ms.sqlite3
ENV
  sudo chmod 600 "${ENV_FILE}"
  echo "Created ${ENV_FILE}. Change the default passwords before sharing the app."
else
  echo "Using existing ${ENV_FILE}."
fi

sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<SERVICE
[Unit]
Description=Learning MS course app
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${APP_DIR}/.venv/bin/python ${APP_DIR}/app.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE_NAME}"

if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow "${PORT}/tcp"
fi

echo
echo "Service status:"
sudo systemctl --no-pager --full status "${SERVICE_NAME}" || true
echo
echo "Local health check:"
curl -fsS "http://127.0.0.1:${PORT}/health" || true
echo
