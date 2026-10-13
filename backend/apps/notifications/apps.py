"""notifications AppConfig."""
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    name = "apps.notifications"
    verbose_name = "消息通知"
    default_auto_field = "django.db.models.BigAutoField"
