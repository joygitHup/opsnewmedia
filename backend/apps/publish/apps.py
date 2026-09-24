"""publish AppConfig."""
from django.apps import AppConfig


class PublishConfig(AppConfig):
    name = "apps.publish"
    verbose_name = "一键分发"
    default_auto_field = "django.db.models.BigAutoField"
