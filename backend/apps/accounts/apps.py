"""accounts AppConfig."""
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = "apps.accounts"
    verbose_name = "平台账号"
    default_auto_field = "django.db.models.BigAutoField"
