"""users AppConfig."""
from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = "apps.users"
    verbose_name = "用户与鉴权"
    default_auto_field = "django.db.models.BigAutoField"
