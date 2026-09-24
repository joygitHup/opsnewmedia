"""publish/tasks.py — Celery 任务（§6.3 / §22.4）。

- execute_publish_task: 消费发布队列，指数退避重试最多 3 次
- process_scheduled_publish: 每分钟扫描定时任务并投递
"""
from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="apps.publish.execute_publish_task",
    max_retries=3,
    default_retry_delay=30,
)
def execute_publish_task(self, task_id: int):
    """执行一次发布任务。失败由 services 层决定是否重试。"""
    from .services import execute_task

    try:
        return execute_task(task_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("celery_publish_failed task_id=%s", task_id)
        raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1))


@shared_task(name="apps.publish.process_scheduled_publish")
def process_scheduled_publish():
    """每分钟扫一次定时任务，到点投递。"""
    from apps.common.constants import PublishTaskStatus
    from django.utils import timezone
    from .models import PublishTask

    tasks = PublishTask.objects.pending_scheduled(before=timezone.now())
    count = 0
    for task in tasks:
        execute_publish_task.delay(task.id)
        count += 1
    return {"scanned": count}
