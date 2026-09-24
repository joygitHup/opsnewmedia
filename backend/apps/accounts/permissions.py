"""accounts/permissions.py — 账号权限（§4.8）。"""
from rest_framework import permissions

from apps.common.constants import TeamRole


class CanManageAccounts(permissions.BasePermission):
    """管理账号（绑定/解绑/刷新 Token）需 admin 或 editor。"""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        if view.action in {"list", "retrieve", "oauth_start", "status"}:
            return True
        return request.user.is_admin_or_editor()


class IsAccountTeamAdmin(permissions.BasePermission):
    """绑定/解绑账号：仅团队管理员。"""

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if not user.is_authenticated:
            return False
        return user.is_team_admin(obj.team_id)


def can_edit_account(user, team_id: int) -> bool:
    return user.has_team_role(
        team_id, TeamRole.ADMIN, TeamRole.EDITOR
    )
