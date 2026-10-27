#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

# ---- 本地 dev 说明（不新建额外文档）----
# 前端：pnpm dev（http://localhost:3000）；后端：cd backend && python manage.py runserver。
# 定时发布：本地未起 Celery beat 时用 `cd backend && python manage.py run_scheduler`
# （config.settings.dev 中 CELERY_TASK_ALWAYS_EAGER=True，到点任务会同步执行）；
# 也可手动起 Celery：celery -A config worker -l info / celery -A config beat -l info。
# 生产：本脚本默认同时拉起 Django(gunicorn)、Celery worker、Celery beat 与 Next.js，
# 可用 START_BACKEND=0 / START_WORKER=0 / START_BEAT=0 单独关闭。
# -------------------------------------

BACKEND_DIR="${COZE_WORKSPACE_PATH}/backend"
LOG_DIR="${COZE_WORKSPACE_PATH}/logs"
BACKEND_LOG="${LOG_DIR}/backend.log"
WORKER_LOG="${LOG_DIR}/worker.log"
BEAT_LOG="${LOG_DIR}/beat.log"

START_BACKEND="${START_BACKEND:-1}"
START_WORKER="${START_WORKER:-1}"
START_BEAT="${START_BEAT:-1}"
PYTHON_BIN="${PYTHON_BIN:-python}"
CELERY_BIN="${CELERY_BIN:-celery}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

mkdir -p "${LOG_DIR}"

start_backend() {
    if [[ "${START_BACKEND}" != "1" ]]; then
        echo "[start] 跳过 Django 后端（START_BACKEND=${START_BACKEND}）"
        return
    fi
    if [[ ! -d "${BACKEND_DIR}" ]]; then
        echo "[start] 未找到 backend 目录：${BACKEND_DIR}" >&2
        return
    fi
    cd "${BACKEND_DIR}"
    if command -v gunicorn >/dev/null 2>&1; then
        echo "[start] Django gunicorn 监听 0.0.0.0:${BACKEND_PORT}（config.wsgi:application）"
        nohup gunicorn config.wsgi:application \
            --bind "0.0.0.0:${BACKEND_PORT}" \
            --workers "${GUNICORN_WORKERS:-3}" \
            --access-logfile - >> "${BACKEND_LOG}" 2>&1 &
    else
        echo "[start] 未找到 gunicorn，回退到 python manage.py runserver"
        nohup "${PYTHON_BIN}" manage.py runserver "0.0.0.0:${BACKEND_PORT}" >> "${BACKEND_LOG}" 2>&1 &
    fi
    cd "${COZE_WORKSPACE_PATH}"
}

start_worker() {
    if [[ "${START_WORKER}" != "1" ]]; then
        echo "[start] 跳过 Celery worker（START_WORKER=${START_WORKER}）"
        return
    fi
    echo "[start] 启动 Celery worker（-A config）"
    ( cd "${BACKEND_DIR}" && nohup "${CELERY_BIN}" -A config worker -l info >> "${WORKER_LOG}" 2>&1 & )
}

start_beat() {
    if [[ "${START_BEAT}" != "1" ]]; then
        echo "[start] 跳过 Celery beat（START_BEAT=${START_BEAT}）"
        return
    fi
    echo "[start] 启动 Celery beat（-A config）"
    ( cd "${BACKEND_DIR}" && nohup "${CELERY_BIN}" -A config beat -l info >> "${BEAT_LOG}" 2>&1 & )
}

start_backend
start_worker
start_beat


start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    PORT=${DEPLOY_RUN_PORT} node dist/server.js
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
