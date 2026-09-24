"""accounts/services.py — 平台账号业务逻辑（§6.1 / §6.2）。

- create_account: 绑定账号（含 token 加密）
- update_account / delete_account
- update_account_status: 标记状态
- save_token: 调用 adapter 拿到 token 后加密入库
- refresh_account_token: 由 adapter 刷新 token
- start_oauth: 生成授权 URL（state 用 uuid 防 CSRF）
- handle_oauth_callback: 由 adapter 换 token 并落库
"""
from __future__ import annotations

import secrets
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.common.constants import AccountStatus, ErrorCode
from apps.common.exceptions import BusinessError
from apps.users.models import User

from .models import Account


def _get_adapter(platform: str):
    """延迟 import 避免循环依赖（integrations 依赖 accounts.BasePlatformAdapter）。"""
    from apps.integrations.registry import get_adapter

    adapter = get_adapter(platform)
    if adapter is None:
        raise BusinessError(
            ErrorCode.BUSINESS_ERROR, f"平台 {platform} 暂未接入"
        )
    return adapter


@transaction.atomic
def create_account(
    *,
    team_id: int,
    user: User,
    platform: str,
    name: str,
    avatar: str = "",
    followers: int = 0,
    account_group: str = "",
    platform_account_id: str = "",
    raw_token: str = "",
    token_expires_at: timezone | None = None,
    raw_extra: dict | None = None,
) -> Account:
    """绑定一个平台账号。raw_token 会被加密落库。"""
    account = Account(
        team_id=team_id,
        platform=platform,
        name=name,
        avatar=avatar,
        followers=followers,
        account_group=account_group,
        platform_account_id=platform_account_id,
        token_expires_at=token_expires_at,
        raw_extra=raw_extra or {},
        added_by=user,
    )
    if raw_token:
        account.set_token(raw_token)
    account.save()
    return account


@transaction.atomic
def update_account(
    *, account: Account, **fields: Any
) -> Account:
    """更新账号可写字段。"""
    allowed = {
        "name", "avatar", "followers",
        "account_group", "platform_account_id", "raw_extra",
    }
    for k, v in fields.items():
        if k in allowed:
            setattr(account, k, v)
    account.save()
    return account


@transaction.atomic
def delete_account(*, account: Account) -> None:
    """软删除账号。"""
    account.delete()


@transaction.atomic
def update_account_status(*, account: Account, status: str) -> Account:
    if status not in dict(AccountStatus.choices):
        raise BusinessError(ErrorCode.INVALID_PARAM, "状态不合法")
    account.status = status
    account.save(update_fields=["status", "updated_at"])
    return account


@transaction.atomic
def save_token(
    *, account: Account, raw_token: str, expires_at=None, raw_extra: dict | None = None
) -> Account:
    """更新账号 token（加密落库）。"""
    account.set_token(raw_token)
    if expires_at is not None:
        account.token_expires_at = expires_at
    if raw_extra is not None:
        account.raw_extra = {**account.raw_extra, **raw_extra}
    account.last_synced_at = timezone.now()
    account.status = AccountStatus.ACTIVE
    account.save()
    return account


@transaction.atomic
def refresh_account_token(*, account: Account) -> Account | None:
    """调用 adapter 刷新 token。返回 None 表示不可刷新。"""
    adapter = _get_adapter(account.platform)
    refreshed = adapter.refresh_token(account)
    if refreshed is None:
        return None
    raw_token = refreshed.get("access_token") or refreshed.get("token") or ""
    expires_at = refreshed.get("expires_at")
    if not raw_token:
        return None
    return save_token(
        account=account,
        raw_token=raw_token,
        expires_at=expires_at,
        raw_extra=refreshed.get("raw_extra"),
    )


# ---- OAuth 流程 ----

def start_oauth(*, platform: str, redirect_uri: str) -> dict[str, str]:
    """生成授权 URL + state。state 落 Redis 5min 由 callback 校验。"""
    adapter = _get_adapter(platform)
    state = secrets.token_urlsafe(16)
    from django.core.cache import cache
    cache.set(f"oauth:state:{state}", {"platform": platform}, timeout=300)
    url = adapter.get_authorize_url(state=state, redirect_uri=redirect_uri)
    return {"authorize_url": url, "state": state}


@transaction.atomic
def handle_oauth_callback(
    *,
    platform: str,
    code: str,
    state: str = "",
    redirect_uri: str = "",
    team_id: int | None = None,
    user: User | None = None,
) -> Account:
    """OAuth 回调：用 code 换 token，落库为 Account。"""
    adapter = _get_adapter(platform)
    # 校验 state
    if state:
        from django.core.cache import cache
        cached = cache.get(f"oauth:state:{state}")
        if not cached or cached.get("platform") != platform:
            raise BusinessError(ErrorCode.BUSINESS_ERROR, "state 校验失败")
        cache.delete(f"oauth:state:{state}")
    token_data = adapter.exchange_token(code=code, redirect_uri=redirect_uri)
    raw_token = token_data.get("access_token") or token_data.get("token") or ""
    if not raw_token:
        raise BusinessError(
            ErrorCode.PLATFORM_API_ERROR, "未获取到 access_token"
        )
    # 平台用户信息
    profile: dict[str, Any] = {}
    fetch_profile = getattr(adapter, "get_user_info", None)
    if callable(fetch_profile):
        try:
            profile = fetch_profile(token_data) or {}
        except NotImplementedError:
            profile = {}

    if team_id is None:
        if user is None:
            raise BusinessError(ErrorCode.UNAUTHORIZED, "用户未登录")
        if user.current_team_id is None:
            raise BusinessError(ErrorCode.BUSINESS_ERROR, "尚未选择团队")
        team_id = user.current_team_id

    platform_account_id = (
        profile.get("platform_account_id")
        or token_data.get("openid")
        or token_data.get("platform_account_id")
        or ""
    )
    name = profile.get("name") or token_data.get("name") or f"{platform} 账号"
    avatar = profile.get("avatar") or token_data.get("avatar") or ""

    account, created = Account.objects.update_or_create(
        team_id=team_id,
        platform=platform,
        platform_account_id=platform_account_id or "",
        defaults={
            "name": name,
            "avatar": avatar,
            "status": AccountStatus.ACTIVE,
            "raw_extra": {**token_data, **profile},
            "added_by": user,
            "last_synced_at": timezone.now(),
        },
    )
    account.set_token(raw_token)
    expires_at = token_data.get("expires_at") or token_data.get("token_expires_at")
    if expires_at is not None:
        account.token_expires_at = expires_at
    account.save()
    return account
