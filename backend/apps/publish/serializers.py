"""publish/serializers.py — 发布任务序列化器（§3.1）。"""
from rest_framework import serializers

from apps.common.constants import PublishTaskStatus

from .models import PublishLog, PublishTask


class PublishLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublishLog
        fields = [
            "id", "action", "payload", "response",
            "status_code", "message", "duration_ms", "created_at",
        ]


class PublishTaskListSerializer(serializers.ModelSerializer):
    draftTitle = serializers.CharField(
        source="draft.title", read_only=True, default=""
    )
    accountName = serializers.CharField(
        source="account.name", read_only=True, default=""
    )
    platformName = serializers.CharField(
        source="get_platform_display", read_only=True
    )
    statusName = serializers.CharField(source="get_status_display", read_only=True)
    createdByName = serializers.CharField(
        source="created_by.display_name", read_only=True, default=""
    )

    class Meta:
        model = PublishTask
        fields = [
            "id", "draft", "draftTitle", "account", "accountName",
            "platform", "platformName", "status", "statusName",
            "scheduled_at", "published_at", "platform_content_id",
            "error_msg", "retry_count", "max_retries",
            "createdByName", "created_at",
        ]


class PublishTaskDetailSerializer(PublishTaskListSerializer):
    logs = serializers.SerializerMethodField()

    class Meta(PublishTaskListSerializer.Meta):
        fields = PublishTaskListSerializer.Meta.fields + ["payload", "logs"]

    def get_logs(self, obj):
        logs = getattr(obj, "_logs_prefetched", None)
        if logs is None:
            logs = obj.logs.order_by("-created_at")[:20]
        return PublishLogSerializer(logs, many=True).data


class PublishTaskWriteSerializer(serializers.ModelSerializer):
    """创建发布任务。"""

    class Meta:
        model = PublishTask
        fields = ["draft", "account", "scheduled_at", "payload"]


class PublishTaskRetrySerializer(serializers.Serializer):
    pass


class PublishTaskCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
