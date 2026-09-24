"""prod.py — 生产环境配置。按 §16.1 全部走环境变量。"""
from .base import *  # noqa: F401,F403

DEBUG = False

# 安全头（§21.2）
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# 生产限流（§19.3）
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # type: ignore[name-defined]  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
    },
}
