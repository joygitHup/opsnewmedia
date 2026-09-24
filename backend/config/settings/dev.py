"""dev.py — 开发环境配置。"""
from .base import *  # noqa: F401,F403

DEBUG = True

# 开发阶段允许更多 host
ALLOWED_HOSTS = ["*"]

# 开发阶段放宽限流
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # type: ignore[name-defined]  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "anon": "10000/hour",
        "user": "10000/hour",
    },
}

# 开发阶段 CSRF 关闭（前后端分离 + JWT）
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
]

# 日志级别放宽
LOGGING["loggers"]["apps"]["level"] = "DEBUG"  # type: ignore[index]  # noqa: F405
