"""reviews/services.py — 审核业务逻辑（§6.7）。

- submit_for_review: 草稿提交审核
- approve: 通过（进入下一阶段）
- reject: 驳回（回到 submit 阶段）
- rollback: 回滚到提交阶段
- sensitive_check: 敏感词检测
"""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.common.constants import DraftStatus, ErrorCode, ReviewAction
from apps.common.exceptions import BusinessError
from apps.content.models import ContentDraft
from apps.users.models import User

from .models import ReviewFlow, ReviewRecord
from .sensitive import detect


def _notify_review_result(flow: ReviewFlow, *, approved: bool, comment: str, reviewer: User) -> None:
    """审核结果通知提交人（审批人本人提交的不打扰；通知失败不影响主流程）。"""
    if not flow.submitted_by_id or flow.submitted_by_id == reviewer.id:
        return
    try:
        from apps.common.constants import NotificationType
        from apps.notifications.services import notify

        draft_title = flow.draft.title if flow.draft_id else "未命名内容"
        if approved:
            title, content = "审核通过", f"《{draft_title}》已通过审核，可以发布"
        else:
            title = "审核驳回"
            content = f"《{draft_title}》审核未通过" + (f"，意见：{comment[:100]}" if comment else "")
        notify(
            user=flow.submitted_by,
            team=flow.team if flow.team_id else None,
            type=NotificationType.REVIEW,
            title=title,
            content=content,
            link=f"/editor?id={flow.draft_id}",
        )
    except Exception:  # noqa: BLE001
        import logging
        logging.getLogger(__name__).warning(
            "notify_review_result_failed flow_id=%s", flow.id, exc_info=True
        )


@transaction.atomic
def submit_for_review(*, draft: ContentDraft, user: User, comment: str = "") -> ReviewFlow:
    """提交审核：状态变为 pending。"""
    if draft.status == DraftStatus.PUBLISHED:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "草稿已发布，无法提交")
    if draft.status == DraftStatus.PENDING:
        raise BusinessError(ErrorCode.CONFLICT, "草稿已在审核中")
    flow, created = ReviewFlow.objects.get_or_create(
        draft=draft,
        defaults={
            "team_id": draft.team_id,
            "submitted_by": user,
            "submitted_at": timezone.now(),
            "current_stage": "submit",
        },
    )
    flow.submitted_by = user
    flow.submitted_at = timezone.now()
    flow.approved_at = None
    flow.current_stage = "submit"
    flow.save()
    ReviewRecord.objects.create(
        flow=flow,
        reviewer=user,
        action=ReviewAction.SUBMIT,
        stage="submit",
        comment=comment,
    )
    draft.status = DraftStatus.PENDING
    draft.save(update_fields=["status", "updated_at"])
    return flow


@transaction.atomic
def approve(*, flow: ReviewFlow, user: User, comment: str = "") -> ReviewFlow:
    """通过审核：单级审核直接完成，多级走下一阶段。"""
    stages = ["submit", "approve", "final", "done"]
    try:
        idx = stages.index(flow.current_stage)
    except ValueError:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "流程阶段异常")
    if idx >= len(stages) - 1:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "审核已完成")
    next_stage = stages[idx + 1]
    ReviewRecord.objects.create(
        flow=flow,
        reviewer=user,
        action=ReviewAction.APPROVE,
        stage=flow.current_stage,
        comment=comment,
    )
    flow.current_stage = next_stage
    if next_stage == "done":
        flow.approved_at = timezone.now()
        # 同步草稿状态为可发布
        ContentDraft.objects.filter(id=flow.draft_id).update(
            status=DraftStatus.PUBLISHED, updated_at=timezone.now()
        )
        _notify_review_result(flow, approved=True, comment=comment, reviewer=user)
    flow.save()
    return flow


@transaction.atomic
def reject(*, flow: ReviewFlow, user: User, comment: str) -> ReviewFlow:
    """驳回：回到 submit，草稿回到 draft。"""
    if not comment:
        raise BusinessError(ErrorCode.INVALID_PARAM, "驳回必须填写意见")
    ReviewRecord.objects.create(
        flow=flow,
        reviewer=user,
        action=ReviewAction.REJECT,
        stage=flow.current_stage,
        comment=comment,
    )
    flow.current_stage = "submit"
    flow.approved_at = None
    flow.save()
    ContentDraft.objects.filter(id=flow.draft_id).update(
        status=DraftStatus.DRAFT, updated_at=timezone.now()
    )
    _notify_review_result(flow, approved=False, comment=comment, reviewer=user)
    return flow


@transaction.atomic
def rollback(*, flow: ReviewFlow, user: User, comment: str = "") -> ReviewFlow:
    """回滚到提交阶段（不修改草稿）。"""
    ReviewRecord.objects.create(
        flow=flow,
        reviewer=user,
        action=ReviewAction.ROLLBACK,
        stage=flow.current_stage,
        comment=comment,
    )
    flow.current_stage = "submit"
    flow.approved_at = None
    flow.save()
    return flow


def sensitive_check(*, text: str) -> dict:
    """敏感词检测，返回命中列表 + 掩码后文本。"""
    from .sensitive import mask
    hits = detect(text)
    masked = mask(text) if hits else text
    return {
        "ok": not hits,
        "hits": hits,
        "masked": masked,
    }
