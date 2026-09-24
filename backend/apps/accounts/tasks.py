"""accounts/tasks.py — 账号相关 Celery 任务。"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.accounts.refresh_platform_tokens")
def refresh_platform_tokens():
    """每 30 分钟刷新一次即将过期的 Token。"""
    from datetime import timedelta
    from django.utils import timezone
    from apps.common.constants import AccountStatus
    from apps.integrations.registry import get_adapter
    from .models import Account
    from .services import refresh_account_token

    threshold = timezone.now() + timedelta(hours=2)
    accounts = Account.objects.filter(
        status=AccountStatus.ACTIVE,
        token_expires_at__isnull=False,
        token_expires_at__lte=threshold,
    )
    success = 0
    failed = 0
    for account in accounts:
        adapter = get_adapter(account.platform)
        if adapter is None:
            continue
        try:
            result = refresh_account_token(account=account)
            if result is None:
                # 无法刷新（无 refresh_token）：标记过期
                account.status = AccountStatus.EXPIRED
                account.save(update_fields=["status", "updated_at"])
                failed += 1
            else:
                success += 1
        except Exception as exc:  # noqa: BLE001
            logger.exception("refresh_token_failed account=%s", account.id)
            failed += 1
    return {"success": success, "failed": failed}
