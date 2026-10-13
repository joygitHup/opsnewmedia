"""notifications/services.py — 通知业务逻辑。

- notify: 给单个用户发通知
- notify_users: 批量给多个用户发同一条通知
- unread_count: 未读数
- mark_as_read / mark_all_as_read: 标记已读
"""
from __future__ import annotations

from typing import Iterable, Optional

from django.db.models import QuerySet
from django.utils import timezone

from apps.common.constants import NotificationType
from apps.users.models import User

from .models import Notification


def notify(
    *,
    user: User,
    type: str = NotificationType.SYSTEM,
    title: str,
    content: str = "",
    link: str = "",
    team=None,
) -> Notification:
    """给单个用户发送一条站内通知。"""
    return Notification.objects.create(
        user=user,
        team=team if team is not None else getattr(user, "current_team", None),
        type=type,
        title=title[:128],
        content=content[:512],
        link=link[:256],
    )


def notify_users(
    *,
    users: Iterable[User],
    type: str = NotificationType.SYSTEM,
    title: str,
    content: str = "",
    link: str = "",
    team=None,
) -> int:
    """批量发送通知，返回创建条数。"""
    objs = [
        Notification(
            user=u,
            team=team,
            type=type,
            title=title[:128],
            content=content[:512],
            link=link[:256],
        )
        for u in users
    ]
    if not objs:
        return 0
    Notification.objects.bulk_create(objs)
    return len(objs)


def unread_count(user: User) -> int:
    """用户未读通知数。"""
    return Notification.objects.filter(user=user, is_read=False).count()


def mark_as_read(*, notification: Notification, user: User) -> Notification:
    """标记单条通知已读（仅接收人本人可操作）。"""
    if notification.user_id != user.id:
        return notification
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=["is_read", "read_at"])
    return notification


def mark_all_as_read(*, user: User, type: Optional[str] = None) -> int:
    """全部标记已读，可按类型过滤。返回更新条数。"""
    qs: QuerySet[Notification] = Notification.objects.filter(user=user, is_read=False)
    if type:
        qs = qs.filter(type=type)
    return qs.update(is_read=True, read_at=timezone.now())
