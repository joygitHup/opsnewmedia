"""common/serializers.py — 公共序列化器基类。"""
from rest_framework import serializers


class TimestampedReadSerializer(serializers.Serializer):
    """通用时间戳只读字段。"""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
