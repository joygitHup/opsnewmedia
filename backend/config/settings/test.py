"""test.py — 测试环境配置。"""
from .base import *  # noqa: F401,F403

# 测试阶段使用 SQLite 内存数据库，避免依赖 PG
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    },
}

# 密码加速
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# 关闭限流
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # type: ignore[name-defined]  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "anon": None,
        "user": None,
    },
}

# 不依赖外部 Redis
CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
}
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
