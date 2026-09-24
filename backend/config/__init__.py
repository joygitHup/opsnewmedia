"""config 包初始化：导入 Celery app。

按 §11.1 让 Django 启动时 Celery app 被加载。
"""
from .celery import app as celery_app  # noqa: F401

__all__ = ("celery_app",)
