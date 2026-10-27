"""common/team_scope.py — 团队作用域解析与成员校验。

所有按团队过滤/操作的接口都必须通过这里取 team_id，避免前端传任意 teamId
越权读取其他团队的数据。显式传入的 teamId 必须校验为当前用户的 ACTIVE 成员。
"""
from __future__ import annotations

from rest_framework.request import Request

from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError


def _is_active_member(user, team_id: int) -> bool:
    """是否为该团队的 ACTIVE 成员（超级管理员放行，便于运维排查）。"""
    if getattr(user, "is_superuser", False):
        return True
    from apps.teams.models import TeamMember, TeamMemberStatus

    return TeamMember.objects.filter(
        team_id=team_id,
        user=user,
        status=TeamMemberStatus.ACTIVE,
    ).exists()


def resolve_team_id(request: Request, *, required: bool = True) -> int | None:
    """解析当前请求的 team_id，并校验成员归属。

    优先级：query / body 中的 teamId > 用户 current_team_id。
    - 显式传 teamId：必须是该团队 ACTIVE 成员，否则抛 403
    - 未传：取 current_team_id，若已不是成员则视为无团队
    - required=True 且无可用团队：抛业务错误「尚未选择团队」
    """
    raw = request.query_params.get("teamId") or request.data.get("teamId")

    cache = getattr(request, "_team_scope_cache", None)
    if cache is None:
        cache = {}
        request._team_scope_cache = cache

    key = ("explicit", str(raw)) if raw else ("current", "")
    if key in cache:
        return cache[key]

    if raw:
        try:
            team_id = int(raw)
        except (TypeError, ValueError) as exc:
            raise BusinessError(ErrorCode.INVALID_PARAM, "teamId 非法") from exc
        if not _is_active_member(request.user, team_id):
            raise BusinessError(
                ErrorCode.FORBIDDEN, "无权访问该团队", status_code=403
            )
        cache[key] = team_id
        return team_id

    current = getattr(request.user, "current_team_id", None)
    if current and _is_active_member(request.user, current):
        cache[key] = current
        return current

    if required:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "尚未选择团队")
    cache[key] = None
    return None
