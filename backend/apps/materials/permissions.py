"""materials/permissions.py — 素材权限（§4.8）。"""
from rest_framework import permissions


class CanManageMaterial(permissions.BasePermission):
    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        if view.action in {"list", "retrieve", "upload_url"}:
            return True
        return request.user.is_admin_or_editor()

    def has_object_permission(self, request, view, obj) -> bool:
        if view.action in {"list", "retrieve"}:
            return request.user.is_in_team(obj.team_id)
        return request.user.is_team_admin(obj.team_id) or (
            obj.uploader_id == request.user.id
        ) or request.user.is_admin_or_editor()
