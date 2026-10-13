"""notifications/models.py — 站内通知消息。

- 面向接收用户（user），可关联团队（team）
- type 见 common.constants.NotificationType
- link 为站内前端路由，点击通知后跳转（如 /content?id=1）
"""
from django.conf import settings
from django.db import models

from apps.common.constants import NotificationType


class Notification(models.Model):
    """站内通知。"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="接收人",
    )
    team = models.ForeignKey(
        "teams.Team",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
        verbose_name="所属团队",
    )
    type = models.CharField(
        "类型",
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        db_index=True,
    )
    title = models.CharField("标题", max_length=128)
    content = models.CharField("内容", max_length=512, blank=True, default="")
    link = models.CharField("跳转链接", max_length=256, blank=True, default="")
    is_read = models.BooleanField("是否已读", default=False, db_index=True)
    read_at = models.DateTimeField("阅读时间", null=True, blank=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notifications"
        verbose_name = "通知消息"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}-{self.type}-{self.title[:20]}"
