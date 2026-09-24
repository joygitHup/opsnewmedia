"""ai/models.py — AI 调用日志（§6.5）。

记录每次 AI 生成请求，便于审计与限流。
"""
from django.conf import settings
from django.db import models

from apps.common.constants import PlatformType
from apps.common.models import (
    SoftDeleteModel,
    TeamScopedModel,
    TimeStampedModel,
)


class AIGeneration(TeamScopedModel, TimeStampedModel, SoftDeleteModel):
    """AI 生成记录。"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ai_generations",
        verbose_name="调用者",
    )
    action = models.CharField("动作", max_length=20)
    # generate / polish / title / tags
    prompt = models.TextField("输入 prompt", blank=True, default="")
    params = models.JSONField("参数", default=dict, blank=True)
    output = models.TextField("生成结果", blank=True, default="")
    model = models.CharField("模型", max_length=64, blank=True, default="")
    tokens_input = models.PositiveIntegerField("输入 tokens", default=0)
    tokens_output = models.PositiveIntegerField("输出 tokens", default=0)
    duration_ms = models.PositiveIntegerField("耗时 ms", default=0)
    platform = models.CharField(
        "目标平台",
        max_length=20,
        choices=PlatformType.choices,
        blank=True,
        default="",
    )
    success = models.BooleanField("是否成功", default=True)
    error = models.TextField("错误信息", blank=True, default="")

    class Meta:
        db_table = "ai_generations"
        verbose_name = "AI 生成记录"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["team", "action"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} @ {self.created_at}"
