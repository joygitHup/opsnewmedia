"""accounts/models.py — 平台账号（§6.1）。

- team FK + platform + name + avatar + status + followers
- platform_account_id + encrypted_token + token_expires_at + last_synced_at
- raw_extra JSON 保存平台返回的额外字段
- account_group 用于按品牌/客户/项目分组管理
"""
from django.conf import settings
from django.db import models

from apps.common.constants import AccountStatus, PlatformType
from apps.common.models import (
    SoftDeleteManager,
    SoftDeleteModel,
    SoftDeleteQuerySet,
    TeamScopedModel,
    TimeStampedModel,
)


class AccountQuerySet(SoftDeleteQuerySet):
    """§2.1：常用 filter 抽到 QuerySet。

    继承 SoftDeleteQuerySet 以保留软删除过滤（默认排除 is_deleted=True）。
    """

    def for_team(self, team_id: int):
        return self.filter(team_id=team_id)

    def for_platform(self, platform: str):
        return self.filter(platform=platform)

    def active(self):
        return self.filter(status=AccountStatus.ACTIVE)

    def authorized(self):
        """状态正常且 token 未过期的账号。"""
        from django.utils import timezone
        return self.filter(
            status=AccountStatus.ACTIVE,
        ).filter(
            models.Q(token_expires_at__isnull=True)
            | models.Q(token_expires_at__gt=timezone.now()),
        )


class Account(TeamScopedModel, TimeStampedModel, SoftDeleteModel):
    """绑定的平台账号。"""

    platform = models.CharField(
        "平台", max_length=20, choices=PlatformType.choices, db_index=True
    )
    name = models.CharField("账号昵称", max_length=128)
    avatar = models.URLField("头像", blank=True)
    status = models.CharField(
        "状态",
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE,
        db_index=True,
    )
    followers = models.BigIntegerField("粉丝数", default=0)
    account_group = models.CharField(
        "账号分组", max_length=64, blank=True, default=""
    )
    platform_account_id = models.CharField(
        "平台账号ID", max_length=128, blank=True, default=""
    )
    encrypted_token = models.TextField("加密 Token", blank=True, default="")
    token_expires_at = models.DateTimeField("Token 过期时间", null=True, blank=True)
    last_synced_at = models.DateTimeField("最后同步时间", null=True, blank=True)
    raw_extra = models.JSONField("平台原始字段", default=dict, blank=True)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="added_accounts",
        verbose_name="绑定人",
    )

    objects = SoftDeleteManager.from_queryset(AccountQuerySet)()

    class Meta:
        db_table = "accounts"
        verbose_name = "平台账号"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["team", "platform"]),
            models.Index(fields=["team", "status"]),
            models.Index(fields=["platform", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["team", "platform", "platform_account_id"],
                name="uniq_team_platform_account",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.get_platform_display()}-{self.name}"

    # ---- Token 加密/解密便捷方法 ----
    def set_token(self, raw_token: str) -> None:
        from apps.common.utils_crypto import encrypt
        self.encrypted_token = encrypt(raw_token)

    def get_token(self) -> str:
        from apps.common.utils_crypto import decrypt
        return decrypt(self.encrypted_token)
