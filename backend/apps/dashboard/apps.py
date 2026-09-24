"""dashboard AppConfig."""
from django.apps import AppConfig


class DashboardConfig(AppConfig):
    name = "apps.dashboard"
    verbose_name = "数据看板"
    default_auto_field = "django.db.models.BigAutoField"
