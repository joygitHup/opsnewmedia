"""teams/services.py — 团队业务逻辑（§5.1）。

- create_default_team: 注册时自动创建
- invite_member: 生成邀请 token
- accept_invitation: 接受邀请加入
- update_member_role / remove_member
"""
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from apps.common.constants import ErrorCode, TeamRole
from apps.common.exceptions import BusinessError
from apps.users.models import User

from .models import Invitation, Team, TeamMember, TeamMemberStatus


@transaction.atomic
def create_default_team(*, owner: User, name: str) -> Team:
    """注册时自动创建个人团队。"""
    team = Team.objects.create(name=name, owner=owner)
    TeamMember.objects.create(
        team=team,
        user=owner,
        role=TeamRole.ADMIN,
        status=TeamMemberStatus.ACTIVE,
        joined_at=timezone.now(),
    )
    return team


@transaction.atomic
def create_team(
    *,
    owner: User,
    name: str,
    avatar: str = "",
    description: str = "",
) -> Team:
    """用户主动创建团队：建团 + 创建者入组为 admin + 切换为当前团队。"""
    team = Team.objects.create(
        name=name,
        avatar=avatar or "",
        description=description or "",
        owner=owner,
    )
    TeamMember.objects.create(
        team=team,
        user=owner,
        role=TeamRole.ADMIN,
        status=TeamMemberStatus.ACTIVE,
        joined_at=timezone.now(),
    )
    # 新团队自动切换为当前团队
    owner.current_team = team
    owner.save(update_fields=["current_team", "updated_at"])
    return team


def _gen_token() -> str:
    return secrets.token_urlsafe(32)


@transaction.atomic
def invite_member(*, team: Team, inviter: User, email: str, role: str) -> Invitation:
    """生成邀请链接（生成 token，前端用此 token 完成 accept）。"""
    if not team.members.filter(user=inviter, role=TeamRole.ADMIN).exists():
        raise BusinessError(ErrorCode.FORBIDDEN, "仅管理员可邀请成员")
    if role not in dict(TeamRole.choices):
        raise BusinessError(ErrorCode.INVALID_PARAM, "角色不合法")
    # 同邮箱重复邀请：重置 token 与过期时间
    inv, created = Invitation.objects.update_or_create(
        team=team, email=email,
        defaults={
            "inviter": inviter,
            "role": role,
            "token": _gen_token(),
            "expires_at": timezone.now() + timedelta(days=7),
            "accepted_at": None,
        },
    )
    # 发送邀请邮件（失败不阻塞流程，记录日志）
    try:
        invite_link = f"{settings.FRONTEND_BASE_URL}/invite?token={inv.token}"
        role_label = dict(TeamRole.choices).get(role, role)
        html_body = render_to_string(
            "teams/invitation_email.html",
            {
                "team_name": team.name,
                "inviter_name": inviter.display_name or inviter.username,
                "role_label": role_label,
                "invite_link": invite_link,
                "expires_at": inv.expires_at.strftime("%Y-%m-%d %H:%M"),
            },
        )
        send_mail(
            subject=f"【{team.name}】邀请你加入团队",
            message=f"{inviter.display_name or inviter.username} 邀请你加入团队「{team.name}」（角色：{role_label}）。\n打开以下链接接受邀请（7 天内有效）：\n{invite_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_body,
        )
    except Exception:
        import logging
        logging.getLogger(__name__).warning("邀请邮件发送失败", exc_info=True)
    return inv


@transaction.atomic
def accept_invitation(*, token: str, user: User) -> TeamMember:
    """用户接受邀请加入团队。"""
    inv = Invitation.objects.filter(token=token).first()
    if inv is None:
        raise BusinessError(ErrorCode.NOT_FOUND, "邀请不存在或已撤销")
    if inv.accepted_at is not None:
        raise BusinessError(ErrorCode.CONFLICT, "邀请已被接受")
    if inv.expires_at < timezone.now():
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "邀请已过期")
    # 已存在成员则更新角色
    member, created = TeamMember.objects.get_or_create(
        team=inv.team, user=user,
        defaults={
            "role": inv.role,
            "status": TeamMemberStatus.ACTIVE,
            "joined_at": timezone.now(),
        },
    )
    if not created:
        member.role = inv.role
        member.status = TeamMemberStatus.ACTIVE
        member.joined_at = timezone.now()
        member.save(update_fields=["role", "status", "joined_at", "updated_at"])
    inv.accepted_at = timezone.now()
    inv.save(update_fields=["accepted_at", "updated_at"])
    return member


@transaction.atomic
def update_member_role(*, team: Team, actor: User, member: TeamMember, role: str) -> TeamMember:
    if not team.members.filter(user=actor, role=TeamRole.ADMIN).exists():
        raise BusinessError(ErrorCode.FORBIDDEN, "仅管理员可修改角色")
    if role not in dict(TeamRole.choices):
        raise BusinessError(ErrorCode.INVALID_PARAM, "角色不合法")
    member.role = role
    member.save(update_fields=["role", "updated_at"])
    return member


@transaction.atomic
def remove_member(*, team: Team, actor: User, member: TeamMember) -> None:
    if not team.members.filter(user=actor, role=TeamRole.ADMIN).exists():
        raise BusinessError(ErrorCode.FORBIDDEN, "仅管理员可移除成员")
    if member.user_id == team.owner_id:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "不能移除团队创建者")
    member.delete()


@transaction.atomic
def delete_team(*, team: Team, actor: User) -> None:
    """删除团队：仅创建者可操作，且不能删除当前团队。"""
    if team.owner_id != actor.id:
        raise BusinessError(ErrorCode.FORBIDDEN, "仅团队创建者可删除团队")
    if actor.current_team_id == team.id:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "不能删除当前所在团队，请先切换到其他团队")
    member_count = team.members.count()
    if member_count > 1:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "团队中仍有其他成员，请先移除后再删除")
    team.delete()


def get_role_matrix() -> dict:
    """返回角色权限矩阵（§5.1）。"""
    from apps.common.constants import (
        ROLE_PERMISSIONS,
        ROLE_RESOURCE_LABELS,
        ROLE_ACTION_LABELS,
    )
    return {
        "roles": [{"value": v, "label": l} for v, l in TeamRole.choices],
        "resources": [
            {"value": k, "label": v}
            for k, v in ROLE_RESOURCE_LABELS.items()
            if k != "*"
        ],
        "actionLabels": ROLE_ACTION_LABELS,
        "permissions": {
            role.value: perms for role, perms in ROLE_PERMISSIONS.items()
        },
    }


# ===== 套餐限制检查 =====

def get_team_plan(team: Team) -> str:
    """返回团队当前套餐。"""
    return team.plan


def get_plan_limits(plan: str) -> dict:
    """返回指定套餐的限制配置。"""
    from apps.common.constants import PLAN_LIMITS
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def get_plan_usage(team: Team) -> dict:
    """返回团队当前资源使用量。"""
    from apps.accounts.models import Account
    accounts_qs = Account.objects.filter(team=team, is_deleted=False)
    return {
        "accounts": accounts_qs.count(),
        "platforms": set(accounts_qs.values_list("platform", flat=True)) - {""},
        "members": team.members.filter(status="active").count(),
    }


def check_plan_limit(team: Team, resource: str, quantity: int = 1) -> None:
    """检查团队是否超出套餐限制。

    resource: accounts / platforms / members
    quantity: 本次要新增的数量
    """
    limits = get_plan_limits(team.plan)
    usage = get_plan_usage(team)
    key = f"max_{resource}"
    limit = limits.get(key)
    if limit is None:
        return  # None = 不限
    current = usage.get(resource, 0)
    if isinstance(current, set):
        current = len(current)
    if current + quantity > limit:
        labels = {"accounts": "账号", "platforms": "平台", "members": "成员"}
        label = labels.get(resource, resource)
        raise BusinessError(
            ErrorCode.PLAN_LIMIT_EXCEEDED,
            f"{label}数量已达上限（{limit}），请升级套餐",
        )


def check_feature(team: Team, feature: str) -> None:
    """检查团队是否有指定功能权限。

    feature: scheduled_publish / review_flow / api_access
    """
    limits = get_plan_limits(team.plan)
    if not limits.get(feature, False):
        feature_labels = {
            "scheduled_publish": "定时发布",
            "review_flow": "审核流程",
            "api_access": "API 接入",
        }
        label = feature_labels.get(feature, feature)
        raise BusinessError(
            ErrorCode.PLAN_LIMIT_EXCEEDED,
            f"当前套餐不支持{label}，请升级套餐",
        )


def upgrade_plan(*, team: Team, plan: str) -> Team:
    """升级团队套餐。"""
    from apps.common.constants import PlanType
    if plan not in dict(PlanType.choices):
        raise BusinessError(ErrorCode.INVALID_PARAM, "套餐不合法")
    team.plan = plan
    team.save(update_fields=["plan", "updated_at"])
    return team
