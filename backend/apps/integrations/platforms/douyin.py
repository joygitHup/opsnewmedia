"""integrations/platforms/douyin.py — 抖音开放平台（占位，§6.3）。

接入流程参考 https://developer.open-douyin.com/
完整对接需申请抖音开放平台应用。本模块仅提供基类骨架，未实装接口抛 NotImplementedError。
"""
from __future__ import annotations

from typing import Any

from apps.accounts.platform_base import (
    BasePlatformAdapter,
    ContentValidation,
    PlatformStats,
    PublishResult,
)


class DouyinAdapter(BasePlatformAdapter):
    """抖音适配器占位。"""

    platform_code = "douyin"
    platform_name = "抖音"

    def __init__(self, **credentials: Any) -> None:
        super().__init__(
            client_key=credentials.get("client_key", ""),
            client_secret=credentials.get("client_secret", ""),
        )

    def get_authorize_url(self, state: str, redirect_uri: str) -> str:
        raise NotImplementedError("抖音 OAuth 暂未接入，敬请期待")

    def exchange_token(self, code: str, redirect_uri: str) -> dict[str, Any]:
        raise NotImplementedError("抖音 exchange_token 暂未接入")

    def publish(self, account, payload: dict[str, Any]) -> PublishResult:
        raise NotImplementedError("抖音发布暂未接入")

    def get_stats(self, account) -> PlatformStats:
        raise NotImplementedError("抖音数据暂未接入")

    def validate_content(self, payload: dict[str, Any]) -> ContentValidation:
        warnings: list[str] = ["抖音接入中，校验规则待补"]
        if not payload.get("video"):
            return ContentValidation(ok=False, errors=["抖音需上传视频"])
        return ContentValidation(ok=True, warnings=warnings)
