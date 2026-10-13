"""content/serializers.py — 内容草稿序列化器（§3.1）。"""
from rest_framework import serializers

from apps.common.constants import ContentType, DraftStatus, PlatformType

from .models import ContentDraft, ContentVersion


class ContentVersionBriefSerializer(serializers.ModelSerializer):
    createdByName = serializers.CharField(
        source="created_by.display_name", read_only=True, default=""
    )
    versionNo = serializers.IntegerField(source="version_no", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = ContentVersion
        fields = [
            "id", "versionNo", "title", "changelog",
            "createdByName", "createdAt",
        ]


class ContentVersionDetailSerializer(ContentVersionBriefSerializer):
    contentMd = serializers.CharField(source="content_md", read_only=True)
    coverUrl = serializers.CharField(source="cover_url", read_only=True)

    class Meta(ContentVersionBriefSerializer.Meta):
        fields = ContentVersionBriefSerializer.Meta.fields + [
            "contentMd", "coverUrl", "tags", "platforms",
        ]


class ContentDraftListSerializer(serializers.ModelSerializer):
    authorName = serializers.CharField(
        source="author.display_name", read_only=True, default=""
    )
    statusName = serializers.CharField(source="get_status_display", read_only=True)
    contentType = serializers.CharField(source="content_type", read_only=True)
    contentTypeName = serializers.CharField(
        source="get_content_type_display", read_only=True
    )
    versionCount = serializers.IntegerField(read_only=True)
    coverUrl = serializers.URLField(source="cover_url", read_only=True)
    versionNo = serializers.IntegerField(source="version_no", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = ContentDraft
        fields = [
            "id", "title", "contentType", "contentTypeName", "coverUrl",
            "status", "statusName",
            "versionNo", "platforms", "tags", "authorName",
            "versionCount", "createdAt", "updatedAt",
        ]


class ContentDraftDetailSerializer(ContentDraftListSerializer):
    contentMd = serializers.CharField(source="content_md", read_only=True)
    mediaName = serializers.CharField(source="media_name", read_only=True)
    mediaKey = serializers.CharField(source="media_key", read_only=True)
    mediaCoverKey = serializers.CharField(source="media_cover_key", read_only=True)
    mediaUrl = serializers.SerializerMethodField()
    mediaCoverUrl = serializers.SerializerMethodField()
    versions = serializers.SerializerMethodField()

    class Meta(ContentDraftListSerializer.Meta):
        fields = ContentDraftListSerializer.Meta.fields + [
            "contentMd", "mediaName", "mediaKey", "mediaCoverKey",
            "mediaUrl", "mediaCoverUrl", "versions",
        ]

    def _sign(self, key: str) -> str:
        if not key:
            return ""
        try:
            from apps.common.utils_minio import presigned_get_url
            return presigned_get_url(key, expires_hours=24)
        except Exception:  # noqa: BLE001
            import logging
            logging.getLogger(__name__).warning(
                "draft.media_presign_failed draft_id=%s", self.instance.pk
                if self.instance else "?"
            )
            return ""

    def get_mediaUrl(self, obj) -> str:
        return self._sign(obj.media_key)

    def get_mediaCoverUrl(self, obj) -> str:
        return self._sign(obj.media_cover_key)

    def get_versions(self, obj):
        versions = getattr(obj, "_versions_prefetched", None)
        if versions is None:
            versions = obj.versions.order_by("-version_no")[:10]
        return ContentVersionBriefSerializer(versions, many=True).data


class ContentDraftWriteSerializer(serializers.ModelSerializer):
    """写入用，前端传 camelCase，用 source 映射到模型 snake_case 字段。"""

    contentMd = serializers.CharField(source="content_md", required=False, allow_blank=True)
    coverUrl = serializers.URLField(source="cover_url", required=False, allow_blank=True)
    contentType = serializers.ChoiceField(
        source="content_type", choices=ContentType.choices, required=False
    )
    mediaKey = serializers.CharField(source="media_key", required=False, allow_blank=True)
    mediaName = serializers.CharField(source="media_name", required=False, allow_blank=True)
    mediaCoverKey = serializers.CharField(
        source="media_cover_key", required=False, allow_blank=True
    )

    class Meta:
        model = ContentDraft
        fields = [
            "title", "contentType", "contentMd", "coverUrl", "tags", "platforms",
            "mediaKey", "mediaName", "mediaCoverKey",
        ]


class ContentDraftPreviewSerializer(serializers.Serializer):
    platform = serializers.ChoiceField(choices=PlatformType.choices)


class RollbackWriteSerializer(serializers.Serializer):
    changelog = serializers.CharField(max_length=255, required=False, allow_blank=True)
