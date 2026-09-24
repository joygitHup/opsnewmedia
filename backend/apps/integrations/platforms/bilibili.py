"""integrations/platforms/bilibili.py — B站开放平台（占位，§6.3）。

接入流程参考 https://openhome.bilibili.com/
完整对接需申请B站开放平台应用。本模块仅提供基类骨架。
"""
from __future__ import annotations

from typing import Any

from apps.accounts.platform_base import (
    BasePlatformAdapter,
    ContentValidation,
    PlatformStats,
    PublishResult,
)


class BilibiliAdapter(BasePlatformAdapter):
    """B站适配器占位。"""

    platform_code = "bilibili"
    platform_name = "B站"

    def __init__(self, **credentials: Any) -> None:
        super().__init__(
            app_id=credentials.get("app_id", ""),
            app_secret=credentials.get("app_secret", ""),
        )

    def get_authorize_url(self, state: str, redirect_uri: str) -> str:
        raise NotImplementedError("B站 OAuth 暂未接入")

    def exchange_token(self, code: str, redirect_uri: str) -> dict[str, Any]:
        raise NotImplementedError("B站 exchange_token 暂未接入")

    def publish(self, account, payload: dict[str, Any]) -> PublishResult:
        raise NotImplementedError("B站发布暂未接入")

    def get_stats(self, account) -> PlatformStats:
        raise NotImplementedError("B站数据暂未接入")

    def validate_content(self, payload: dict[str, Any]) -> ContentValidation:
        warnings: list[str] = ["B站接入中，校验规则待补"]
        if not payload.get("video"):
            return ContentValidation(ok=False, errors=["B站需上传视频"])
        return ContentValidation(ok=True, warnings=warnings)
