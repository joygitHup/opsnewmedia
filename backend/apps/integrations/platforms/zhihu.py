"""integrations/platforms/zhihu.py — 知乎开放平台（占位，§6.3）。

接入流程参考 https://developer.zhihu.com/
完整对接需申请知乎开放平台应用。本模块仅提供基类骨架。
"""
from __future__ import annotations

from typing import Any

from apps.accounts.platform_base import (
    BasePlatformAdapter,
    ContentValidation,
    PlatformStats,
    PublishResult,
)


class ZhihuAdapter(BasePlatformAdapter):
    """知乎适配器占位。"""

    platform_code = "zhihu"
    platform_name = "知乎"

    def __init__(self, **credentials: Any) -> None:
        super().__init__(
            client_id=credentials.get("client_id", ""),
            client_secret=credentials.get("client_secret", ""),
        )

    def get_authorize_url(self, state: str, redirect_uri: str) -> str:
        raise NotImplementedError("知乎 OAuth 暂未接入")

    def exchange_token(self, code: str, redirect_uri: str) -> dict[str, Any]:
        raise NotImplementedError("知乎 exchange_token 暂未接入")

    def publish(self, account, payload: dict[str, Any]) -> PublishResult:
        raise NotImplementedError("知乎发布暂未接入")

    def get_stats(self, account) -> PlatformStats:
        raise NotImplementedError("知乎数据暂未接入")

    def validate_content(self, payload: dict[str, Any]) -> ContentValidation:
        warnings: list[str] = ["知乎接入中，校验规则待补"]
        if not payload.get("content"):
            return ContentValidation(ok=False, errors=["知乎需正文"])
        return ContentValidation(ok=True, warnings=warnings)
