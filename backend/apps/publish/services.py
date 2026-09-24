"""publish/services.py — 发布任务业务逻辑（§6.3）。

- create_publish_task: 创建任务 + 投递 Celery
- retry_task: 失败重试
- cancel_task: 取消
- execute_task: 真实执行（被 Celery 任务调用，调 platform adapter）
"""
from __future__ import annotations

import logging
import time
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Account
from apps.common.constants import (
    DraftStatus,
    ErrorCode,
    PlatformType,
    PublishTaskStatus,
)
from apps.common.exceptions import BusinessError
from apps.common.utils_markdown import adapt_to_platform
from apps.content.models import ContentDraft
from apps.users.models import User

from .models import PublishLog, PublishTask

logger = logging.getLogger(__name__)


def _get_adapter(platform: str):
    from apps.integrations.registry import get_adapter
    adapter = get_adapter(platform)
    if adapter is None:
        raise BusinessError(
            ErrorCode.BUSINESS_ERROR, f"平台 {platform} 暂未接入"
        )
    return adapter


@transaction.atomic
def create_publish_task(
    *,
    team_id: int,
    user: User,
    draft_id: int,
    account_id: int,
    scheduled_at=None,
    payload: dict | None = None,
) -> PublishTask:
    """创建发布任务。scheduled_at 为 None 立即发布，否则定时。"""
    try:
        draft = ContentDraft.objects.get(id=draft_id, team_id=team_id)
    except ContentDraft.DoesNotExist:
        raise BusinessError(ErrorCode.NOT_FOUND, "草稿不存在")
    try:
        account = Account.objects.get(id=account_id, team_id=team_id)
    except Account.DoesNotExist:
        raise BusinessError(ErrorCode.NOT_FOUND, "账号不存在")
    if account.platform != draft.platforms and not draft.platforms:
        # 草稿未声明平台则用账号平台
        pass
    if account.platform != draft.platforms and account.platform not in (draft.platforms or []):
        raise BusinessError(
            ErrorCode.BUSINESS_ERROR,
            "账号平台与草稿目标平台不匹配",
        )
    if not account.get_token():
        raise BusinessError(
            ErrorCode.ACCOUNT_NOT_AUTHORIZED,
            "账号未授权或 Token 已失效",
        )

    # 校验内容
    adapter = _get_adapter(account.platform)
    validation = adapter.validate_content(
        {
            "title": draft.title,
            "content": draft.content_md,
            "images": (payload or {}).get("images", []),
            "video": (payload or {}).get("video"),
            "tags": draft.tags,
        }
    )
    if not validation.ok:
        raise BusinessError(
            ErrorCode.BUSINESS_ERROR,
            "内容校验失败：" + "; ".join(validation.errors),
        )

    task = PublishTask(
        team_id=team_id,
        draft=draft,
        account=account,
        platform=account.platform,
        status=PublishTaskStatus.PENDING,
        scheduled_at=scheduled_at,
        payload=payload or {},
        created_by=user,
    )
    task.save()
    PublishLog.objects.create(
        task=task,
        action="create",
        payload={"scheduled_at": str(scheduled_at) if scheduled_at else None},
        message="任务已创建",
    )
    # 立即发布投递 Celery，否则由 beat 定时扫
    if scheduled_at is None:
        from .tasks import execute_publish_task
        execute_publish_task.delay(task.id)
    return task


@transaction.atomic
def retry_task(*, task: PublishTask) -> PublishTask:
    """手动重试：将任务重置为 pending 并投递。"""
    if task.status not in {
        PublishTaskStatus.FAILED,
        PublishTaskStatus.CANCELED,
    }:
        raise BusinessError(
            ErrorCode.BUSINESS_ERROR,
            "仅失败/取消的任务可重试",
        )
    if task.retry_count >= task.max_retries:
        raise BusinessError(
            ErrorCode.BUSINESS_ERROR,
            f"已达最大重试次数 {task.max_retries}",
        )
    task.retry_count += 1
    task.status = PublishTaskStatus.PENDING
    task.error_msg = ""
    task.save(update_fields=["retry_count", "status", "error_msg", "updated_at"])
    PublishLog.objects.create(
        task=task,
        action="retry",
        payload={"retry_count": task.retry_count},
        message=f"手动重试 #{task.retry_count}",
    )
    from .tasks import execute_publish_task
    execute_publish_task.delay(task.id)
    return task


@transaction.atomic
def cancel_task(*, task: PublishTask, reason: str = "") -> PublishTask:
    if task.status in {PublishTaskStatus.SUCCESS, PublishTaskStatus.CANCELED}:
        raise BusinessError(
            ErrorCode.BUSINESS_ERROR,
            "任务已完成或已取消",
        )
    task.status = PublishTaskStatus.CANCELED
    task.error_msg = reason or "用户取消"
    task.save(update_fields=["status", "error_msg", "updated_at"])
    PublishLog.objects.create(
        task=task,
        action="cancel",
        message=reason or "用户取消",
    )
    return task


def execute_task(task_id: int) -> dict[str, Any]:
    """真实执行发布任务（由 Celery 任务调用）。"""
    task = PublishTask.objects.select_related("account", "draft").get(id=task_id)
    if task.status == PublishTaskStatus.CANCELED:
        return {"skipped": True, "reason": "已取消"}
    if task.status == PublishTaskStatus.SUCCESS:
        return {"skipped": True, "reason": "已完成"}
    # 标记为发布中
    task.status = PublishTaskStatus.PUBLISHING
    task.save(update_fields=["status", "updated_at"])

    adapter = _get_adapter(task.platform)
    draft = task.draft
    platform_payload = {
        "title": draft.title,
        "content": draft.content_md,
        "images": task.payload.get("images", []),
        "video": task.payload.get("video"),
        "tags": draft.tags,
        "cover": task.payload.get("cover", draft.cover_url),
    }
    started = time.time()
    try:
        result = adapter.publish(task.account, platform_payload)
    except Exception as exc:  # noqa: BLE001
        # 失败：标记 failed + 日志 + 自动重试
        duration_ms = int((time.time() - started) * 1000)
        task.status = PublishTaskStatus.FAILED
        task.error_msg = str(exc)[:500]
        task.save(update_fields=["status", "error_msg", "updated_at"])
        PublishLog.objects.create(
            task=task,
            action="publish",
            payload=platform_payload,
            message=str(exc)[:1000],
            duration_ms=duration_ms,
        )
        # 自动重试
        if task.retry_count < task.max_retries:
            task.retry_count += 1
            task.status = PublishTaskStatus.PENDING
            task.save(update_fields=["retry_count", "status", "updated_at"])
            from .tasks import execute_publish_task
            # 指数退避
            delay = 2 ** task.retry_count
            execute_publish_task.apply_async(args=[task.id], countdown=delay)
        return {"success": False, "error": str(exc)}

    duration_ms = int((time.time() - started) * 1000)
    PublishLog.objects.create(
        task=task,
        action="publish",
        payload=platform_payload,
        response=result.raw_response,
        status_code=200 if result.success else 500,
        message=result.message,
        duration_ms=duration_ms,
    )
    if result.success:
        task.status = PublishTaskStatus.SUCCESS
        task.platform_content_id = result.platform_content_id
        task.published_at = timezone.now()
        task.error_msg = ""
        task.save(update_fields=["status", "platform_content_id", "published_at", "error_msg", "updated_at"])
        # 同步更新草稿状态
        ContentDraft.objects.filter(id=draft.id).update(
            status=DraftStatus.PUBLISHED, updated_at=timezone.now()
        )
        return {"success": True, "platform_content_id": result.platform_content_id}

    task.status = PublishTaskStatus.FAILED
    task.error_msg = result.message[:500]
    task.save(update_fields=["status", "error_msg", "updated_at"])
    if task.retry_count < task.max_retries:
        task.retry_count += 1
        task.status = PublishTaskStatus.PENDING
        task.save(update_fields=["retry_count", "status", "updated_at"])
        from .tasks import execute_publish_task
        delay = 2 ** task.retry_count
        execute_publish_task.apply_async(args=[task.id], countdown=delay)
    return {"success": False, "error": result.message}
