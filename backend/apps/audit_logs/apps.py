"""audit_logs AppConfig."""
from django.apps import AppConfig


class AuditLogsConfig(AppConfig):
    name = "apps.audit_logs"
    verbose_name = "操作日志"
    default_auto_field = "django.db.models.BigAutoField"
