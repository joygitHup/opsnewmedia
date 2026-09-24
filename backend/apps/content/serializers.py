"""content/serializers.py — 内容草稿序列化器（§3.1）。"""
from rest_framework import serializers

from apps.common.constants import DraftStatus, PlatformType

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
    versionCount = serializers.IntegerField(read_only=True)
    coverUrl = serializers.URLField(source="cover_url", read_only=True)
    versionNo = serializers.IntegerField(source="version_no", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = ContentDraft
        fields = [
            "id", "title", "coverUrl", "status", "statusName",
            "versionNo", "platforms", "tags", "authorName",
            "versionCount", "createdAt", "updatedAt",
        ]


class ContentDraftDetailSerializer(ContentDraftListSerializer):
    contentMd = serializers.CharField(source="content_md", read_only=True)
    versions = serializers.SerializerMethodField()

    class Meta(ContentDraftListSerializer.Meta):
        fields = ContentDraftListSerializer.Meta.fields + [
            "contentMd", "versions",
        ]

    def get_versions(self, obj):
        versions = getattr(obj, "_versions_prefetched", None)
        if versions is None:
            versions = obj.versions.order_by("-version_no")[:10]
        return ContentVersionBriefSerializer(versions, many=True).data


class ContentDraftWriteSerializer(serializers.ModelSerializer):
    """写入用，前端传 camelCase，用 source 映射到模型 snake_case 字段。"""

    contentMd = serializers.CharField(source="content_md", required=False, allow_blank=True)
    coverUrl = serializers.URLField(source="cover_url", required=False, allow_blank=True)

    class Meta:
        model = ContentDraft
        fields = ["title", "contentMd", "coverUrl", "tags", "platforms"]


class ContentDraftPreviewSerializer(serializers.Serializer):
    platform = serializers.ChoiceField(choices=PlatformType.choices)


class RollbackWriteSerializer(serializers.Serializer):
    changelog = serializers.CharField(max_length=255, required=False, allow_blank=True)
