"""common/permissions.py — 权限基类（§4.8 / §9.2）。

- 对象级权限用 has_object_permission
- 资源归属判断走 get_queryset + 对象权限双保险
- 团队角色权限矩阵按 ROLE_PERMISSIONS 校验
"""
from rest_framework import permissions

from .constants import TeamRole


class IsOwnerOrTeamAdmin(permissions.BasePermission):
    """对象归属：本人或团队管理员。"""

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if not user.is_authenticated:
            return False
        owner_field = getattr(obj, "author_id", None) or getattr(obj, "owner_id", None)
        if owner_field == user.id:
            return True
        # 检查团队管理员
        team_id = getattr(obj, "team_id", None)
        if team_id is None:
            return False
        return user.is_team_admin(team_id)


class IsTeamMember(permissions.BasePermission):
    """仅允许同团队成员访问。资源必须具备 team_id。"""

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if not user.is_authenticated:
            return False
        team_id = getattr(obj, "team_id", None)
        return team_id is not None and user.is_in_team(team_id)


def has_team_role(user, team_id: int, *roles: TeamRole) -> bool:
    """检查用户在指定团队的某些角色之一。"""
    if not user.is_authenticated or team_id is None:
        return False
    if "*" in roles:
        return user.is_in_team(team_id)
    return user.has_team_role(team_id, *roles)


class CanEditContent(permissions.BasePermission):
    """编辑：可创建/修改内容。"""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        if view.action in {"create", "update", "partial_update", "destroy"}:
            return request.user.is_admin_or_editor()
        return True


class CanReviewContent(permissions.BasePermission):
    """审核员：可审批内容。"""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        if view.action in {"approve", "reject", "submit"}:
            return request.user.is_admin_or_reviewer()
        return True


class CanPublish(permissions.BasePermission):
    """发布：管理员或编辑可发布。"""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        return request.user.is_admin_or_editor()
