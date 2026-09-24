"""audit_logs/views.py — 操作日志视图（只读）。"""
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError
from apps.common.pagination import StandardPagination

from .models import AuditLog
from .serializers import AuditLogDetailSerializer, AuditLogListSerializer


class AuditLogListView(generics.ListAPIView):
    pagination_class = StandardPagination
    permission_classes = [IsAuthenticated]
    filterset_fields = ["action", "resource", "user", "team"]
    search_fields = ["resource_id", "ua", "request_id"]
    ordering_fields = ["created_at", "action"]

    def get_queryset(self):
        user = self.request.user
        # 仅团队 admin 可查看团队日志；普通用户看自己的
        team_id = self.request.query_params.get("teamId") or (
            user.current_team_id if user.current_team_id else None
        )
        if not team_id:
            raise BusinessError(ErrorCode.BUSINESS_ERROR, "尚未选择团队")
        is_admin = user.is_team_admin(team_id)
        qs = AuditLog.objects.select_related("user", "team")
        if is_admin:
            qs = qs.filter(team_id=team_id)
        else:
            qs = qs.filter(user=user, team_id=team_id)
        return qs

    def get_serializer_class(self):
        return AuditLogListSerializer

    @extend_schema(summary="操作日志列表")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class AuditLogDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AuditLog.objects.select_related("user", "team")
    serializer_class = AuditLogDetailSerializer

    @extend_schema(summary="操作日志详情")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
