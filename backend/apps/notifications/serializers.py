"""notifications/serializers.py — 通知序列化器（出参统一 camelCase）。"""
from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    isRead = serializers.BooleanField(source="is_read", read_only=True)
    readAt = serializers.DateTimeField(source="read_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    teamId = serializers.IntegerField(source="team_id", read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = [
            "id", "type", "title", "content", "link",
            "isRead", "readAt", "teamId", "createdAt",
        ]
