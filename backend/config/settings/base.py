"""base.py — 公共配置，不包含任何环境相关值。

按编码标准 §16.1 / §18.1：
- 密钥、数据库、Redis、Celery 全部走环境变量
- SECRET_KEY 禁止默认值，缺失启动报错
- dev/prod/test 从 base 继承
"""
from pathlib import Path
import os

import environ

# 项目根目录：backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# 环境变量加载：优先 .env，缺失则读系统环境变量
env = environ.Env(
    DJANGO_SETTINGS_MODULE=(str, "config.settings.dev"),
    ENV=(str, "dev"),
    SECRET_KEY=(str, ""),
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
)
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    env.read_env(_env_file)

# ---- 核心 ----
SECRET_KEY = env("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY 未配置，请在 .env 中设置 SECRET_KEY。")

DEBUG = env("DEBUG")
ENV = env("ENV")
ALLOWED_HOSTS = env("ALLOWED_HOSTS") or ["localhost", "127.0.0.1"]

# ---- 应用 ----
DJANGO_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.admin",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "django_celery_beat",
]

LOCAL_APPS = [
    "apps.common",
    "apps.users",
    "apps.teams",
    "apps.accounts",
    "apps.integrations",
    "apps.content",
    "apps.ai",
    "apps.publish",
    "apps.materials",
    "apps.dashboard",
    "apps.reviews",
    "apps.audit_logs",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ---- 中间件（顺序遵循 §18.4）----
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.common.middleware.RequestIDMiddleware",
    "apps.audit_logs.middleware.AuditLogMiddleware",
]

# ---- URLs ----
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---- 模板 ----
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---- 数据库 ----
DATABASES = {
    "default": env.db_url(
        "DATABASE_URL",
        default="postgres://opsnewmedia:opsnewmedia@127.0.0.1:5432/opsnewmedia",
    )
}
# 连接池化：§20.2
DATABASES["default"]["CONN_MAX_AGE"] = 600
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

# ---- 自定义用户模型 ----
AUTH_USER_MODEL = "users.User"

# ---- 密码校验 ----
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---- i18n ----
LANGUAGE_CODE = "zh-hans"
TIME_ZONE = "Asia/Shanghai"
USE_I18N = True
USE_TZ = True

# ---- 静态文件 ----
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ---- Default primary key field type ----
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---- DRF 全局配置 ----
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardPagination",
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.common.exceptions.exception_handler",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
    },
}

# ---- SimpleJWT ----
from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_LIFETIME_MINUTES", 15)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("JWT_REFRESH_LIFETIME_DAYS", 7)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ---- CORS 白名单（§21.1 不开 CORS_ALLOW_ALL_ORIGINS）----
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5000", "http://127.0.0.1:5000"],
)
CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ["X-Request-Id"]

# ---- 邮件 SMTP ----
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@opsnewmedia.test")

# ---- 前端地址（邮件链接等）----
FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://localhost:5000")

# ---- Spectacular ----
SPECTACULAR_SETTINGS = {
    "TITLE": "稿定分发 API",
    "DESCRIPTION": "多平台内容分发工具后端 API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# ---- Redis / Cache ----
CACHES = {
    "default": env.cache_url(
        "REDIS_CACHE_URL",
        default="redis://127.0.0.1:6379/1",
    )
}
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# ---- Celery ----
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="amqp://guest:guest@127.0.0.1:5672//")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://127.0.0.1:6379/2")
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TIME_LIMIT = 60 * 30  # 单任务 30 分钟超时
CELERY_TASK_SOFT_TIME_LIMIT = 60 * 25
CELERY_TASK_DEFAULT_QUEUE = "opsnewmedia"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# ---- Celery Beat 定时任务 ----
try:
    from config.beat_schedule import CELERY_BEAT_SCHEDULE as _BEAT_SCHEDULE  # noqa: E402
except ImportError:  # pragma: no cover
    _BEAT_SCHEDULE = {}
CELERY_BEAT_SCHEDULE = _BEAT_SCHEDULE

# ---- MinIO ----
MINIO_ENDPOINT = env("MINIO_ENDPOINT", default="127.0.0.1:9000")
MINIO_ACCESS_KEY = env("MINIO_ACCESS_KEY", default="minioadmin")
MINIO_SECRET_KEY = env("MINIO_SECRET_KEY", default="minioadmin")
MINIO_SECURE = env.bool("MINIO_SECURE", default=False)
MINIO_BUCKET = env("MINIO_BUCKET", default="opsnewmedia")

# ---- 平台 Token 加密密钥 ----
PLATFORM_TOKEN_KEY = env("PLATFORM_TOKEN_KEY", default="")

# ---- 平台凭据 ----
WECHAT_MP_APPID = env("WECHAT_MP_APPID", default="")
WECHAT_MP_SECRET = env("WECHAT_MP_SECRET", default="")
XIAOHONGSHU_APP_ID = env("XIAOHONGSHU_APP_ID", default="")
XIAOHONGSHU_APP_SECRET = env("XIAOHONGSHU_APP_SECRET", default="")

# ---- AI ----
AI_API_BASE = env("AI_API_BASE", default="https://api.openai.com/v1")
AI_API_KEY = env("AI_API_KEY", default="")
AI_MODEL = env("AI_MODEL", default="gpt-4o-mini")

# ---- 日志 ----
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"time":"%(asctime)s","level":"%(levelname)s",'
            '"logger":"%(name)s","message":"%(message)s"}',
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {"level": "WARNING"},
        "apps": {"level": "INFO"},
    },
}

# ---- 登录/安全头（生产覆盖）----
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

# ---- 文件上传大小限制（图片/视频/音频素材，同源代理上传）----
DATA_UPLOAD_MAX_MEMORY_SIZE = 200 * 1024 * 1024  # 200MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 200 * 1024 * 1024
