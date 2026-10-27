"""knowledge/views.py — 知识库 API。

- POST /api/v1/knowledge/upload/   multipart 文件上传（md/txt/pdf/docx ≤20MB，SHA256 去重）
- POST /api/v1/knowledge/paste/    粘贴文本导入（≤20000 字符）
- GET  /api/v1/knowledge/docs/     文档列表（分页/search/status/source 筛选）
- PATCH /api/v1/knowledge/docs/{pk}/  更新文档标题
- DELETE /api/v1/knowledge/docs/{pk}/  删除文档（软删 + 删 chunks + 删 MinIO 对象）
- DELETE /api/v1/knowledge/batch/  批量删除
- POST /api/v1/knowledge/docs/{pk}/reparse/  重新解析失败文档
- GET  /api/v1/knowledge/docs/{pk}/chunks/   分块查看
- POST /api/v1/knowledge/search/   检索测试（向量 top-k）
- POST /api/v1/knowledge/qa/ask/   知识库问答（RAG + 多轮历史）
"""
from __future__ import annotations

import hashlib
import logging
import os

from django.db import models as dj_models
from django.db.models import Q
from rest_framework import status as drf_status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.ai.services import _call_llm
from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError
from apps.common.pagination import StandardPagination
from apps.common.response import ok
from apps.common.team_scope import resolve_team_id as _resolve_team_id

from .models import KnowledgeChunk, KnowledgeDoc
from .serializers import (
    KnowledgeBatchDeleteSerializer,
    KnowledgeChunkSerializer,
    KnowledgeDocListSerializer,
    KnowledgePasteSerializer,
    KnowledgeQAAskSerializer,
    KnowledgeSearchSerializer,
    KnowledgeUpdateTitleSerializer,
)
from .services import (
    batch_delete_document,
    delete_document,
    MAX_PASTE_CHARS,
    retry_document,
    search_chunks,
)
from .tasks import process_knowledge_doc

logger = logging.getLogger(__name__)

ALLOWED_EXTS = {".md", ".txt", ".pdf", ".docx"}
MAX_DOC_SIZE = 20 * 1024 * 1024  # 20MB

QA_SYSTEM_PROMPT = (
    "你是企业知识库问答助手。请仅依据下面的【引用内容】回答用户问题；"
    "若引用内容不足以回答，请明确说明\"根据现有知识库无法回答该问题\"，"
    "不要编造。回答使用简体中文，简洁准确，必要时分点陈述。"
)


def _get_team_doc(request: Request, pk: int) -> KnowledgeDoc:
    team_id = _resolve_team_id(request)
    doc = KnowledgeDoc.objects.filter(pk=pk, team_id=team_id).first()
    if doc is None:
        raise BusinessError(ErrorCode.NOT_FOUND, "知识文档不存在")
    return doc


def _ensure_not_duplicated(team_id: int, file_hash: str, action: str) -> None:
    """同团队同内容去重：ready 的拒绝重复；failed/pending 的旧记录清理掉避免堆积。"""
    same = KnowledgeDoc.objects.filter(team_id=team_id, sha256=file_hash)
    ready = same.filter(status=KnowledgeDoc.Status.READY).first()
    if ready:
        raise BusinessError(
            ErrorCode.BUSINESS_ERROR,
            f"知识库中已存在相同内容的文档「{ready.title}」，无需重复{action}",
        )
    stale_ids = list(
        same.exclude(status=KnowledgeDoc.Status.READY).values_list("id", flat=True)
    )
    if stale_ids:
        batch_delete_document(stale_ids)


def _build_qa_prompt(question: str, context: str, history: list[dict]) -> str:
    """拼装 QA 用户 prompt：历史对话 + 引用内容 + 当前问题。"""
    parts: list[str] = []
    if history:
        parts.append("【历史对话】")
        # 只保留最近 6 条、每条截断 500 字，避免多轮对话把 prompt 撑爆
        for h in history[-6:]:
            role = "用户" if h["role"] == "user" else "助手"
            parts.append(f"{role}：{h['content'][:500]}")
        parts.append("")
    if context:
        parts.append(f"【引用内容】\n{context}")
        parts.append("")
    parts.append(f"【问题】{question}")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# 文档管理
# ---------------------------------------------------------------------------

class KnowledgeDocListView(ListAPIView):
    """文档列表（分页 / search / status / sourceType）。"""

    permission_classes = [IsAuthenticated]
    serializer_class = KnowledgeDocListSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        team_id = _resolve_team_id(self.request)
        qs = KnowledgeDoc.objects.filter(team_id=team_id)
        keyword = self.request.query_params.get("search", "")
        if keyword:
            qs = qs.filter(Q(title__icontains=keyword) | Q(file_name__icontains=keyword))
        st = self.request.query_params.get("status", "")
        if st:
            qs = qs.filter(status=st)
        src = self.request.query_params.get("sourceType", "")
        if src:
            qs = qs.filter(source_type=src)
        return qs


class KnowledgeUploadView(APIView):
    """multipart 上传文档，异步解析入向量库（SHA256 去重）。"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request):
        team_id = _resolve_team_id(request)
        f = request.FILES.get("file")
        if f is None:
            raise BusinessError(ErrorCode.INVALID_PARAM, "缺少文件")
        ext = os.path.splitext(f.name)[1].lower()
        if ext not in ALLOWED_EXTS:
            raise BusinessError(
                ErrorCode.INVALID_PARAM,
                f"不支持的文件类型 {ext}，仅支持 md / txt / pdf / docx",
            )
        if f.size > MAX_DOC_SIZE:
            raise BusinessError(ErrorCode.INVALID_PARAM, "文件大小不能超过 20MB")

        data = f.read()
        file_hash = hashlib.sha256(data).hexdigest()

        # SHA256 去重（ready 拒绝 / 失败记录清理后重传）
        _ensure_not_duplicated(team_id, file_hash, "上传")

        from apps.common.utils_minio import generate_object_key, guess_content_type, upload_bytes

        mime = guess_content_type(f.name)
        key = generate_object_key(f.name, prefix="knowledge")
        upload_bytes(data, key, content_type=mime)

        title = (request.data.get("title") or "").strip() or os.path.splitext(f.name)[0]
        doc = KnowledgeDoc.objects.create(
            team_id=team_id,
            created_by=request.user,
            title=title[:255],
            source_type=KnowledgeDoc.SourceType.UPLOAD,
            object_key=key,
            sha256=file_hash,
            file_name=f.name,
            file_size=f.size,
            mime_type=mime,
        )
        process_knowledge_doc.delay(doc.id)
        return ok(
            KnowledgeDocListSerializer(doc).data,
            message="上传成功，正在解析",
            status=drf_status.HTTP_201_CREATED,
        )


class KnowledgePasteView(APIView):
    """粘贴文本导入，异步解析入向量库（≤20000 字符）。"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request):
        team_id = _resolve_team_id(request)
        ser = KnowledgePasteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        title = ser.validated_data["title"].strip()
        content = ser.validated_data["content"]
        if not content.strip():
            raise BusinessError(ErrorCode.INVALID_PARAM, "内容不能为空")
        if len(content) > MAX_PASTE_CHARS:
            raise BusinessError(
                ErrorCode.INVALID_PARAM,
                f"粘贴内容不能超过 {MAX_PASTE_CHARS} 字符",
            )

        from apps.common.utils_minio import generate_object_key, upload_bytes

        data = content.encode("utf-8")
        file_hash = hashlib.sha256(data).hexdigest()

        # SHA256 去重（ready 拒绝 / 失败记录清理后重新导入）
        _ensure_not_duplicated(team_id, file_hash, "导入")

        key = generate_object_key("paste.md", prefix="knowledge")
        upload_bytes(data, key, content_type="text/markdown")

        doc = KnowledgeDoc.objects.create(
            team_id=team_id,
            created_by=request.user,
            title=title,
            source_type=KnowledgeDoc.SourceType.PASTE,
            object_key=key,
            sha256=file_hash,
            file_name=f"{title[:100]}.md",
            file_size=len(data),
            mime_type="text/markdown",
        )
        process_knowledge_doc.delay(doc.id)
        return ok(
            KnowledgeDocListSerializer(doc).data,
            message="导入成功，正在解析",
            status=drf_status.HTTP_201_CREATED,
        )


class KnowledgeDocDetailView(APIView):
    """删除 / 更新标题 / 重新解析 单个文档。"""

    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, pk: int):
        _get_team_doc(request, pk)  # 校验存在性与团队归属
        delete_document(pk)
        return ok(None, message="已删除")

    def patch(self, request: Request, pk: int):
        doc = _get_team_doc(request, pk)
        ser = KnowledgeUpdateTitleSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        new_title = ser.validated_data.get("title")
        if new_title:
            doc.title = new_title.strip()[:255]
            doc.save(update_fields=["title", "updated_at"])
        return ok(KnowledgeDocListSerializer(doc).data, message="已更新")


class KnowledgeReparseView(APIView):
    """重新解析失败 / 待处理文档。"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: int):
        _get_team_doc(request, pk)  # 校验
        retry_document(pk)
        return ok(None, message="已重新开始解析")


class KnowledgeBatchDeleteView(APIView):
    """批量删除文档。"""

    permission_classes = [IsAuthenticated]

    def delete(self, request: Request):
        team_id = _resolve_team_id(request)
        ser = KnowledgeBatchDeleteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ids = ser.validated_data["ids"]
        # 过滤掉不属于本团队的
        valid_ids = list(
            KnowledgeDoc.objects.filter(id__in=ids, team_id=team_id).values_list("id", flat=True)
        )
        if not valid_ids:
            raise BusinessError(ErrorCode.NOT_FOUND, "未找到可删除的文档")
        batch_delete_document(valid_ids)
        return ok({"count": len(valid_ids)}, message=f"已删除 {len(valid_ids)} 个文档")


class KnowledgeChunkListView(ListAPIView):
    """查看文档分块（含内容预览，不含向量）。"""

    permission_classes = [IsAuthenticated]
    serializer_class = KnowledgeChunkSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        team_id = _resolve_team_id(self.request)
        doc_id = self.kwargs["pk"]
        return KnowledgeChunk.objects.filter(doc_id=doc_id, team_id=team_id)


# ---------------------------------------------------------------------------
# 检索与问答
# ---------------------------------------------------------------------------

class KnowledgeSearchView(APIView):
    """检索测试：返回 top-k 相关分块。"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request):
        team_id = _resolve_team_id(request)
        ser = KnowledgeSearchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        query = ser.validated_data["query"].strip()
        if not query:
            raise BusinessError(ErrorCode.INVALID_PARAM, "query 不能为空")
        hits = search_chunks(
            team_id=team_id,
            query=query,
            top_k=ser.validated_data["topK"],
            doc_ids=ser.validated_data.get("docIds") or None,
        )
        # 检索测试不统计引用次数（仅真实问答计入）
        return ok(
            {
                "results": [
                    {
                        "docId": c.doc_id,
                        "docTitle": c.doc.title,
                        "chunkIdx": c.idx,
                        "content": c.content,
                        "score": round(s, 4),
                    }
                    for c, s in hits
                ]
            }
        )


class KnowledgeQAAskView(APIView):
    """知识库问答：检索 top-k 注入提示词，LLM 依据引用回答（支持多轮历史）。"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request):
        team_id = _resolve_team_id(request)
        ser = KnowledgeQAAskSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        question = ser.validated_data["question"].strip()
        if not question:
            raise BusinessError(ErrorCode.INVALID_PARAM, "问题不能为空")
        history = ser.validated_data.get("history") or []

        from .services import build_rag_context

        # 检索 query = 当前问题（历史只用于 prompt 组装，不参与检索）
        context, sources = build_rag_context(
            team_id=team_id, query=question, top_k=ser.validated_data["topK"]
        )
        user_prompt = _build_qa_prompt(question, context, history)

        # 统计：命中的文档 hit_count +1
        if sources:
            doc_ids_hit = {s["docId"] for s in sources}
            KnowledgeDoc.objects.filter(id__in=doc_ids_hit).update(
                hit_count=dj_models.F("hit_count") + 1
            )

        answer = _call_llm(
            system_prompt=QA_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            user=request.user,
            team_id=team_id,
            action="knowledge_qa",
        )
        return ok({"answer": answer, "sources": sources})
