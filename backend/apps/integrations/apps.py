"""integrations AppConfig."""
from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    name = "apps.integrations"
    verbose_name = "平台对接"
    default_auto_field = "django.db.models.BigAutoField"
