"""materials/serializers.py — 素材序列化器（§3.1）。"""
import logging

from rest_framework import serializers

from apps.common.constants import MaterialType

from .models import Material
from .services import get_access_url

logger = logging.getLogger(__name__)


class MaterialListSerializer(serializers.ModelSerializer):
    typeName = serializers.CharField(source="get_type_display", read_only=True)
    uploaderName = serializers.CharField(
        source="uploader.display_name", read_only=True, default=""
    )
    # 动态生成短期 presigned GET URL（库内不存签名串）
    url = serializers.SerializerMethodField()

    def get_url(self, obj: Material) -> str:
        if not obj.object_key:
            return obj.url
        try:
            return get_access_url(material=obj)
        except Exception:  # MinIO 不可用时不应拖垮列表接口
            logger.warning("material.presign_failed", extra={"id": obj.id})
            return ""

    # 出参统一 camelCase
    contentType = serializers.CharField(source="content_type", read_only=True)
    hashSha256 = serializers.CharField(source="hash_sha256", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Material
        fields = [
            "id", "type", "typeName", "name", "url", "size",
            "contentType", "hashSha256", "tags", "uploaderName",
            "createdAt",
        ]


class MaterialDetailSerializer(MaterialListSerializer):
    objectKey = serializers.CharField(source="object_key", read_only=True)

    class Meta(MaterialListSerializer.Meta):
        fields = MaterialListSerializer.Meta.fields + ["objectKey", "meta"]


class MaterialWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = ["type", "name", "tags"]


class MaterialUploadUrlSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255)
    type = serializers.ChoiceField(choices=MaterialType.choices)
    size = serializers.IntegerField(min_value=0, required=False)
    # 入参契约为 camelCase（与前端 materials.ts 对齐），source 映射回内部 snake_case
    contentType = serializers.CharField(
        source="content_type", max_length=128, required=False, allow_blank=True
    )
    sha256 = serializers.CharField(max_length=64, required=False, allow_blank=True)


class MaterialUploadCallbackSerializer(serializers.Serializer):
    """前端上传完成后回报，写库。入参契约为 camelCase。"""

    objectKey = serializers.CharField(source="object_key", max_length=512)
    filename = serializers.CharField(max_length=255)
    type = serializers.ChoiceField(choices=MaterialType.choices)
    size = serializers.IntegerField(min_value=0, required=False, default=0)
    contentType = serializers.CharField(
        source="content_type", max_length=128, required=False, allow_blank=True, default=""
    )
    sha256 = serializers.CharField(max_length=64, required=False, allow_blank=True, default="")
    tags = serializers.ListField(
        child=serializers.CharField(max_length=64), required=False, max_length=20
    )
    meta = serializers.JSONField(required=False, default=dict)
