"""apps/common AppConfig."""
from django.apps import AppConfig


class CommonConfig(AppConfig):
    name = "apps.common"
    verbose_name = "公共基础设施"
    default_auto_field = "django.db.models.BigAutoField"
