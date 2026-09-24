"""users/models.py — 自定义用户模型。

按 §18.3 / §9.1：
- 邮箱作为登录字段
- 关联团队（个人创建即默认一个团队）
- 暴露 is_team_admin / is_in_team 等辅助方法供权限判断
"""
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from apps.common.models import TimeStampedModel, SoftDeleteModel
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel, SoftDeleteModel):
    """自定义用户：邮箱 + 密码 + 个人信息。

    - 团队归属：current_team_id 是当前切换的团队
    - 一个用户可加入多个团队（通过 TeamMember）
    - is_staff 控制后台管理访问
    """

    email = models.EmailField("邮箱", unique=True, db_index=True)
    name = models.CharField("昵称", max_length=64, blank=True)
    avatar = models.URLField("头像", blank=True)
    phone = models.CharField("手机号", max_length=20, blank=True)

    current_team = models.ForeignKey(
        "teams.Team",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="current_members",
        verbose_name="当前团队",
    )

    is_staff = models.BooleanField("后台管理员", default=False)
    is_active = models.BooleanField("可用", default=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        verbose_name = "用户"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.email

    # ---- 团队角色辅助方法（供权限层调用）----
    def is_in_team(self, team_id: int | None) -> bool:
        if team_id is None:
            return False
        return self.team_members.filter(team_id=team_id).exists()

    def has_team_role(self, team_id: int | None, *roles) -> bool:
        if team_id is None:
            return False
        if not roles:
            return self.is_in_team(team_id)
        return self.team_members.filter(team_id=team_id, role__in=roles).exists()

    def is_team_admin(self, team_id: int | None) -> bool:
        from apps.common.constants import TeamRole
        return self.has_team_role(team_id, TeamRole.ADMIN)

    def is_admin_or_editor(self) -> bool:
        """用于全局权限判断：用户在任一团队为 admin 或 editor。"""
        from apps.common.constants import TeamRole
        return self.team_members.filter(
            role__in=[TeamRole.ADMIN, TeamRole.EDITOR]
        ).exists()

    def is_admin_or_reviewer(self) -> bool:
        from apps.common.constants import TeamRole
        return self.team_members.filter(
            role__in=[TeamRole.ADMIN, TeamRole.REVIEWER]
        ).exists()

    @property
    def display_name(self) -> str:
        return self.name or self.email.split("@", 1)[0]
