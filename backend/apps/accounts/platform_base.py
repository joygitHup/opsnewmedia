"""accounts/platform_base.py — 平台适配器抽象基类（§6.1）。

- 各平台的具体适配器实现（apps/integrations/platforms/*.py）继承此基类
- 提供 OAuth 授权 / Token 刷新 / 发布 / 数据抓取 / 内容校验 五类方法
- 未实现的方法抛 NotImplementedError，由各平台按能力实现
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PublishResult:
    """发布结果。"""

    success: bool
    platform_content_id: str = ""
    message: str = ""
    raw_response: dict = field(default_factory=dict)


@dataclass
class PlatformStats:
    """平台统计数据。"""

    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    followers: int = 0
    raw: dict = field(default_factory=dict)


@dataclass
class ContentValidation:
    """内容合规性校验结果。"""

    ok: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class BasePlatformAdapter:
    """平台适配器抽象基类。

    子类必须实现：
        - platform_code: 平台标识（与 PlatformType 一致）
        - get_authorize_url(state: str) -> str
        - exchange_token(code: str) -> dict[str, Any]
        - refresh_token(account) -> dict[str, Any] | None
        - publish(account, payload) -> PublishResult
        - get_stats(account) -> PlatformStats
        - validate_content(payload) -> ContentValidation
    """

    platform_code: str = ""
    platform_name: str = ""

    def __init__(self, **credentials: Any) -> None:
        """注入该平台所需的凭据（appid / secret 等）。"""
        self.credentials = credentials

    # ---- 授权 ----
    def get_authorize_url(self, state: str, redirect_uri: str) -> str:
        raise NotImplementedError(
            f"{self.platform_code}: OAuth 授权 URL 未实现"
        )

    def exchange_token(self, code: str, redirect_uri: str) -> dict[str, Any]:
        """用 code 换 access_token。返回原始字段，由调用方持久化。"""
        raise NotImplementedError(
            f"{self.platform_code}: exchange_token 未实现"
        )

    def refresh_token(self, account) -> dict[str, Any] | None:
        """刷新 token。返回新的 token 字段 dict 或 None 表示不可刷新。"""
        return None

    # ---- 发布 ----
    def publish(self, account, payload: dict[str, Any]) -> PublishResult:
        raise NotImplementedError(f"{self.platform_code}: publish 未实现")

    # ---- 数据 ----
    def get_stats(self, account) -> PlatformStats:
        raise NotImplementedError(f"{self.platform_code}: get_stats 未实现")

    # ---- 内容校验 ----
    def validate_content(self, payload: dict[str, Any]) -> ContentValidation:
        """子类按平台限制（标题长度、图片数量等）做校验。"""
        return ContentValidation(ok=True)
