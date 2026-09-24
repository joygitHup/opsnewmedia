"""content AppConfig."""
from django.apps import AppConfig


class ContentConfig(AppConfig):
    name = "apps.content"
    verbose_name = "内容创作"
    default_auto_field = "django.db.models.BigAutoField"
