"""teams/models.py — Team / TeamMember / Invitation。"""
from django.conf import settings
from django.db import models

from apps.common.constants import PlanType, TeamRole
from apps.common.models import TimeStampedModel, SoftDeleteModel


class Team(TimeStampedModel, SoftDeleteModel):
    """团队 / 工作空间。"""

    name = models.CharField("团队名", max_length=128)
    avatar = models.URLField("团队头像", blank=True)
    description = models.TextField("简介", blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_teams",
        verbose_name="创建者",
    )
    plan = models.CharField(
        "套餐",
        max_length=20,
        choices=PlanType.choices,
        default=PlanType.FREE,
    )

    class Meta:
        db_table = "teams"
        verbose_name = "团队"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class TeamMemberQuerySet(models.QuerySet):
    """§2.1：常用 filter 抽到 QuerySet。"""

    def for_team(self, team_id: int):
        return self.filter(team_id=team_id)

    def for_user(self, user_id: int):
        return self.filter(user_id=user_id)

    def admins(self):
        return self.filter(role=TeamRole.ADMIN)

    def active(self):
        return self.filter(status=TeamMemberStatus.ACTIVE)


class TeamMemberStatus(models.TextChoices):
    PENDING = "pending", "待接受"
    ACTIVE = "active", "已加入"
    DISABLED = "disabled", "已禁用"


class TeamMember(TimeStampedModel):
    """团队成员：用户 + 团队 + 角色。"""

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="members",
        verbose_name="团队",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_members",
        verbose_name="成员",
    )
    role = models.CharField(
        "角色", max_length=20, choices=TeamRole.choices, default=TeamRole.VIEWER
    )
    status = models.CharField(
        "状态", max_length=20, choices=TeamMemberStatus.choices, default=TeamMemberStatus.PENDING
    )
    joined_at = models.DateTimeField("加入时间", null=True, blank=True)

    objects = TeamMemberQuerySet.as_manager()

    class Meta:
        db_table = "team_members"
        verbose_name = "团队成员"
        verbose_name_plural = verbose_name
        constraints = [
            models.UniqueConstraint(
                fields=["team", "user"], name="uniq_team_user"
            )
        ]
        indexes = [
            models.Index(fields=["team", "status"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.team_id}-{self.user_id}-{self.role}"


class Invitation(TimeStampedModel):
    """邀请码：邮箱邀请 + token。"""

    team = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name="invitations"
    )
    inviter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_invitations",
    )
    email = models.EmailField("被邀邮箱")
    role = models.CharField(
        "拟授角色", max_length=20, choices=TeamRole.choices, default=TeamRole.VIEWER
    )
    token = models.CharField("邀请 token", max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField("过期时间")
    accepted_at = models.DateTimeField("接受时间", null=True, blank=True)

    class Meta:
        db_table = "team_invitations"
        verbose_name = "邀请"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]
