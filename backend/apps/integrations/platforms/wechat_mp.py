"""integrations/platforms/wechat_mp.py — 公众号开放平台 API（§6.3）。

接口参考：
- 授权: https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2.0/api/Before_Enabling_Procedure/Authorization_Interface.html
- 草稿箱/发布: https://developers.weixin.qq.com/doc/offiaccount/Draft_Box/Add_draft.html
- 数据: https://developers.weixin.qq.com/doc/offiaccount/Analytics/User_Analysis_Data_Interface.html

注：完整对接需申请微信开放平台第三方平台账号，本模块提供标准实现骨架。
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


WECHAT_OAUTH_BASE = "https://open.weixin.qq.com/connect/qrconnect"
WECHAT_TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token"
WECHAT_USERINFO_URL = "https://api.weixin.qq.com/sns/userinfo"
WECHAT_DRAFT_ADD_URL = "https://api.weixin.qq.com/cgi-bin/draft/add"
WECHAT_FREEPUBLISH_URL = "https://api.weixin.qq.com/cgi-bin/freepublish/submit"
WECHAT_USER_ANALYTICS_URL = "https://api.weixin.qq.com/datacube/getusersummary"


class WechatMpAdapter(BasePlatformAdapter):
    """公众号适配器。

    凭据从 settings.WECHAT_MP_APPID / settings.WECHAT_MP_SECRET 注入。
    """

    platform_code = "wechat"
    platform_name = "公众号"

    def __init__(self, **credentials: Any) -> None:
        super().__init__(
            appid=credentials.get("appid") or settings.WECHAT_MP_APPID,
            secret=credentials.get("secret") or settings.WECHAT_MP_SECRET,
        )

    @property
    def appid(self) -> str:
        return self.credentials.get("appid", "")

    @property
    def secret(self) -> str:
        return self.credentials.get("secret", "")

    # ---- 授权 ----
    def get_authorize_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "appid": self.appid,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "snsapi_userinfo",
            "state": state,
        }
        return f"{WECHAT_OAUTH_BASE}?{urlencode(params)}#wechat_redirect"

    def exchange_token(self, code: str, redirect_uri: str) -> dict[str, Any]:
        params = {
            "appid": self.appid,
            "secret": self.secret,
            "code": code,
            "grant_type": "authorization_code",
        }
        with httpx.Client(timeout=10) as client:
            resp = client.get(WECHAT_TOKEN_URL, params=params)
        data = resp.json()
        if "access_token" not in data:
            raise RuntimeError(
                f"wechat exchange_token 失败: {data.get('errmsg')} "
                f"({data.get('errcode')})"
            )
        expires_at = datetime.now(dt_tz.utc) + timedelta(
            seconds=int(data.get("expires_in", 7200))
        )
        return {
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token", ""),
            "openid": data.get("openid", ""),
            "unionid": data.get("unionid", ""),
            "expires_at": expires_at,
            "raw_extra": data,
        }

    def get_user_info(self, token_data: dict[str, Any]) -> dict[str, Any]:
        access_token = token_data["access_token"]
        openid = token_data.get("openid", "")
        params = {
            "access_token": access_token,
            "openid": openid,
            "lang": "zh_CN",
        }
        with httpx.Client(timeout=10) as client:
            resp = client.get(WECHAT_USERINFO_URL, params=params)
        data = resp.json()
        if "errcode" in data and data["errcode"]:
            raise RuntimeError(
                f"wechat get_user_info 失败: {data.get('errmsg')}"
            )
        return {
            "platform_account_id": openid,
            "name": data.get("nickname", ""),
            "avatar": data.get("headimgurl", ""),
            "raw": data,
        }

    def refresh_token(self, account) -> dict[str, Any] | None:
        raw_extra = account.raw_extra or {}
        refresh_token = raw_extra.get("refresh_token")
        if not refresh_token:
            return None
        params = {
            "appid": self.appid,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }
        with httpx.Client(timeout=10) as client:
            resp = client.get(WECHAT_TOKEN_URL, params=params)
        data = resp.json()
        if "access_token" not in data:
            return None
        expires_at = datetime.now(dt_tz.utc) + timedelta(
            seconds=int(data.get("expires_in", 7200))
        )
        return {
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token", refresh_token),
            "expires_at": expires_at,
            "raw_extra": data,
        }

    # ---- 发布 ----
    def publish(self, account, payload: dict[str, Any]) -> PublishResult:
        """先加草稿，再调 freepublish 发布。"""
        raw_token = account.get_token()
        articles = payload.get("articles") or [{
            "title": payload.get("title", ""),
            "content": payload.get("content", ""),
            "thumb_media_id": payload.get("thumb_media_id", ""),
            "author": payload.get("author", ""),
            "digest": payload.get("digest", ""),
        }]
        with httpx.Client(timeout=15) as client:
            add_resp = client.post(
                WECHAT_DRAFT_ADD_URL,
                params={"access_token": raw_token},
                json={"articles": articles},
            )
            add_data = add_resp.json()
            if "media_id" not in add_data:
                return PublishResult(
                    success=False,
                    message=add_data.get("errmsg", "草稿创建失败"),
                    raw_response=add_data,
                )
            media_id = add_data["media_id"]
            pub_resp = client.post(
                WECHAT_FREEPUBLISH_URL,
                params={"access_token": raw_token},
                json={"media_id": media_id},
            )
            pub_data = pub_resp.json()
        if pub_data.get("errcode") not in (0, None):
            return PublishResult(
                success=False,
                message=pub_data.get("errmsg", "发布失败"),
                raw_response=pub_data,
            )
        return PublishResult(
            success=True,
            platform_content_id=pub_data.get("publish_id", media_id),
            message="已提交到发布队列",
            raw_response=pub_data,
        )

    # ---- 数据 ----
    def get_stats(self, account) -> PlatformStats:
        raw_token = account.get_token()
        today = datetime.now(dt_tz.utc).date()
        params = {
            "access_token": raw_token,
            "begin_date": (today - timedelta(days=1)).strftime("%Y%m%d"),
            "end_date": today.strftime("%Y%m%d"),
        }
        with httpx.Client(timeout=10) as client:
            resp = client.post(WECHAT_USER_ANALYTICS_URL, params=params, json={})
        data = resp.json() or {}
        followers = 0
        for item in data.get("list", []):
            followers += item.get("cumulate_user", 0)
        return PlatformStats(followers=followers, raw=data)

    # ---- 校验 ----
    def validate_content(self, payload: dict[str, Any]) -> ContentValidation:
        errors: list[str] = []
        warnings: list[str] = []
        title = payload.get("title", "")
        if not title:
            errors.append("标题必填")
        if len(title) > 64:
            errors.append("公众号标题最长 64 字")
        content = payload.get("content", "")
        if len(content) < 20:
            warnings.append("内容较短，建议补充")
        return ContentValidation(ok=not errors, errors=errors, warnings=warnings)
