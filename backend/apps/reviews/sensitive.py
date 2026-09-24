"""reviews/sensitive.py — DFA 敏感词检测（§6.7 / §21.2）。

自实现 Trie DFA，词库从 data/sensitive_words.txt 读取，可空。
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterable

# 默认词库路径
_WORDS_FILE = Path(__file__).parent / "data" / "sensitive_words.txt"

# 极简词库（文件不存在时兜底）
_DEFAULT_WORDS = ["广告", "诈骗", "赌博", "色情", "毒品", "违法"]


def _load_words() -> list[str]:
    if not _WORDS_FILE.exists():
        return _DEFAULT_WORDS
    words: list[str] = []
    with _WORDS_FILE.open(encoding="utf-8") as f:
        for line in f:
            w = line.strip()
            if w and not w.startswith("#"):
                words.append(w)
    return words or _DEFAULT_WORDS


def _build_trie(words: Iterable[str]) -> dict:
    """构建 DFA Trie。"""
    trie: dict = {}
    for word in words:
        node = trie
        for ch in word:
            node = node.setdefault(ch, {})
        node["__end__"] = True
    return trie


_TRIE: dict | None = None


def _get_trie() -> dict:
    global _TRIE
    if _TRIE is None:
        _TRIE = _build_trie(_load_words())
    return _TRIE


def reload_trie() -> None:
    """热更新词库。"""
    global _TRIE
    _TRIE = _build_trie(_load_words())


def detect(text: str) -> list[str]:
    """检测文本中的敏感词，返回去重后的命中列表。"""
    if not text:
        return []
    trie = _get_trie()
    hits: set[str] = set()
    n = len(text)
    for i in range(n):
        node = trie
        j = i
        while j < n and text[j] in node:
            node = node[text[j]]
            j += 1
            if "__end__" in node:
                hits.add(text[i:j])
    return sorted(hits)


def mask(text: str, replace: str = "*") -> str:
    """检测并掩码敏感词。"""
    if not text:
        return text
    trie = _get_trie()
    out = list(text)
    n = len(text)
    i = 0
    while i < n:
        node = trie
        j = i
        last_end = -1
        while j < n and text[j] in node:
            node = node[text[j]]
            j += 1
            if "__end__" in node:
                last_end = j
        if last_end > 0:
            for k in range(i, last_end):
                out[k] = replace
            i = last_end
        else:
            i += 1
    return "".join(out)
