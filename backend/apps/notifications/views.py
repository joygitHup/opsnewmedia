"""notifications/views.py — 通知消息视图。

/api/v1/notifications/
  GET /                    通知列表（支持 type / isRead 筛选）
  GET /unread-count/       未读数
  POST /read-all/          全部标记已读（可带 type）
  POST /{id}/read/         单条标记已读
"""
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import serializers as drf_serializers
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.constants import NotificationType
from apps.common.pagination import StandardPagination
from apps.common.response import ok

from . import services
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(ListAPIView):
    """通知列表：仅返回当前用户的消息。"""

    serializer_class = NotificationSerializer
    pagination_class = StandardPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        type_ = self.request.query_params.get("type")
        if type_:
            qs = qs.filter(type=type_)
        is_read = self.request.query_params.get("isRead")
        if is_read is not None and is_read != "":
            qs = qs.filter(is_read=is_read.lower() in ("true", "1", "yes"))
        return qs

    @extend_schema(summary="通知列表")
    def get(self, request: Request, *args, **kwargs) -> Response:
        return super().get(request, *args, **kwargs)


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="未读通知数")
    def get(self, request: Request) -> Response:
        total = services.unread_count(request.user)
        # 分类未读数（前端可按类型展示角标）
        by_type: dict[str, int] = {}
        for t, _ in NotificationType.choices:
            by_type[t] = Notification.objects.filter(
                user=request.user, is_read=False, type=t
            ).count()
        return ok({"total": total, "byType": by_type})


class ReadAllSerializer(drf_serializers.Serializer):
    type = drf_serializers.ChoiceField(
        choices=NotificationType.choices, required=False, allow_null=True
    )


class ReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="全部标记已读", request=ReadAllSerializer)
    def post(self, request: Request) -> Response:
        ser = ReadAllSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        count = services.mark_all_as_read(
            user=request.user, type=ser.validated_data.get("type")
        )
        return ok({"updated": count})


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="单条标记已读")
    def post(self, request: Request, pk: int) -> Response:
        notification = get_object_or_404(Notification, pk=pk, user=request.user)
        notification = services.mark_as_read(notification=notification, user=request.user)
        return ok(NotificationSerializer(notification).data)
