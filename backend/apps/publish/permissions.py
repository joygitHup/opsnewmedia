"""publish/permissions.py — 发布权限（§4.8）。"""
from rest_framework import permissions


class CanManagePublish(permissions.BasePermission):
    """发布任务（创建/重试/取消）需 admin 或 editor。"""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        if view.action in {"list", "retrieve"}:
            return True
        return request.user.is_admin_or_editor()

    def has_object_permission(self, request, view, obj) -> bool:
        if view.action in {"list", "retrieve"}:
            return request.user.is_in_team(obj.team_id)
        return request.user.is_team_admin(obj.team_id) or (
            obj.created_by_id == request.user.id
        ) or request.user.is_admin_or_editor()
