"""common/utils_markdown.py — 纯函数：Markdown → 平台格式适配（§6.1）。

为不同平台（公众号富文本 / 小红书短文 / 知乎长文）裁剪与转换内容。
不查数据库、不读 request、给定输入输出确定。
"""
import re
from typing import Any

from .constants import PlatformType


def _strip_markdown(md: str) -> str:
    """剥离 Markdown 语法返回纯文本。"""
    if not md:
        return ""
    # 移除图片
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", md)
    # 移除链接，保留文本
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # 移除标题井号
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # 移除加粗/斜体
    text = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", text)
    # 移除行内代码
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # 移除代码块
    text = re.sub(r"```[\s\S]*?```", "", text)
    # 移除引用
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)
    # 移除列表标记
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    # 移除水平线
    text = re.sub(r"^---+$", "", text, flags=re.MULTILINE)
    # 折叠多余空行
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def truncate_for_xiaohongshu(md: str, max_length: int = 1000) -> str:
    """小红书正文 ≤1000 字（§3.3）。"""
    plain = _strip_markdown(md)
    if len(plain) <= max_length:
        return plain
    return plain[: max_length - 3] + "..."


def truncate_for_weibo(md: str, max_length: int = 140) -> str:
    """微博 140 字。"""
    plain = _strip_markdown(md)
    return plain[:max_length]


def adapt_to_platform(md: str, platform: PlatformType) -> dict[str, Any]:
    """按平台适配内容。返回 {title, summary, content, is_long_form}。"""
    plain = _strip_markdown(md)
    # 取第一行或第一个段落作为标题候选
    first_line = plain.split("\n", 1)[0].strip() if plain else ""
    title = first_line[:50]

    if platform == PlatformType.XIAOHONGSHU:
        return {
            "title": title[:20],
            "summary": plain[:80],
            "content": truncate_for_xiaohongshu(md, 1000),
            "is_long_form": False,
        }
    if platform == PlatformType.WEIBO:
        return {
            "title": "",
            "summary": "",
            "content": truncate_for_weibo(md, 140),
            "is_long_form": False,
        }
    # 公众号、知乎、B站专栏：长文，保留 Markdown
    return {
        "title": title,
        "summary": plain[:120],
        "content": md,
        "is_long_form": True,
    }


def count_words(md: str) -> int:
    """估算字数（中文按字，英文按词）。"""
    plain = _strip_markdown(md)
    if not plain:
        return 0
    chinese = len(re.findall(r"[\u4e00-\u9fff]", plain))
    english_words = len(re.findall(r"[a-zA-Z]+", plain))
    return chinese + english_words


def extract_images(md: str) -> list[str]:
    """提取 Markdown 中所有图片 URL。"""
    if not md:
        return []
    return re.findall(r"!\[[^\]]*\]\(([^)]+)\)", md)
