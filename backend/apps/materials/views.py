"""materials/views.py — 素材视图（§6.6）。"""
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError
from apps.common.pagination import StandardPagination
from apps.common.response import ok

from . import services
from .models import Material
from .permissions import CanManageMaterial
from .serializers import (
    MaterialDetailSerializer,
    MaterialListSerializer,
    MaterialUploadCallbackSerializer,
    MaterialUploadUrlSerializer,
    MaterialWriteSerializer,
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
    list=extend_schema(summary="素材列表"),
    retrieve=extend_schema(summary="素材详情"),
    create=extend_schema(summary="入库素材"),
    update=extend_schema(summary="更新素材"),
    destroy=extend_schema(summary="删除素材"),
)
class MaterialViewSet(viewsets.ModelViewSet):
    """素材 CRUD + presigned 上传。"""

    pagination_class = StandardPagination
    permission_classes = [IsAuthenticated, CanManageMaterial]
    http_method_names = ["get", "post", "patch", "delete"]
    filterset_fields = ["type", "uploader"]
    search_fields = ["name", "tags"]
    ordering_fields = ["created_at", "size"]

    def get_queryset(self):
        user = self.request.user
        team_id = self.request.query_params.get("teamId") or (
            user.current_team_id if user.current_team_id else None
        )
        qs = Material.objects.select_related("uploader")
        if team_id:
            qs = qs.for_team(team_id)
        else:
            qs = qs.none()
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return MaterialListSerializer
        if self.action == "retrieve":
            return MaterialDetailSerializer
        return MaterialWriteSerializer

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(
                MaterialListSerializer(page, many=True).data
            )
        return ok(MaterialListSerializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        material = self.get_object()
        # 刷新 URL（避免 URL 过期）
        material.url = services.get_access_url(material=material, expires_hours=24)
        return ok(MaterialDetailSerializer(material).data)

    def create(self, request, *args, **kwargs):
        """入库：记录素材元数据（与 upload-url 二段式配合）。"""
        ser = MaterialUploadCallbackSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team_id = _resolve_team_id(request)
        material = services.record_upload(
            team_id=team_id,
            user=request.user,
            object_key=ser.validated_data["object_key"],
            filename=ser.validated_data["filename"],
            material_type=ser.validated_data["type"],
            size=ser.validated_data.get("size", 0),
            content_type=ser.validated_data.get("content_type", ""),
            sha256=ser.validated_data.get("sha256", ""),
            tags=ser.validated_data.get("tags"),
            meta=ser.validated_data.get("meta"),
        )
        return ok(
            MaterialDetailSerializer(material).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        material = self.get_object()
        ser = self.get_serializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        material = services.update_material(
            material=material, **ser.validated_data
        )
        return ok(MaterialDetailSerializer(material).data)

    def destroy(self, request, *args, **kwargs):
        material = self.get_object()
        services.delete_material(material=material)
        return ok({"message": "素材已删除"})

    @action(detail=False, methods=["post"], url_path="upload-url")
    def upload_url(self, request: Request) -> Response:
        """申请 presigned PUT URL（前端直传 MinIO）。"""
        ser = MaterialUploadUrlSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team_id = _resolve_team_id(request)
        result = services.request_upload_url(
            team_id=team_id,
            user=request.user,
            filename=ser.validated_data["filename"],
            material_type=ser.validated_data["type"],
            size=ser.validated_data.get("size", 0),
            content_type=ser.validated_data.get("content_type", ""),
            sha256=ser.validated_data.get("sha256", ""),
        )
        return ok(result)

    @action(
        detail=False,
        methods=["post"],
        url_path="upload",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload(self, request: Request) -> Response:
        """同源代理上传：multipart/form-data，字段 files 可多文件。

        浏览器直传 MinIO 受 CORS 限制（MinIO 不支持桶级 CORS 配置），
        故素材上传统一走此同源接口，由后端流式转发到 MinIO。
        可选字段：type（强制类型）、tags（逗号分隔）。
        """
        files = request.FILES.getlist("files")
        if not files:
            files = [request.FILES["file"]] if "file" in request.FILES else []
        if not files:
            raise BusinessError(ErrorCode.INVALID_PARAM, "未收到上传文件")

        team_id = _resolve_team_id(request)
        forced_type = request.data.get("type") or None
        tags_raw = request.data.get("tags", "")
        tags = [t.strip() for t in tags_raw.split(",") if t.strip()] if tags_raw else None

        materials = [
            services.store_proxied_upload(
                team_id=team_id,
                user=request.user,
                upload_file=upload_file,
                material_type=forced_type,
                tags=tags,
            )
            for upload_file in files
        ]
        return ok(
            MaterialListSerializer(materials, many=True).data,
            status=status.HTTP_201_CREATED,
        )
