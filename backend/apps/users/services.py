"""users/services.py — 鉴权业务逻辑（§5.1）。

副作用：创建用户、签发/黑名单 JWT。返回模型或 token 字典。
"""
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError
from .models import User


def _generate_tokens(user: User) -> dict:
    """签发 access + refresh。"""
    refresh = RefreshToken.for_user(user)
    return {
        "accessToken": str(refresh.access_token),
        "refreshToken": str(refresh),
        "tokenType": "Bearer",
    }


@transaction.atomic
def register_user(*, email: str, password: str, name: str = "") -> tuple[User, dict]:
    """注册用户并自动创建个人默认团队。"""
    from apps.teams.services import create_default_team
    user = User(email=email, name=name or "")
    user.set_password(password)
    user.save()
    # 注册即默认创建一个个人团队
    team = create_default_team(owner=user, name=f"{user.display_name}的工作空间")
    user.current_team = team
    user.save(update_fields=["current_team"])
    return user, _generate_tokens(user)


def login_user(*, email: str, password: str) -> tuple[User, dict]:
    """邮箱 + 密码登录。"""
    user = User.objects.filter(email=email).first()
    if user is None or not user.check_password(password):
        raise BusinessError(
            ErrorCode.UNAUTHORIZED,
            "邮箱或密码错误",
            status_code=401,
        )
    if not user.is_active:
        raise BusinessError(ErrorCode.FORBIDDEN, "账号已被禁用", status_code=403)
    return user, _generate_tokens(user)


def logout_user(refresh: str) -> None:
    """登出：将 refresh token 加入黑名单。"""
    try:
        token = RefreshToken(refresh)
        token.blacklist()
    except Exception:
        raise BusinessError(ErrorCode.TOKEN_INVALID, "refresh token 无效")


def refresh_token(refresh: str) -> dict:
    """使用 refresh token 换取新的 access + refresh。"""
    try:
        token = RefreshToken(refresh)
        # SimpleJWT 配置 ROTATE_REFRESH_TOKENS=True 时，token.verify() 校验有效性
        token.blacklist()
        new_refresh = RefreshToken.for_user(token.user)
    except Exception:
        raise BusinessError(ErrorCode.TOKEN_INVALID, "refresh token 无效或已过期")
    return {
        "accessToken": str(new_refresh.access_token),
        "refreshToken": str(new_refresh),
        "tokenType": "Bearer",
    }


def update_profile(user: User, *, name: str | None = None, avatar: str | None = None) -> User:
    if name is not None:
        user.name = name
    if avatar is not None:
        user.avatar = avatar
    user.save(update_fields=["name", "avatar", "updated_at"])
    return user


def change_password(user: User, *, old_password: str, new_password: str) -> None:
    if not user.check_password(old_password):
        raise BusinessError(ErrorCode.INVALID_PARAM, "原密码错误")
    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])
