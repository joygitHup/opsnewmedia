"""knowledge/tasks.py — Celery 异步任务。

开发环境 CELERY_TASK_ALWAYS_EAGER=True 时同步执行（无需 worker）。
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=0)
def process_knowledge_doc(self, doc_id: int):  # noqa: ANN001
    """异步处理知识文档：解析→分块→向量化→入库。"""
    from .services import process_document

    process_document(doc_id)
    return doc_id
