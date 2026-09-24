"""content/views.py — 内容草稿视图（§6.2）。"""
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.constants import DraftStatus, ErrorCode, PlatformType
from apps.common.exceptions import BusinessError
from apps.common.pagination import StandardPagination
from apps.common.response import ok

from . import services
from .models import ContentDraft, ContentVersion
from .permissions import CanManageContent
from .serializers import (
    ContentDraftDetailSerializer,
    ContentDraftListSerializer,
    ContentDraftPreviewSerializer,
    ContentDraftWriteSerializer,
    ContentVersionBriefSerializer,
    ContentVersionDetailSerializer,
    RollbackWriteSerializer,
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
    list=extend_schema(summary="草稿列表"),
    retrieve=extend_schema(summary="草稿详情"),
    create=extend_schema(summary="创建草稿"),
    update=extend_schema(summary="更新草稿"),
    partial_update=extend_schema(summary="部分更新草稿"),
    destroy=extend_schema(summary="删除草稿"),
)
class ContentDraftViewSet(viewsets.ModelViewSet):
    """内容草稿 CRUD + 版本历史 + 平台预览。"""

    pagination_class = StandardPagination
    permission_classes = [IsAuthenticated, CanManageContent]
    filterset_fields = ["status", "author"]
    search_fields = ["title", "content_md", "tags"]
    ordering_fields = ["created_at", "updated_at", "version_no"]

    def get_queryset(self):
        user = self.request.user
        team_id = self.request.query_params.get("teamId") or (
            user.current_team_id if user.current_team_id else None
        )
        qs = ContentDraft.objects.select_related("author")
        if team_id:
            qs = qs.for_team(team_id)
        else:
            qs = qs.none()
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ContentDraftListSerializer
        if self.action == "retrieve":
            return ContentDraftDetailSerializer
        return ContentDraftWriteSerializer

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        # 注入 versionCount（避免 N+1）
        from django.db.models import Count
        qs = qs.annotate(versionCount=Count("versions"))
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(
                ContentDraftListSerializer(page, many=True).data
            )
        return ok(ContentDraftListSerializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        draft = self.get_object()
        draft._versions_prefetched = list(
            draft.versions.select_related("created_by").order_by("-version_no")[:10]
        )
        return ok(ContentDraftDetailSerializer(draft).data)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team_id = _resolve_team_id(request)
        draft = services.create_draft(
            team_id=team_id, user=request.user, **ser.validated_data
        )
        return ok(
            ContentDraftDetailSerializer(draft).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        draft = self.get_object()
        ser = self.get_serializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        draft = services.update_draft(
            draft=draft, user=request.user, **ser.validated_data
        )
        return ok(ContentDraftDetailSerializer(draft).data)

    def destroy(self, request, *args, **kwargs):
        draft = self.get_object()
        services.delete_draft(draft=draft)
        return ok({"message": "草稿已删除"})

    @action(detail=True, methods=["get"], url_path="versions")
    def versions(self, request: Request, pk: int = None) -> Response:
        draft = self.get_object()
        versions = (
            draft.versions.select_related("created_by").order_by("-version_no")
        )
        return ok(ContentVersionBriefSerializer(versions, many=True).data)

    @action(
        detail=True,
        methods=["get"],
        url_path=r"versions/(?P<version_no>\d+)",
    )
    def version_detail(
        self, request: Request, pk: int = None, version_no: int = None
    ) -> Response:
        draft = self.get_object()
        version = get_object_or_404(
            ContentVersion, draft=draft, version_no=version_no
        )
        return ok(ContentVersionDetailSerializer(version).data)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"versions/(?P<version_no>\d+)/rollback",
    )
    def rollback(
        self, request: Request, pk: int = None, version_no: int = None
    ) -> Response:
        draft = self.get_object()
        ser = RollbackWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        draft = services.rollback_to_version(
            draft=draft,
            version_no=version_no,
            user=request.user,
            changelog=ser.validated_data.get("changelog", ""),
        )
        return ok(ContentDraftDetailSerializer(draft).data)

    @action(detail=True, methods=["get", "post"], url_path="preview")
    def preview(self, request: Request, pk: int = None) -> Response:
        draft = self.get_object()
        ser = ContentDraftPreviewSerializer(
            data=request.query_params or request.data
        )
        ser.is_valid(raise_exception=True)
        result = services.preview_for_platform(
            draft=draft, platform=ser.validated_data["platform"]
        )
        return ok(result)

    @action(detail=True, methods=["patch"], url_path="status")
    def status(self, request: Request, pk: int = None) -> Response:
        draft = self.get_object()
        new_status = request.data.get("status")
        draft = services.update_status(draft=draft, status=new_status)
        return ok(ContentDraftDetailSerializer(draft).data)
