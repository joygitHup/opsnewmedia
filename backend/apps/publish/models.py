"""publish/models.py — 发布任务与日志（§6.3）。

- PublishTask: 草稿 + 账号 + 平台 + 状态 + 计划发布时间 + payload
- PublishLog: 任务执行历史日志（每次重试/调用都写一条）
"""
from django.conf import settings
from django.db import models

from apps.common.constants import PlatformType, PublishTaskStatus
from apps.common.models import (
    SoftDeleteManager,
    SoftDeleteModel,
    SoftDeleteQuerySet,
    TeamScopedModel,
    TimeStampedModel,
)


class PublishTaskQuerySet(SoftDeleteQuerySet):
    """§2.1：常用 filter 抽到 QuerySet。

    继承 SoftDeleteQuerySet 以保留软删除过滤（默认排除 is_deleted=True）。
    """

    def for_team(self, team_id: int):
        return self.filter(team_id=team_id)

    def for_account(self, account_id: int):
        return self.filter(account_id=account_id)

    def for_platform(self, platform: str):
        return self.filter(platform=platform)

    def with_status(self, status: str):
        return self.filter(status=status)

    def pending_scheduled(self, before=None):
        """待执行的定时发布任务。"""
        from django.utils import timezone
        ts = before or timezone.now()
        return self.filter(
            status=PublishTaskStatus.PENDING,
            scheduled_at__isnull=False,
            scheduled_at__lte=ts,
        )


class PublishTask(TeamScopedModel, TimeStampedModel, SoftDeleteModel):
    """单次平台发布任务。"""

    draft = models.ForeignKey(
        "content.ContentDraft",
        on_delete=models.CASCADE,
        related_name="publish_tasks",
        verbose_name="草稿",
    )
    account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.CASCADE,
        related_name="publish_tasks",
        verbose_name="账号",
    )
    platform = models.CharField(
        "平台",
        max_length=20,
        choices=PlatformType.choices,
        db_index=True,
    )
    status = models.CharField(
        "状态",
        max_length=20,
        choices=PublishTaskStatus.choices,
        default=PublishTaskStatus.PENDING,
        db_index=True,
    )
    scheduled_at = models.DateTimeField("计划发布时间", null=True, blank=True, db_index=True)
    published_at = models.DateTimeField("实际发布时间", null=True, blank=True)
    platform_content_id = models.CharField(
        "平台内容ID", max_length=128, blank=True, default=""
    )
    error_msg = models.TextField("错误信息", blank=True, default="")
    retry_count = models.PositiveIntegerField("重试次数", default=0)
    max_retries = models.PositiveIntegerField("最大重试", default=3)
    payload = models.JSONField("发布负载", default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_publish_tasks",
        verbose_name="创建人",
    )

    objects = SoftDeleteManager.from_queryset(PublishTaskQuerySet)()

    class Meta:
        db_table = "publish_tasks"
        verbose_name = "发布任务"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["team", "status"]),
            models.Index(fields=["account", "status"]),
            models.Index(fields=["scheduled_at", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.platform}-{self.id}"


class PublishLog(TimeStampedModel):
    """发布日志：每次重试/调用都写一条。"""

    task = models.ForeignKey(
        PublishTask,
        on_delete=models.CASCADE,
        related_name="logs",
        verbose_name="任务",
    )
    action = models.CharField("动作", max_length=32)
    # publish / retry / cancel / status_change
    payload = models.JSONField("请求负载", default=dict, blank=True)
    response = models.JSONField("响应内容", default=dict, blank=True)
    status_code = models.IntegerField("HTTP 状态码", null=True, blank=True)
    message = models.TextField("消息", blank=True, default="")
    duration_ms = models.PositiveIntegerField("耗时 ms", default=0)

    class Meta:
        db_table = "publish_logs"
        verbose_name = "发布日志"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.task_id}-{self.action}"
