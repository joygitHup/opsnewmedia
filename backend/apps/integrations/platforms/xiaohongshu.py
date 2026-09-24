"""integrations/platforms/xiaohongshu.py — 小红书 OAuth2 + 笔记 API（§6.3）。

接口参考：
- 授权: https://open.xiaohongshu.com/api/tools/apps
- 发布笔记: https://open.xiaohongshu.com/api/note/v2/addNoteV2
- 数据: https://open.xiaohongshu.com/api/note/userstat

注：完整对接需申请小红书开放平台应用，本模块提供标准实现骨架。
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone as dt_tz
from typing import Any
from urllib.parse import urlencode

import httpx
from django.conf import settings

from apps.accounts.platform_base import (
    BasePlatformAdapter,
    ContentValidation,
    PlatformStats,
    PublishResult,
)


XHS_OAUTH_BASE = "https://open.xiaohongshu.com/oauth2/authorize"
XHS_TOKEN_URL = "https://open.xiaohongshu.com/oauth2/access_token"
XHS_USERINFO_URL = "https://open.xiaohongshu.com/api/user/me"
XHS_NOTE_PUBLISH_URL = "https://open.xiaohongshu.com/api/note/v2/addNoteV2"
XHS_STATS_URL = "https://open.xiaohongshu.com/api/note/userstat"


class XiaohongshuAdapter(BasePlatformAdapter):
    """小红书适配器。"""

    platform_code = "xiaohongshu"
    platform_name = "小红书"

    def __init__(self, **credentials: Any) -> None:
        super().__init__(
            app_id=credentials.get("app_id") or settings.XIAOHONGSHU_APP_ID,
            app_secret=credentials.get("app_secret")
            or settings.XIAOHONGSHU_APP_SECRET,
        )

    @property
    def app_id(self) -> str:
        return self.credentials.get("app_id", "")

    @property
    def app_secret(self) -> str:
        return self.credentials.get("app_secret", "")

    # ---- 授权 ----
    def get_authorize_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "app_id": self.app_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "state": state,
            "scope": "note_publish user_info",
        }
        return f"{XHS_OAUTH_BASE}?{urlencode(params)}"

    def exchange_token(self, code: str, redirect_uri: str) -> dict[str, Any]:
        params = {
            "app_id": self.app_id,
            "app_secret": self.app_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
        }
        with httpx.Client(timeout=10) as client:
            resp = client.post(XHS_TOKEN_URL, json=params)
        data = resp.json()
        if not data.get("success", True) or "access_token" not in data:
            raise RuntimeError(
                f"xiaohongshu exchange_token 失败: {data.get('message')}"
            )
        expires_at = datetime.now(dt_tz.utc) + timedelta(
            seconds=int(data.get("expires_in", 86400))
        )
        return {
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token", ""),
            "platform_account_id": data.get("openid", ""),
            "expires_at": expires_at,
            "raw_extra": data,
        }

    def get_user_info(self, token_data: dict[str, Any]) -> dict[str, Any]:
        access_token = token_data["access_token"]
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                XHS_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
        data = resp.json()
        if not data.get("success", True):
            raise RuntimeError(f"xiaohongshu get_user_info 失败: {data}")
        info = data.get("data", {}) or {}
        return {
            "platform_account_id": info.get("openid", ""),
            "name": info.get("nickname", ""),
            "avatar": info.get("avatar", ""),
            "raw": info,
        }

    def refresh_token(self, account) -> dict[str, Any] | None:
        raw_extra = account.raw_extra or {}
        refresh_token = raw_extra.get("refresh_token")
        if not refresh_token:
            return None
        params = {
            "app_id": self.app_id,
            "app_secret": self.app_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }
        with httpx.Client(timeout=10) as client:
            resp = client.post(XHS_TOKEN_URL, json=params)
        data = resp.json()
        if not data.get("success", True) or "access_token" not in data:
            return None
        expires_at = datetime.now(dt_tz.utc) + timedelta(
            seconds=int(data.get("expires_in", 86400))
        )
        return {
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token", refresh_token),
            "expires_at": expires_at,
            "raw_extra": data,
        }

    # ---- 发布 ----
    def publish(self, account, payload: dict[str, Any]) -> PublishResult:
        access_token = account.get_token()
        body = {
            "title": payload.get("title", "")[:20],  # 小红书标题 ≤ 20
            "desc": payload.get("content", "")[:1000],  # 正文 ≤ 1000
            "note_type": "normal",
            "images": payload.get("images", []),
            "video": payload.get("video"),
            "tags": payload.get("tags", []),
            "at_users": payload.get("at_users", []),
            "cover": payload.get("cover"),
        }
        with httpx.Client(timeout=20) as client:
            resp = client.post(
                XHS_NOTE_PUBLISH_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                json=body,
            )
        data = resp.json()
        if not data.get("success", True):
            return PublishResult(
                success=False,
                message=data.get("message", "发布失败"),
                raw_response=data,
            )
        note_id = (data.get("data") or {}).get("note_id", "")
        return PublishResult(
            success=True,
            platform_content_id=note_id,
            message="笔记已发布",
            raw_response=data,
        )

    # ---- 数据 ----
    def get_stats(self, account) -> PlatformStats:
        access_token = account.get_token()
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                XHS_STATS_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
        data = resp.json()
        if not data.get("success", True):
            return PlatformStats()
        stats = data.get("data", {}) or {}
        return PlatformStats(
            views=stats.get("view_count", 0),
            likes=stats.get("like_count", 0),
            comments=stats.get("comment_count", 0),
            shares=stats.get("share_count", 0),
            followers=stats.get("follower_count", 0),
            raw=stats,
        )

    # ---- 校验 ----
    def validate_content(self, payload: dict[str, Any]) -> ContentValidation:
        errors: list[str] = []
        warnings: list[str] = []
        title = payload.get("title", "")
        if len(title) > 20:
            errors.append("小红书标题最长 20 字")
        content = payload.get("content", "")
        if len(content) > 1000:
            errors.append("小红书正文最长 1000 字")
        images = payload.get("images") or []
        if not images:
            warnings.append("小红书建议至少 1 张图片")
        return ContentValidation(ok=not errors, errors=errors, warnings=warnings)
