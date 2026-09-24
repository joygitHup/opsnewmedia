"""dashboard/tasks.py — 数据抓取 Celery 任务。"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.dashboard.pull_platform_stats")
def pull_platform_stats():
    """每日抓取所有平台账号数据，写 PlatformStats。"""
    from datetime import timedelta
    from django.utils import timezone
    from apps.accounts.models import Account
    from apps.integrations.registry import get_adapter
    from .models import PlatformStats

    today = timezone.now().date()
    accounts = Account.objects.active()
    success = 0
    failed = 0
    for account in accounts:
        adapter = get_adapter(account.platform)
        if adapter is None:
            continue
        try:
            stats = adapter.get_stats(account)
            PlatformStats.objects.update_or_create(
                account=account,
                date=today,
                defaults={
                    "team_id": account.team_id,
                    "views": stats.views,
                    "likes": stats.likes,
                    "comments": stats.comments,
                    "shares": stats.shares,
                    "followers": stats.followers,
                    "raw": stats.raw,
                },
            )
            # 同步账号粉丝数
            account.followers = stats.followers
            account.last_synced_at = timezone.now()
            account.save(update_fields=["followers", "last_synced_at", "updated_at"])
            success += 1
        except NotImplementedError:
            pass
        except Exception as exc:  # noqa: BLE001
            logger.exception("pull_stats_failed account=%s", account.id)
            failed += 1
    return {"success": success, "failed": failed}
