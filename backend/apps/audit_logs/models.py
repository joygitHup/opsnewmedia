"""audit_logs/models.py — 操作日志（§6.8）。"""
from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class AuditLog(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
        verbose_name="操作人",
    )
    team = models.ForeignKey(
        "teams.Team",
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
        verbose_name="团队",
    )
    action = models.CharField("动作", max_length=32, db_index=True)
    # create / update / delete / login / logout / publish ...
    resource = models.CharField("资源", max_length=64, db_index=True)
    # accounts / content / publish / teams / ...
    resource_id = models.CharField("资源ID", max_length=64, blank=True, default="")
    ip = models.GenericIPAddressField("IP", null=True, blank=True)
    ua = models.TextField("UA", blank=True, default="")
    payload = models.JSONField("操作负载", default=dict, blank=True)
    status_code = models.IntegerField("HTTP 状态码", null=True, blank=True)
    request_id = models.CharField(
        "请求ID", max_length=64, blank=True, default="", db_index=True
    )

    class Meta:
        db_table = "audit_logs"
        verbose_name = "操作日志"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["team", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action", "resource"]),
        ]

    def __str__(self) -> str:
        return f"{self.action}-{self.resource}-{self.created_at}"
