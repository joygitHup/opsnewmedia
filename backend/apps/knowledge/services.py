"""knowledge/services.py — RAG 核心逻辑。

- extract_text: 按文件类型解析纯文本（md/txt/pdf/docx）
- chunk_text: 按段落聚合分块（约 500 字、相邻重叠 50 字）
- embed_texts: 批量调用千文 embeddings（text-embedding-v3，1024 维）
- search_chunks: 向量化 query → 全量候选暴力余弦 → top-k
- build_rag_context: 检索并组装提示词引用上下文
- process_document: 文档处理流水线（解析→分块→向量化→入库）
- delete_document: 删文档 + 删 chunks + 删 MinIO 对象
"""
from __future__ import annotations

import hashlib
import io
import logging
import re

import numpy as np
from django.conf import settings

from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError

logger = logging.getLogger(__name__)

CHUNK_SIZE = 500  # 分块目标长度（字符）
CHUNK_OVERLAP = 50  # 相邻块重叠字符
EMBED_MODEL = "text-embedding-v3"
BATCH_SIZE = 10  # 每批 embedding 条数（千文 text-embedding-v3 上限 10）
MAX_INPUT_CHARS = 8000  # 单条 embedding 输入截断
MAX_PASTE_CHARS = 20000  # 粘贴导入最大字符数


# ---------------------------------------------------------------------------
# MinIO 辅助
# ---------------------------------------------------------------------------

def _minio_delete(key: str) -> None:
    """删 MinIO 对象（静默，失败只记日志）。"""
    if not key:
        return
    try:
        from apps.common.utils_minio import ensure_bucket, get_minio_client

        client = get_minio_client()
        bucket = ensure_bucket()
        client.remove_object(bucket, key)
        logger.info("knowledge.minio_deleted key=%s", key)
    except Exception:  # noqa: BLE001
        logger.warning("knowledge.minio_delete_failed key=%s", key, exc_info=True)


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ---------------------------------------------------------------------------
# embedding 客户端
# ---------------------------------------------------------------------------

def _embed_client():
    """延迟 import openai，复用千文 OpenAI 兼容端点。"""
    from openai import OpenAI

    if not settings.AI_API_KEY:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "AI_API_KEY 未配置")
    return OpenAI(api_key=settings.AI_API_KEY, base_url=settings.AI_API_BASE)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """批量 embedding，返回向量列表（与输入顺序一致）。"""
    if not texts:
        return []
    client = _embed_client()
    vectors: list[list[float]] = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = [t[:MAX_INPUT_CHARS] for t in texts[i : i + BATCH_SIZE]]
        resp = client.embeddings.create(model=EMBED_MODEL, input=batch)
        batch_vecs = [d.embedding for d in sorted(resp.data, key=lambda d: d.index)]
        vectors.extend(batch_vecs)
    return vectors


# ---------------------------------------------------------------------------
# 文本解析与分块
# ---------------------------------------------------------------------------

def extract_text(file_bytes: bytes, mime: str, filename: str) -> str:
    """按文件类型解析出纯文本。"""
    name = (filename or "").lower()
    mime = mime or ""
    if name.endswith(".pdf") or mime == "application/pdf":
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n\n".join((page.extract_text() or "") for page in reader.pages)
    if name.endswith(".docx") or "wordprocessingml" in mime:
        import docx as pydocx

        d = pydocx.Document(io.BytesIO(file_bytes))
        return "\n\n".join(p.text for p in d.paragraphs if p.text.strip())
    # md/txt 及其他文本类型（兼容 GBK 编码）
    for enc in ("utf-8", "gb18030"):
        try:
            return file_bytes.decode(enc)
        except UnicodeDecodeError:
            continue
    return file_bytes.decode("utf-8", errors="ignore")


def chunk_text(text: str) -> list[str]:
    """按空行分段聚合分块；超长段落滑窗切分。"""
    text = (text or "").strip()
    if not text:
        return []
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paras:
        if len(p) > CHUNK_SIZE:
            if buf:
                chunks.append(buf)
                buf = ""
            step = CHUNK_SIZE - CHUNK_OVERLAP
            for i in range(0, len(p), step):
                chunks.append(p[i : i + CHUNK_SIZE])
                if i + CHUNK_SIZE >= len(p):
                    break
            continue
        if buf and len(buf) + len(p) + 1 > CHUNK_SIZE:
            chunks.append(buf)
            buf = p
        else:
            buf = f"{buf}\n{p}" if buf else p
    if buf:
        chunks.append(buf)
    return [c.strip() for c in chunks if c.strip()]


# ---------------------------------------------------------------------------
# 检索
# ---------------------------------------------------------------------------

def cosine_topk(
    query_vec: list[float], cand_vecs: list[list[float]], top_k: int = 5
) -> list[tuple[int, float]]:
    """暴力余弦相似度 top-k，返回 [(候选下标, 分数), ...]。"""
    if not cand_vecs:
        return []
    q = np.asarray(query_vec, dtype=np.float32)
    m = np.asarray(cand_vecs, dtype=np.float32)
    q_norm = float(np.linalg.norm(q)) or 1e-9
    m_norm = np.linalg.norm(m, axis=1)
    m_norm[m_norm == 0] = 1e-9
    scores = (m @ q) / (m_norm * q_norm)
    order = np.argsort(-scores)[:top_k]
    return [(int(i), float(scores[i])) for i in order]


def search_chunks(
    *,
    team_id: int,
    query: str,
    top_k: int = 5,
    doc_ids: list[int] | None = None,
) -> list[tuple]:
    """检索：返回 [(KnowledgeChunk, score), ...]，按相似度降序。"""
    from .models import KnowledgeChunk

    qs = KnowledgeChunk.objects.filter(team_id=team_id).select_related("doc")
    if doc_ids:
        qs = qs.filter(doc_id__in=doc_ids)
    chunks = list(qs.only("id", "doc_id", "idx", "content", "embedding", "doc__title"))
    if not chunks:
        return []
    qvec = embed_texts([query])[0]
    scored = cosine_topk(qvec, [c.embedding for c in chunks], top_k=min(top_k, len(chunks)))
    return [(chunks[i], score) for i, score in scored]


def build_rag_context(
    *, team_id: int, query: str, top_k: int = 5, min_score: float = 0.3
) -> tuple[str, list[dict]]:
    """检索并组装提示词上下文。返回 (context_text, sources)。

    min_score 过滤低相关块（余弦 < 0.3 视为不相关，避免噪声注入）。
    """
    hits = search_chunks(team_id=team_id, query=query, top_k=top_k)
    hits = [(c, s) for c, s in hits if s >= min_score]
    if not hits:
        return "", []
    parts: list[str] = []
    sources: list[dict] = []
    for chunk, score in hits:
        parts.append(f"【引用{len(parts) + 1}】{chunk.content}")
        sources.append(
            {
                "docId": chunk.doc_id,
                "docTitle": chunk.doc.title,
                "chunkIdx": chunk.idx,
                "score": round(score, 4),
            }
        )
    return "\n\n".join(parts), sources


# ---------------------------------------------------------------------------
# 文档处理流水线
# ---------------------------------------------------------------------------

def _download_bytes(key: str) -> bytes:
    from apps.common.utils_minio import ensure_bucket, get_minio_client

    client = get_minio_client()
    bucket = ensure_bucket()
    resp = client.get_object(bucket, key)
    try:
        return resp.read()
    finally:
        resp.close()
        resp.release_conn()


def process_document(doc_id: int) -> None:
    """解析 → 分块 → 向量化 → 入库。由 Celery 任务调用。

    任何异常只标记 failed，不抛出（避免 Celery 无限重试）。
    """
    from .models import KnowledgeChunk, KnowledgeDoc

    doc = KnowledgeDoc.objects.filter(id=doc_id).first()
    if doc is None:
        logger.warning("knowledge.doc_missing doc=%s", doc_id)
        return
    try:
        doc.status = KnowledgeDoc.Status.PROCESSING
        doc.error_msg = ""
        doc.save(update_fields=["status", "error_msg", "updated_at"])

        raw = _download_bytes(doc.object_key)
        text = extract_text(raw, doc.mime_type, doc.file_name)
        chunks = chunk_text(text)
        if not chunks:
            raise BusinessError(ErrorCode.BUSINESS_ERROR, "未解析到有效文本内容")

        vectors = embed_texts(chunks)
        # 先清旧块，保证重试幂等
        KnowledgeChunk.objects.filter(doc=doc).delete()
        KnowledgeChunk.objects.bulk_create(
            [
                KnowledgeChunk(
                    doc=doc,
                    team_id=doc.team_id,
                    idx=i,
                    content=c,
                    embedding=v,
                    token_count=len(c),
                )
                for i, (c, v) in enumerate(zip(chunks, vectors))
            ]
        )
        doc.chunk_count = len(chunks)
        doc.status = KnowledgeDoc.Status.READY
        doc.error_msg = ""
        doc.save(update_fields=["chunk_count", "status", "error_msg", "updated_at"])
        logger.info("knowledge.doc_ready doc=%s chunks=%s", doc_id, len(chunks))
    except Exception as exc:  # noqa: BLE001
        logger.exception("knowledge.process_failed doc=%s", doc_id)
        doc.status = KnowledgeDoc.Status.FAILED
        doc.error_msg = str(exc)[:500]
        doc.save(update_fields=["status", "error_msg", "updated_at"])


def retry_document(doc_id: int) -> None:
    """重置文档状态并重新触发解析。"""
    from .models import KnowledgeDoc

    doc = KnowledgeDoc.objects.filter(id=doc_id).first()
    if doc is None:
        raise BusinessError(ErrorCode.NOT_FOUND, "知识文档不存在")
    doc.status = KnowledgeDoc.Status.PENDING
    doc.error_msg = ""
    doc.chunk_count = 0
    doc.save(update_fields=["status", "error_msg", "chunk_count", "updated_at"])
    from .tasks import process_knowledge_doc

    process_knowledge_doc.delay(doc.id)


def delete_document(doc_id: int) -> None:
    """删文档 + 删 chunks + 删 MinIO 对象。"""
    from .models import KnowledgeChunk, KnowledgeDoc

    doc = KnowledgeDoc.objects.filter(id=doc_id).first()
    if doc is None:
        return
    object_key = doc.object_key
    # 软删文档
    doc.delete()
    # 硬删向量块（非软删除模型）
    KnowledgeChunk.objects.filter(doc_id=doc_id).delete()
    # 删 MinIO 对象
    _minio_delete(object_key)


def batch_delete_document(doc_ids: list[int]) -> None:
    """批量删文档。"""
    from .models import KnowledgeChunk, KnowledgeDoc

    docs = list(KnowledgeDoc.objects.filter(id__in=doc_ids))
    if not docs:
        return
    keys = [d.object_key for d in docs if d.object_key]
    KnowledgeChunk.objects.filter(doc_id__in=doc_ids).delete()
    for d in docs:
        d.delete()
    for k in keys:
        _minio_delete(k)
