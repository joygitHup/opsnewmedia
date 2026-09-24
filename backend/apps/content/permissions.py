"""content/permissions.py — 内容权限（§4.8）。"""
from rest_framework import permissions


class CanManageContent(permissions.BasePermission):
    """管理内容（创建/更新/删除/回滚）需 admin 或 editor。"""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        if view.action in {"list", "retrieve", "preview", "versions"}:
            return True
        return request.user.is_admin_or_editor()

    def has_object_permission(self, request, view, obj) -> bool:
        if view.action in {"list", "retrieve", "preview", "versions"}:
            return request.user.is_in_team(obj.team_id)
        return request.user.is_team_admin(obj.team_id) or (
            obj.author_id == request.user.id
        ) or request.user.is_admin_or_editor()
