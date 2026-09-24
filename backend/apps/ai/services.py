"""ai/services.py — AI 业务逻辑（§6.5）。

- 使用 OpenAI 兼容端点（settings.AI_API_BASE / AI_API_KEY / AI_MODEL）
- 复用 openai SDK 客户端，长任务可走 Celery（当前同步）
- 每次调用落 AIGeneration 日志，便于审计
"""
from __future__ import annotations

import logging
import time
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.common.constants import ErrorCode, PLATFORM_CONFIG, PlatformType
from apps.common.exceptions import BusinessError
from apps.users.models import User

from .models import AIGeneration

logger = logging.getLogger(__name__)


def _get_client():
    """延迟 import openai，便于未配置时也能起服务。"""
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise BusinessError(
            ErrorCode.BUSINESS_ERROR,
            "openai 库未安装，请联系管理员",
        ) from exc
    if not settings.AI_API_KEY:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "AI_API_KEY 未配置")
    return OpenAI(
        api_key=settings.AI_API_KEY,
        base_url=settings.AI_API_BASE,
    )


def _call_llm(
    *,
    system_prompt: str,
    user_prompt: str,
    user: User,
    team_id: int,
    action: str,
    platform: str = "",
    params: dict | None = None,
) -> str:
    """通用 LLM 调用 + 落日志。"""
    started = time.time()
    client = _get_client()
    success = True
    err_msg = ""
    output = ""
    tokens_in = 0
    tokens_out = 0
    try:
        resp = client.chat.completions.create(
            model=settings.AI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
        )
        output = resp.choices[0].message.content or ""
        if getattr(resp, "usage", None):
            tokens_in = resp.usage.prompt_tokens or 0
            tokens_out = resp.usage.completion_tokens or 0
    except Exception as exc:  # noqa: BLE001
        logger.exception("ai_call_failed action=%s", action)
        success = False
        err_msg = str(exc)
        raise BusinessError(
            ErrorCode.PLATFORM_API_ERROR,
            f"AI 调用失败：{exc}",
        )
    finally:
        duration_ms = int((time.time() - started) * 1000)
        AIGeneration.objects.create(
            team_id=team_id,
            user=user,
            action=action,
            prompt=user_prompt,
            params={"system": system_prompt, **(params or {})},
            output=output,
            model=settings.AI_MODEL,
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            duration_ms=duration_ms,
            platform=platform,
            success=success,
            error=err_msg,
        )
    return output


def _platform_hint(platform: str) -> str:
    """根据目标平台给 LLM 注入风格提示。"""
    if not platform or platform not in dict(PlatformType.choices):
        return "通用运营场景"
    cfg = PLATFORM_CONFIG.get(platform, {})
    name = cfg.get("name", platform)
    style = {
        PlatformType.WECHAT: "正式、深度、结构清晰，多用小标题",
        PlatformType.XIAOHONGSHU: "口语化、活泼、emoji 适度、首段直接给出钩子",
        PlatformType.DOUYIN: "适合视频口播、节奏感、关键词前置",
        PlatformType.ZHIHU: "深度问答、可引用数据、逻辑严谨",
        PlatformType.WEIBO: "短文本+话题，140 字内能打动人",
        PlatformType.BILIBILI: "二次元 / UP 主风格，自然不油腻",
    }.get(platform, "")
    return f"{name}：{style}" if style else name


def generate_content(
    *,
    user: User,
    team_id: int,
    prompt: str,
    platform: str = "",
    length: int = 800,
    tone: str = "",
    keywords: list[str] | None = None,
) -> str:
    """内容生成。"""
    platform_hint = _platform_hint(platform)
    sys_prompt = (
        "你是一名多平台内容运营专家。"
        f"目标平台：{platform_hint}。"
        "请按用户要求生成 Markdown 正文，结构清晰、段落分明。"
    )
    kw_part = f"\n关键词：{'，'.join(keywords)}" if keywords else ""
    tone_part = f"\n语气风格：{tone}" if tone else ""
    user_prompt = (
        f"主题：{prompt}{kw_part}{tone_part}\n"
        f"目标字数：约 {length} 字。\n"
        "请直接输出正文，不要解释。"
    )
    return _call_llm(
        system_prompt=sys_prompt,
        user_prompt=user_prompt,
        user=user,
        team_id=team_id,
        action="generate",
        platform=platform,
        params={"length": length, "tone": tone, "keywords": keywords or []},
    )


def polish_content(
    *,
    user: User,
    team_id: int,
    content: str,
    platform: str = "",
    mode: str = "lite",
) -> str:
    """内容润色。"""
    platform_hint = _platform_hint(platform)
    mode_hint = {
        "lite": "仅润色错别字与标点，保持原意",
        "formal": "改写为正式商务风格",
        "casual": "改写为口语化活泼风格",
        "rewrite": "在保持信息点的基础上重写",
    }.get(mode, "轻度润色")
    sys_prompt = (
        "你是一名多平台内容编辑。"
        f"目标平台：{platform_hint}。"
        f"润色模式：{mode_hint}。"
        "保持原文核心观点不变，只优化表达。直接输出润色后正文，不要解释。"
    )
    return _call_llm(
        system_prompt=sys_prompt,
        user_prompt=content,
        user=user,
        team_id=team_id,
        action="polish",
        platform=platform,
        params={"mode": mode},
    )


def generate_titles(
    *,
    user: User,
    team_id: int,
    content: str,
    platform: str = "",
    count: int = 3,
) -> list[str]:
    """标题生成。"""
    platform_hint = _platform_hint(platform)
    sys_prompt = (
        f"你是多平台运营专家。目标平台：{platform_hint}。"
        f"请基于正文生成 {count} 个候选标题，按平台风格调整。"
        "输出 JSON 数组（纯字符串），不要解释、不要包装。"
    )
    raw = _call_llm(
        system_prompt=sys_prompt,
        user_prompt=content[:2000],  # 截断避免超长
        user=user,
        team_id=team_id,
        action="title",
        platform=platform,
        params={"count": count},
    )
    import json
    try:
        titles = json.loads(raw)
        if isinstance(titles, list):
            return [str(t).strip() for t in titles if t][:count]
    except json.JSONDecodeError:
        pass
    # 兜底：按换行分割
    return [t.strip("- •123456789. ").strip() for t in raw.splitlines() if t.strip()][:count]


def recommend_tags(
    *,
    user: User,
    team_id: int,
    content: str,
    platform: str = "",
    count: int = 5,
) -> list[str]:
    """标签推荐。"""
    platform_hint = _platform_hint(platform)
    sys_prompt = (
        f"你是多平台运营专家。目标平台：{platform_hint}。"
        f"请从正文中提取 {count} 个最相关的标签关键词。"
        "输出 JSON 数组（纯字符串），不要解释。"
    )
    raw = _call_llm(
        system_prompt=sys_prompt,
        user_prompt=content[:2000],
        user=user,
        team_id=team_id,
        action="tags",
        platform=platform,
        params={"count": count},
    )
    import json
    try:
        tags = json.loads(raw)
        if isinstance(tags, list):
            return [str(t).strip().lstrip("#") for t in tags if t][:count]
    except json.JSONDecodeError:
        pass
    return [t.strip() for t in raw.replace(",", "\n").splitlines() if t.strip()][:count]
