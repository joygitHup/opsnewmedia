"""integrations/platforms/weibo.py — 微博开放平台（占位，§6.3）。

接入流程参考 https://open.weibo.com/
完整对接需申请微博开放平台应用。本模块仅提供基类骨架。
"""
from __future__ import annotations

from typing import Any

from apps.accounts.platform_base import (
    BasePlatformAdapter,
    ContentValidation,
    PlatformStats,
    PublishResult,
)


class WeiboAdapter(BasePlatformAdapter):
    """微博适配器占位。"""

    platform_code = "weibo"
    platform_name = "微博"

    def __init__(self, **credentials: Any) -> None:
        super().__init__(
            app_key=credentials.get("app_key", ""),
            app_secret=credentials.get("app_secret", ""),
        )

    def get_authorize_url(self, state: str, redirect_uri: str) -> str:
        raise NotImplementedError("微博 OAuth 暂未接入")

    def exchange_token(self, code: str, redirect_uri: str) -> dict[str, Any]:
        raise NotImplementedError("微博 exchange_token 暂未接入")

    def publish(self, account, payload: dict[str, Any]) -> PublishResult:
        raise NotImplementedError("微博发布暂未接入")

    def get_stats(self, account) -> PlatformStats:
        raise NotImplementedError("微博数据暂未接入")

    def validate_content(self, payload: dict[str, Any]) -> ContentValidation:
        warnings: list[str] = ["微博接入中，校验规则待补"]
        content = payload.get("content", "")
        if len(content) > 140 and not payload.get("images"):
            return ContentValidation(
                ok=False, errors=["微博纯文本 ≤ 140 字，超过需配图"]
            )
        return ContentValidation(ok=True, warnings=warnings)
