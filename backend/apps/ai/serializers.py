"""ai/serializers.py — AI 调用序列化器（§3.1）。"""
from rest_framework import serializers

from apps.common.constants import PlatformType


class GenerateSerializer(serializers.Serializer):
    """内容生成。"""

    prompt = serializers.CharField(max_length=4000)
    platform = serializers.ChoiceField(
        choices=PlatformType.choices, required=False, allow_blank=True
    )
    length = serializers.IntegerField(min_value=100, max_value=4000, required=False)
    tone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    keywords = serializers.ListField(
        child=serializers.CharField(max_length=64),
        required=False,
        max_length=10,
    )


class PolishSerializer(serializers.Serializer):
    """内容润色。"""

    content = serializers.CharField(max_length=8000)
    platform = serializers.ChoiceField(
        choices=PlatformType.choices, required=False, allow_blank=True
    )
    mode = serializers.ChoiceField(
        choices=["lite", "formal", "casual", "rewrite"],
        required=False,
        default="lite",
    )


class TitleSerializer(serializers.Serializer):
    """标题生成。"""

    content = serializers.CharField(max_length=8000)
    platform = serializers.ChoiceField(
        choices=PlatformType.choices, required=False, allow_blank=True
    )
    count = serializers.IntegerField(min_value=1, max_value=10, required=False, default=3)


class TagsSerializer(serializers.Serializer):
    """标签推荐。"""

    content = serializers.CharField(max_length=8000)
    platform = serializers.ChoiceField(
        choices=PlatformType.choices, required=False, allow_blank=True
    )
    count = serializers.IntegerField(min_value=1, max_value=20, required=False, default=5)


class AIResultSerializer(serializers.Serializer):
    """AI 调用结果。"""

    output = serializers.CharField(allow_blank=True)
    options = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True
    )
    tags = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True
    )
