"""knowledge/models.py — 知识库（RAG）模型。

- KnowledgeDoc: 知识文档（团队作用域 + 软删除 + MinIO 归档 + SHA256 去重）
- KnowledgeChunk: 文档分块 + embedding 向量（JSONB 数组存储，暴力余弦检索）
"""
from django.db import models

from apps.common.models import SoftDeleteModel, TeamScopedModel, TimeStampedModel
from apps.users.models import User


class KnowledgeDoc(SoftDeleteModel, TeamScopedModel, TimeStampedModel):
    """知识文档。"""

    class SourceType(models.TextChoices):
        UPLOAD = "upload", "文件上传"
        PASTE = "paste", "粘贴文本"

    class Status(models.TextChoices):
        PENDING = "pending", "待处理"
        PROCESSING = "processing", "处理中"
        READY = "ready", "已就绪"
        FAILED = "failed", "失败"

    title = models.CharField("标题", max_length=255)
    source_type = models.CharField(
        "来源", max_length=20, choices=SourceType.choices, default=SourceType.PASTE
    )
    # 原文统一存 MinIO（粘贴文本也归档为 .md 对象），处理时从这里读取
    object_key = models.CharField("MinIO对象Key", max_length=512, blank=True, default="")
    # 文件内容 SHA256，用于团队内重复文档自动去重
    sha256 = models.CharField("内容SHA256", max_length=64, blank=True, default="", db_index=True)
    file_name = models.CharField("文件名", max_length=255, blank=True, default="")
    file_size = models.BigIntegerField("文件大小", default=0)
    mime_type = models.CharField("MIME类型", max_length=128, blank=True, default="")
    status = models.CharField(
        "状态", max_length=20, choices=Status.choices,
        default=Status.PENDING, db_index=True,
    )
    error_msg = models.TextField("失败原因", blank=True, default="")
    chunk_count = models.IntegerField("分块数", default=0)
    # 检索/被引用次数（用于统计哪些知识在用）
    hit_count = models.IntegerField("被检索次数", default=0)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="+", verbose_name="创建人",
    )

    class Meta:
        db_table = "knowledge_doc"
        verbose_name = "知识文档"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["team_id", "status"]),
        ]

    def __str__(self) -> str:
        return self.title


class KnowledgeChunk(TimeStampedModel):
    """文档分块 + 向量。"""

    doc = models.ForeignKey(
        KnowledgeDoc, on_delete=models.CASCADE,
        related_name="chunks", verbose_name="所属文档",
    )
    team = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE,
        related_name="+", verbose_name="所属团队", db_index=True,
    )
    idx = models.IntegerField("块序号", default=0)
    content = models.TextField("分块内容")
    # 1024 维向量（text-embedding-v3），JSONB 数组存储
    embedding = models.JSONField("向量", default=list)
    token_count = models.IntegerField("字符数", default=0)

    class Meta:
        db_table = "knowledge_chunk"
        verbose_name = "知识分块"
        verbose_name_plural = verbose_name
        ordering = ["doc_id", "idx"]
        indexes = [
            models.Index(fields=["team_id", "doc_id"]),
            models.Index(fields=["doc", "idx"]),
        ]

    def __str__(self) -> str:
        return f"{self.doc.title}#{self.idx}"
