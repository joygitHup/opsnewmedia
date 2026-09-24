"""config/beat_schedule.py — Celery beat 定时任务定义（§22.4）。

被 config/settings/base.py 引用为 CELERY_BEAT_SCHEDULE。
"""
from celery.schedules import crontab

# 三类定时任务：
# - refresh_platform_tokens: 30 分钟刷新 Token
# - process_scheduled_publish: 每分钟扫描定时发布
# - pull_platform_stats: 每日 02:00 抓取数据

CELERY_BEAT_SCHEDULE = {
    "refresh-platform-tokens": {
        "task": "apps.accounts.refresh_platform_tokens",
        "schedule": crontab(minute="*/30"),
    },
    "process-scheduled-publish": {
        "task": "apps.publish.process_scheduled_publish",
        "schedule": crontab(minute="*"),
    },
    "pull-platform-stats": {
        "task": "apps.dashboard.pull_platform_stats",
        "schedule": crontab(hour=2, minute=0),
    },
}
