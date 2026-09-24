"""content/models.py — 内容草稿与版本（§6.2）。

- ContentDraft: 团队内的内容草稿（含平台目标 + 标签 + 封面 + Markdown 正文）
- ContentVersion: 每次保存自动产生版本历史，支持回滚
"""
from django.conf import settings
from django.db import models

from apps.common.constants import DraftStatus
from apps.common.models import (
    SoftDeleteManager,
    SoftDeleteModel,
    SoftDeleteQuerySet,
    TeamScopedModel,
    TimeStampedModel,
)


class ContentDraftQuerySet(SoftDeleteQuerySet):
    """§2.1：常用 filter 抽到 QuerySet。

    继承 SoftDeleteQuerySet 以保留软删除过滤（默认排除 is_deleted=True）。
    """

    def for_team(self, team_id: int):
        return self.filter(team_id=team_id)

    def for_author(self, user_id: int):
        return self.filter(author_id=user_id)

    def with_status(self, status: str):
        return self.filter(status=status)


class ContentDraft(TeamScopedModel, TimeStampedModel, SoftDeleteModel):
    """内容草稿。"""

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="drafts",
        verbose_name="作者",
    )
    title = models.CharField("标题", max_length=200)
    content_md = models.TextField("Markdown 正文", blank=True, default="")
    cover_url = models.URLField("封面 URL", blank=True, default="")
    tags = models.JSONField("标签", default=list, blank=True)
    status = models.CharField(
        "状态",
        max_length=20,
        choices=DraftStatus.choices,
        default=DraftStatus.DRAFT,
        db_index=True,
    )
    version_no = models.PositiveIntegerField("当前版本号", default=1)
    platforms = models.JSONField(
        "目标平台", default=list, blank=True
    )  # 如 ["wechat","xiaohongshu"]

    objects = SoftDeleteManager.from_queryset(ContentDraftQuerySet)()

    class Meta:
        db_table = "content_drafts"
        verbose_name = "内容草稿"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["team", "status"]),
            models.Index(fields=["author", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} v{self.version_no}"


class ContentVersion(TimeStampedModel):
    """内容版本历史。"""

    draft = models.ForeignKey(
        ContentDraft,
        on_delete=models.CASCADE,
        related_name="versions",
        verbose_name="草稿",
    )
    version_no = models.PositiveIntegerField("版本号", db_index=True)
    title = models.CharField("标题", max_length=200)
    content_md = models.TextField("Markdown 正文", blank=True, default="")
    cover_url = models.URLField("封面 URL", blank=True, default="")
    tags = models.JSONField("标签", default=list, blank=True)
    platforms = models.JSONField("目标平台", default=list, blank=True)
    changelog = models.CharField("变更说明", max_length=255, blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="draft_versions",
        verbose_name="创建人",
    )

    class Meta:
        db_table = "content_versions"
        verbose_name = "内容版本"
        verbose_name_plural = verbose_name
        ordering = ["-version_no"]
        constraints = [
            models.UniqueConstraint(
                fields=["draft", "version_no"], name="uniq_draft_version"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.draft_id} v{self.version_no}"
