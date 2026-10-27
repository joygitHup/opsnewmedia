"""knowledge/serializers.py — 知识库序列化器（出参统一 camelCase）。"""
from rest_framework import serializers

from .models import KnowledgeChunk, KnowledgeDoc


class KnowledgeDocListSerializer(serializers.ModelSerializer):
    sourceType = serializers.CharField(source="source_type", read_only=True)
    sourceTypeName = serializers.CharField(source="get_source_type_display", read_only=True)
    fileName = serializers.CharField(source="file_name", read_only=True)
    fileSize = serializers.IntegerField(source="file_size", read_only=True)
    mimeType = serializers.CharField(source="mime_type", read_only=True)
    statusName = serializers.CharField(source="get_status_display", read_only=True)
    chunkCount = serializers.IntegerField(source="chunk_count", read_only=True)
    errorMsg = serializers.CharField(source="error_msg", read_only=True)
    hitCount = serializers.IntegerField(source="hit_count", read_only=True)
    createdByName = serializers.CharField(
        source="created_by.display_name", read_only=True, default=""
    )
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = KnowledgeDoc
        fields = [
            "id", "title", "sourceType", "sourceTypeName", "fileName",
            "fileSize", "mimeType", "status", "statusName", "chunkCount",
            "errorMsg", "hitCount", "createdByName", "createdAt",
        ]


class KnowledgeChunkSerializer(serializers.ModelSerializer):
    docTitle = serializers.CharField(source="doc.title", read_only=True)
    tokenCount = serializers.IntegerField(source="token_count", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = KnowledgeChunk
        fields = ["id", "doc", "docTitle", "idx", "content", "tokenCount", "createdAt"]


class KnowledgePasteSerializer(serializers.Serializer):
    """粘贴文本导入。"""

    title = serializers.CharField(max_length=255)
    content = serializers.CharField()


class KnowledgeUpdateTitleSerializer(serializers.Serializer):
    """更新文档标题。"""

    title = serializers.CharField(max_length=255)


class KnowledgeSearchSerializer(serializers.Serializer):
    """检索测试。"""

    query = serializers.CharField(max_length=1000)
    topK = serializers.IntegerField(required=False, min_value=1, max_value=20, default=5)
    docIds = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=True
    )


class KnowledgeQASourceSerializer(serializers.Serializer):
    """历史消息里的一条引用。"""

    docId = serializers.IntegerField()
    docTitle = serializers.CharField(required=False, allow_blank=True, default="")
    chunkIdx = serializers.IntegerField(required=False, default=0)
    score = serializers.FloatField(required=False, default=0.0)


class KnowledgeQAMsgSerializer(serializers.Serializer):
    """历史消息。"""

    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField()
    sources = KnowledgeQASourceSerializer(required=False, many=True, default=list)


class KnowledgeQAAskSerializer(serializers.Serializer):
    """知识库问答（支持多轮历史）。"""

    question = serializers.CharField(max_length=2000)
    topK = serializers.IntegerField(required=False, min_value=1, max_value=10, default=5)
    history = KnowledgeQAMsgSerializer(required=False, many=True, default=list)


class KnowledgeBatchDeleteSerializer(serializers.Serializer):
    """批量删除。"""

    ids = serializers.ListField(child=serializers.IntegerField(), min_length=1, max_length=100)
