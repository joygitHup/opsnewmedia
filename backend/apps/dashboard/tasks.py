"""dashboard/tasks.py — 数据抓取 Celery 任务。"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.dashboard.pull_platform_stats")
def pull_platform_stats():
    """每日抓取所有平台账号数据，写 PlatformStats。"""
    from apps.accounts.models import Account
    from .services import sync_platform_stats

    result = sync_platform_stats(accounts=Account.objects.active())
    logger.info(
        "pull_platform_stats synced=%s skipped=%s failed=%s",
        result["synced"], result["skipped"], result["failed"],
    )
    return {"success": result["synced"], "failed": result["failed"], "skipped": result["skipped"]}
