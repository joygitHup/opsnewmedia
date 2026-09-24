"""dashboard/models.py — 平台数据快照（§6.4）。

每个账号每天一条数据快照，便于趋势分析。
"""
from django.db import models

from apps.common.models import (
    SoftDeleteManager,
    SoftDeleteModel,
    SoftDeleteQuerySet,
    TeamScopedModel,
    TimeStampedModel,
)


class PlatformStatsQuerySet(SoftDeleteQuerySet):
    def for_team(self, team_id: int):
        return self.filter(team_id=team_id)

    def for_account(self, account_id: int):
        return self.filter(account_id=account_id)

    def in_range(self, start, end):
        return self.filter(date__gte=start, date__lte=end)


class PlatformStats(TeamScopedModel, TimeStampedModel, SoftDeleteModel):
    """账号每日数据快照。"""

    account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.CASCADE,
        related_name="stats",
        verbose_name="账号",
    )
    date = models.DateField("数据日期", db_index=True)
    views = models.BigIntegerField("阅读", default=0)
    likes = models.BigIntegerField("点赞", default=0)
    comments = models.BigIntegerField("评论", default=0)
    shares = models.BigIntegerField("转发", default=0)
    followers = models.BigIntegerField("粉丝数", default=0)
    follower_growth = models.BigIntegerField("新增粉丝", default=0)
    raw = models.JSONField("原始数据", default=dict, blank=True)

    objects = SoftDeleteManager.from_queryset(PlatformStatsQuerySet)()

    class Meta:
        db_table = "dashboard_platform_stats"
        verbose_name = "平台数据快照"
        verbose_name_plural = verbose_name
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["team", "date"]),
            models.Index(fields=["account", "date"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["account", "date"], name="uniq_account_date"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.account_id} {self.date}"
