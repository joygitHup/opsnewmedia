"""dashboard/services.py — 数据聚合（§6.4）。

- get_overview: 团队总览（阅读/点赞/评论/转发/粉丝/发布数）
- get_trend: 按日趋势
- get_platform_distribution: 各平台分布
- get_top_contents: 内容排行
- get_publish_queue: 发布队列
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Count, Sum
from django.utils import timezone

from apps.accounts.models import Account
from apps.common.constants import PLATFORM_CONFIG, PublishTaskStatus
from apps.content.models import ContentDraft
from apps.publish.models import PublishTask

from .models import PlatformStats


def _date_range(start=None, end=None, days: int = 30):
    today = timezone.now().date()
    if end is None:
        end = today
    if start is None:
        start = end - timedelta(days=days - 1)
    return start, end


def get_overview(*, team_id: int, start=None, end=None) -> dict:
    start, end = _date_range(start, end, days=30)
    stats = PlatformStats.objects.for_team(team_id).in_range(start, end)
    agg = stats.aggregate(
        views=Sum("views"),
        likes=Sum("likes"),
        comments=Sum("comments"),
        shares=Sum("shares"),
        followerGrowth=Sum("follower_growth"),
    )
    followers = (
        Account.objects.for_team(team_id).active().aggregate(Sum("followers"))
    )
    publish_count = PublishTask.objects.for_team(team_id).filter(
        created_at__date__gte=start,
        created_at__date__lte=end,
    ).count()
    account_count = Account.objects.for_team(team_id).count()
    return {
        "totalViews": agg["views"] or 0,
        "totalLikes": agg["likes"] or 0,
        "totalComments": agg["comments"] or 0,
        "totalShares": agg["shares"] or 0,
        "totalFollowers": followers["followers__sum"] or 0,
        "followerGrowth": agg["followerGrowth"] or 0,
        "publishCount": publish_count,
        "accountCount": account_count,
    }


def get_trend(*, team_id: int, start=None, end=None, days: int = 30) -> list[dict]:
    start, end = _date_range(start, end, days=days)
    rows = (
        PlatformStats.objects.for_team(team_id).in_range(start, end)
        .values("date")
        .annotate(
            views=Sum("views"),
            likes=Sum("likes"),
            comments=Sum("comments"),
            shares=Sum("shares"),
            followerGrowth=Sum("follower_growth"),
        )
        .order_by("date")
    )
    return list(rows)


def get_platform_distribution(*, team_id: int, start=None, end=None) -> list[dict]:
    start, end = _date_range(start, end, days=30)
    rows = (
        PlatformStats.objects.for_team(team_id).in_range(start, end)
        .values("account__platform")  # 已 JOIN
        .annotate(
            followers=Sum("followers"),
            views=Sum("views"),
            likes=Sum("likes"),
            accountCount=Count("account", distinct=True),
        )
        .order_by("-views")
    )
    result = []
    for row in rows:
        platform = row["account__platform"]
        cfg = PLATFORM_CONFIG.get(platform, {})
        result.append({
            "platform": platform,
            "platformName": cfg.get("name", platform),
            "followers": row["followers"] or 0,
            "views": row["views"] or 0,
            "likes": row["likes"] or 0,
            "accountCount": row["accountCount"] or 0,
        })
    return result


def get_top_contents(*, team_id: int, limit: int = 10) -> list[dict]:
    """按已发布任务的草稿统计阅读点赞（暂用 PublishTask 关联）。"""
    tasks = (
        PublishTask.objects.for_team(team_id)
        .filter(status=PublishTaskStatus.SUCCESS)
        .select_related("draft", "account")
        .order_by("-published_at")[:limit]
    )
    return [
        {
            "id": t.draft_id,
            "title": t.draft.title if t.draft_id else "",
            "platform": t.platform,
            "views": 0,  # 真实数据需调 adapter.get_stats
            "likes": 0,
            "publishedAt": t.published_at,
        }
        for t in tasks
    ]


def get_publish_queue(*, team_id: int, limit: int = 20) -> list[dict]:
    rows = (
        PublishTask.objects.for_team(team_id)
        .select_related("draft", "account")
        .order_by("-created_at")[:limit]
    )
    return [
        {
            "id": t.id,
            "title": t.draft.title if t.draft_id else "",
            "platform": t.platform,
            "accountName": t.account.name if t.account_id else "",
            "status": t.status,
            "scheduledAt": t.scheduled_at,
            "publishedAt": t.published_at,
            "errorMsg": t.error_msg,
        }
        for t in rows
    ]
