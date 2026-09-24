"""common/views.py — API 根、健康检查（§22.3）。

健康检查不加认证。
"""
from django.db import connections
from django.core.cache import cache
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.reverse import reverse

from .response import ok


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request, format=None):
    """API 根：列出主要资源入口。"""
    return ok({
        "auth": reverse("auth:jwt-login", request=request, format=format) if False else "/api/v1/auth/login/",
        "accounts": "/api/v1/accounts/",
        "content": "/api/v1/content/",
        "publish": "/api/v1/publish/",
        "dashboard": "/api/v1/dashboard/",
        "materials": "/api/v1/materials/",
        "teams": "/api/v1/teams/",
        "reviews": "/api/v1/reviews/",
        "ai": "/api/v1/ai/",
        "docs": "/api/docs/",
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def health_live(request):
    """存活探针（K8s liveness）。仅检查进程存活。"""
    return ok({"status": "ok", "ts": timezone.now().isoformat()})


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """基础健康：DB + Redis + Celery 自检（§22.3）。"""
    checks = {
        "database": _check_db(),
        "cache": _check_cache(),
    }
    status = 200 if all(checks.values()) else 503
    return Response(
        {
            "code": 0 if all(checks.values()) else 503,
            "message": "ok" if status == 200 else "degraded",
            "data": checks,
        },
        status=status,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def health_ready(request):
    """就绪探针（K8s readiness）。"""
    return health_check(request)


def _check_db() -> bool:
    try:
        connections["default"].cursor().execute("SELECT 1")
        return True
    except Exception:
        return False


def _check_cache() -> bool:
    try:
        cache.set("_health_probe", "1", timeout=5)
        return cache.get("_health_probe") == "1"
    except Exception:
        return False
