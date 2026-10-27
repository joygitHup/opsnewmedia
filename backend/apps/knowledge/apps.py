"""knowledge/apps.py — 知识库（RAG）应用配置。"""
from django.apps import AppConfig


class KnowledgeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.knowledge"
    verbose_name = "知识库"
