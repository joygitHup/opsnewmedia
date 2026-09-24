"""config/celery.py — Celery 应用实例与 autodiscover。

按 §11.1：耗时操作（发布 / 数据抓取 / AI 长任务）放 Celery。
"""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("opsnewmedia")

app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):  # pragma: no cover
    print(f"Request: {self.request!r}")
