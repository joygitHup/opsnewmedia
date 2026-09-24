"""audit_logs/middleware.py — 操作日志中间件（§6.8）。

自动记录写操作（POST/PUT/PATCH/DELETE），不阻塞请求。
GET 不记录；可按需扩展资源映射。
"""
from __future__ import annotations

import json
import logging

from .models import AuditLog

logger = logging.getLogger(__name__)

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# 路径 → resource 映射（按需扩展）
PATH_RESOURCE_MAP = {
    "auth": "auth",
    "teams": "teams",
    "accounts": "accounts",
    "content": "content",
    "ai": "ai",
    "publish": "publish",
    "materials": "materials",
    "dashboard": "dashboard",
    "reviews": "reviews",
    "integrations": "integrations",
}

SKIP_PATH_PREFIXES = (
    "/api/health",
    "/api/schema",
    "/api/docs",
    "/admin/",
    "/static/",
    "/media/",
)


class AuditLogMiddleware:
    """在响应阶段记录写操作。"""

    def __init__(self, get_response) -> None:
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            self._maybe_log(request, response)
        except Exception:  # noqa: BLE001
            logger.warning("audit_log_failed", exc_info=True)
        return response

    def _maybe_log(self, request, response) -> None:
        path = request.path
        if path.startswith(SKIP_PATH_PREFIXES):
            return
        method = request.method
        if method not in WRITE_METHODS:
            return
        if not request.user or not request.user.is_authenticated:
            return

        resource = self._resolve_resource(path)
        if resource is None:
            return

        # 取 payload（避免读 stream）
        payload: dict = {}
        try:
            if request.content_type and "json" in request.content_type.lower():
                # DRF 的 request.data 可能已被消费，用 raw body
                if hasattr(request, "body") and request.body:
                    raw = request.body.decode("utf-8", errors="ignore")[:2000]
                    try:
                        payload = json.loads(raw) or {}
                    except json.JSONDecodeError:
                        payload = {"_raw": raw}
            elif request.POST:
                payload = dict(request.POST)
        except Exception:  # noqa: BLE001
            payload = {}

        # 脱敏：移除 password / token 字段
        for key in list(payload.keys()):
            low = key.lower()
            if any(s in low for s in ("password", "token", "secret", "key")):
                payload[key] = "***"

        ip = (
            request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or request.META.get("REMOTE_ADDR")
        )
        ua = request.META.get("HTTP_USER_AGENT", "")[:500]
        request_id = getattr(request, "request_id", "") or ""

        AuditLog.objects.create(
            user=request.user,
            team_id=getattr(request.user, "current_team_id", None),
            action=method.lower(),
            resource=resource,
            resource_id=str(getattr(request, "resolver_match", None) and (
                request.resolver_match.kwargs.get("pk")
                or request.resolver_match.kwargs.get("id")
            ) or ""),
            ip=ip,
            ua=ua,
            payload=payload,
            status_code=response.status_code,
            request_id=request_id,
        )

    @staticmethod
    def _resolve_resource(path: str) -> str | None:
        # path: /api/v1/{resource}/...
        parts = path.strip("/").split("/")
        if len(parts) < 3 or parts[0] != "api" or parts[1] != "v1":
            return None
        return PATH_RESOURCE_MAP.get(parts[2])
