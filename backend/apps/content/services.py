"""content/services.py — 内容草稿业务逻辑（§6.2）。

- create_draft / update_draft / delete_draft
- save_version: 每次更新保存版本历史
- rollback_to_version: 回滚到指定版本
- preview_for_platform: 用 adapt_to_platform 转换内容格式
"""
from __future__ import annotations

from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.common.constants import DraftStatus, ErrorCode
from apps.common.exceptions import BusinessError
from apps.common.utils_markdown import adapt_to_platform
from apps.users.models import User

from .models import ContentDraft, ContentVersion


@transaction.atomic
def create_draft(*, team_id: int, user: User, **fields: Any) -> ContentDraft:
    draft = ContentDraft(
        team_id=team_id,
        author=user,
        title=fields.get("title", "未命名"),
        content_md=fields.get("content_md", ""),
        cover_url=fields.get("cover_url", ""),
        tags=fields.get("tags", []) or [],
        platforms=fields.get("platforms", []) or [],
        status=DraftStatus.DRAFT,
        version_no=1,
    )
    draft.save()
    # 初始版本
    ContentVersion.objects.create(
        draft=draft,
        version_no=1,
        title=draft.title,
        content_md=draft.content_md,
        cover_url=draft.cover_url,
        tags=draft.tags,
        platforms=draft.platforms,
        changelog="初始版本",
        created_by=user,
    )
    return draft


@transaction.atomic
def update_draft(*, draft: ContentDraft, user: User, **fields: Any) -> ContentDraft:
    """更新草稿并自动产生新版本。"""
    track_fields = {"title", "content_md", "cover_url", "tags", "platforms"}
    changed: dict[str, Any] = {}
    for k in track_fields:
        if k in fields and getattr(draft, k) != fields[k]:
            setattr(draft, k, fields[k])
            changed[k] = fields[k]
    if not changed:
        return draft
    draft.version_no += 1
    draft.save()
    ContentVersion.objects.create(
        draft=draft,
        version_no=draft.version_no,
        title=draft.title,
        content_md=draft.content_md,
        cover_url=draft.cover_url,
        tags=draft.tags,
        platforms=draft.platforms,
        changelog=fields.get("changelog", f"更新 {','.join(changed.keys())}"),
        created_by=user,
    )
    return draft


@transaction.atomic
def delete_draft(*, draft: ContentDraft) -> None:
    draft.delete()


@transaction.atomic
def update_status(*, draft: ContentDraft, status: str) -> ContentDraft:
    if status not in dict(DraftStatus.choices):
        raise BusinessError(ErrorCode.INVALID_PARAM, "状态不合法")
    draft.status = status
    draft.save(update_fields=["status", "updated_at"])
    return draft


@transaction.atomic
def rollback_to_version(
    *, draft: ContentDraft, version_no: int, user: User, changelog: str = ""
) -> ContentDraft:
    """回滚到指定版本：拉取该版本数据，应用到 draft，并产生新版本号。"""
    try:
        version = ContentVersion.objects.get(draft=draft, version_no=version_no)
    except ContentVersion.DoesNotExist:
        raise BusinessError(ErrorCode.NOT_FOUND, "版本不存在")
    draft.title = version.title
    draft.content_md = version.content_md
    draft.cover_url = version.cover_url
    draft.tags = version.tags
    draft.platforms = version.platforms
    draft.version_no += 1
    draft.save()
    ContentVersion.objects.create(
        draft=draft,
        version_no=draft.version_no,
        title=draft.title,
        content_md=draft.content_md,
        cover_url=draft.cover_url,
        tags=draft.tags,
        platforms=draft.platforms,
        changelog=changelog or f"回滚到 v{version_no}",
        created_by=user,
    )
    return draft


def preview_for_platform(*, draft: ContentDraft, platform: str) -> dict:
    """生成平台预览：用 adapt_to_platform 把 Markdown 转为平台格式。"""
    result = adapt_to_platform(draft.content_md, platform)
    return {
        "platform": platform,
        "title": draft.title,
        "content": result.get("content", draft.content_md),
        "wordCount": result.get("word_count", 0),
        "truncated": result.get("truncated", False),
        "images": result.get("images", []),
        "warnings": result.get("warnings", []),
    }
