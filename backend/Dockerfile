# 多阶段构建（§24.1）
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 系统依赖（psycopg/cryptography 需要 libpq/build-essential）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# 非 root 用户（§24.1）
RUN useradd -m -u 10001 appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# 默认开发命令；生产应覆盖为 gunicorn
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
