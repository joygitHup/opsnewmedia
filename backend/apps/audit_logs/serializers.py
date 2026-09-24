"""audit_logs/serializers.py — 操作日志序列化器。"""
from rest_framework import serializers

from .models import AuditLog


class AuditLogListSerializer(serializers.ModelSerializer):
    userName = serializers.CharField(
        source="user.display_name", read_only=True, default=""
    )
    teamName = serializers.CharField(
        source="team.name", read_only=True, default=""
    )

    class Meta:
        model = AuditLog
        fields = [
            "id", "userName", "teamName", "action", "resource",
            "resource_id", "ip", "status_code", "request_id",
            "created_at",
        ]


class AuditLogDetailSerializer(AuditLogListSerializer):
    class Meta(AuditLogListSerializer.Meta):
        fields = AuditLogListSerializer.Meta.fields + ["ua", "payload"]
