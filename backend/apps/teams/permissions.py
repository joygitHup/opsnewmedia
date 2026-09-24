"""teams/permissions.py — 团队级权限校验。"""
from rest_framework import permissions

from apps.common.constants import TeamRole


class IsTeamAdmin(permissions.BasePermission):
    """团队管理员：可管理团队设置与成员。"""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        team_id = view.kwargs.get("team_id") or request.data.get("team_id")
        if team_id is None and view.action in {"create"}:
            return True
        return request.user.has_team_role(team_id, TeamRole.ADMIN) if team_id else True


class IsTeamMember(permissions.BasePermission):
    """团队成员：可查看团队信息。"""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        team_id = view.kwargs.get("team_id")
        return request.user.is_in_team(team_id) if team_id else True
