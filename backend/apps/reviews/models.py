"""reviews/models.py — 审核流程与记录（§6.7）。"""
from django.conf import settings
from django.db import models

from apps.common.constants import ReviewAction
from apps.common.models import (
    SoftDeleteModel,
    TeamScopedModel,
    TimeStampedModel,
)


class ReviewFlow(TeamScopedModel, TimeStampedModel, SoftDeleteModel):
    """草稿审核流程。一个草稿一条 flow。"""

    draft = models.OneToOneField(
        "content.ContentDraft",
        on_delete=models.CASCADE,
        related_name="review_flow",
        verbose_name="草稿",
    )
    current_stage = models.CharField(
        "当前阶段", max_length=32, default="submit"
    )  # submit / approve / final / done
    config = models.JSONField("审核配置", default=dict, blank=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="submitted_review_flows",
        verbose_name="提交人",
    )
    submitted_at = models.DateTimeField("提交时间", null=True, blank=True)
    approved_at = models.DateTimeField("最终通过时间", null=True, blank=True)

    class Meta:
        db_table = "review_flows"
        verbose_name = "审核流程"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"flow-{self.draft_id}-{self.current_stage}"


class ReviewRecord(TimeStampedModel):
    """审核记录：每一次提交/通过/驳回/回滚都写一条。"""

    flow = models.ForeignKey(
        ReviewFlow,
        on_delete=models.CASCADE,
        related_name="records",
        verbose_name="流程",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="review_records",
        verbose_name="审核人",
    )
    action = models.CharField(
        "动作", max_length=20, choices=ReviewAction.choices
    )
    stage = models.CharField("阶段", max_length=32)
    comment = models.TextField("审核意见", blank=True, default="")

    class Meta:
        db_table = "review_records"
        verbose_name = "审核记录"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.flow_id}-{self.action}"
