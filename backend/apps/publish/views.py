"""publish/views.py — 发布任务视图（§6.3）。"""
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.constants import ErrorCode, PublishTaskStatus
from apps.common.exceptions import BusinessError
from apps.common.pagination import StandardPagination
from apps.common.response import ok

from . import services
from .models import PublishTask
from .permissions import CanManagePublish
from .serializers import (
    PublishTaskCancelSerializer,
    PublishTaskDetailSerializer,
    PublishTaskListSerializer,
    PublishTaskWriteSerializer,
)


def _resolve_team_id(request: Request) -> int:
    team_id = request.query_params.get("teamId") or request.data.get("teamId")
    if team_id:
        try:
            return int(team_id)
        except (TypeError, ValueError):
            raise BusinessError(ErrorCode.INVALID_PARAM, "teamId 非法")
    if request.user.current_team_id:
        return request.user.current_team_id
    raise BusinessError(ErrorCode.BUSINESS_ERROR, "尚未选择团队")


@extend_schema_view(
    list=extend_schema(summary="发布任务列表"),
    retrieve=extend_schema(summary="发布任务详情"),
    create=extend_schema(summary="创建发布任务"),
)
class PublishTaskViewSet(viewsets.ModelViewSet):
    """发布任务 CRUD + retry/cancel。"""

    pagination_class = StandardPagination
    permission_classes = [IsAuthenticated, CanManagePublish]
    http_method_names = ["get", "post", "patch"]
    filterset_fields = ["status", "platform", "account", "draft"]
    search_fields = ["error_msg", "platform_content_id"]
    ordering_fields = ["created_at", "scheduled_at", "published_at"]

    def get_queryset(self):
        user = self.request.user
        team_id = self.request.query_params.get("teamId") or (
            user.current_team_id if user.current_team_id else None
        )
        qs = PublishTask.objects.select_related(
            "draft", "account", "created_by"
        )
        if team_id:
            qs = qs.for_team(team_id)
        else:
            qs = qs.none()
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return PublishTaskListSerializer
        if self.action == "retrieve":
            return PublishTaskDetailSerializer
        return PublishTaskWriteSerializer

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(
                PublishTaskListSerializer(page, many=True).data
            )
        return ok(PublishTaskListSerializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        task = self.get_object()
        task._logs_prefetched = list(
            task.logs.order_by("-created_at")[:20]
        )
        return ok(PublishTaskDetailSerializer(task).data)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team_id = _resolve_team_id(request)
        # 定时发布检查套餐功能
        scheduled_at = ser.validated_data.get("scheduled_at")
        if scheduled_at:
            from apps.teams.models import Team
            from apps.teams.services import check_feature
            team = Team.objects.get(id=team_id)
            check_feature(team, "scheduled_publish")
        task = services.create_publish_task(
            team_id=team_id,
            user=request.user,
            draft_id=ser.validated_data["draft"],
            account_id=ser.validated_data["account"],
            scheduled_at=ser.validated_data.get("scheduled_at"),
            payload=ser.validated_data.get("payload") or {},
        )
        return ok(
            PublishTaskDetailSerializer(task).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="retry")
    def retry(self, request: Request, pk: int = None) -> Response:
        task = self.get_object()
        task = services.retry_task(task=task)
        return ok(PublishTaskDetailSerializer(task).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request: Request, pk: int = None) -> Response:
        task = self.get_object()
        ser = PublishTaskCancelSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        task = services.cancel_task(
            task=task, reason=ser.validated_data.get("reason", "")
        )
        return ok(PublishTaskDetailSerializer(task).data)
