"""run_scheduler — 本地定时发布扫描器（无需 Celery worker/beat）。

每 interval 秒调用一次 apps.publish.tasks.process_scheduled_publish。
本地 dev 下 CELERY_TASK_ALWAYS_EAGER=True，任务会同步执行，因此可完整跑通
「扫描 -> 投递 -> 发布」流程。

用法：
    python manage.py run_scheduler            # 每 60 秒扫一次，前台常驻
    python manage.py run_scheduler --once     # 只扫一次
    python manage.py run_scheduler --interval 30
"""
from __future__ import annotations

import logging
import time

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "定时扫描到点的发布任务（本地 dev 替代 Celery beat）"

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--once",
            action="store_true",
            help="只扫描一次后退出",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=60,
            help="扫描间隔秒数（默认 60）",
        )

    def handle(self, *args, **options) -> None:
        from apps.publish.tasks import process_scheduled_publish

        once: bool = options["once"]
        interval: int = max(1, options["interval"])

        while True:
            try:
                result = process_scheduled_publish()
                scanned = (result or {}).get("scanned", 0)
                logger.info("scheduler scanned=%s", scanned)
                self.stdout.write(f"[run_scheduler] scanned={scanned}")
            except Exception:  # noqa: BLE001
                logger.exception("scheduler run failed")
                self.stderr.write("[run_scheduler] 扫描失败，详见日志")
            if once:
                break
            time.sleep(interval)
