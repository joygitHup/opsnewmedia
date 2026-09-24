"""common/utils_minio.py — MinIO 客户端单例 + presigned URL（§16.2）。

用途：素材上传、平台媒体文件中转。
"""
import logging
import mimetypes
import uuid
from typing import Optional
from urllib.parse import urlparse

from django.conf import settings
from django.core.cache import cache
from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)

_client: Optional[Minio] = None


def get_minio_client() -> Minio:
    """获取 MinIO 单例。"""
    global _client
    if _client is None:
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
    return _client


def ensure_bucket(bucket: str | None = None) -> str:
    """确保 bucket 存在。"""
    bucket = bucket or settings.MINIO_BUCKET
    client = get_minio_client()
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)
        logger.info("minio.bucket.created", extra={"bucket": bucket})
    return bucket


def generate_object_key(filename: str, prefix: str = "materials") -> str:
    """生成对象 key：日期分桶 + uuid 防冲突，不用用户原名（§21.4）。"""
    ext = ""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()
    today = timezone_now().strftime("%Y%m%d")
    return f"{prefix}/{today}/{uuid.uuid4().hex}{ext}"


def timezone_now():
    from django.utils import timezone
    return timezone.now()


def presigned_put_url(key: str, expires_hours: int = 1) -> str:
    """生成预签名 PUT URL。前端直传 MinIO。"""
    client = get_minio_client()
    bucket = ensure_bucket()
    from datetime import timedelta
    return client.presigned_put_object(bucket, key, expires=timedelta(hours=expires_hours))


def presigned_get_url(key: str, expires_hours: int = 1) -> str:
    client = get_minio_client()
    bucket = ensure_bucket()
    from datetime import timedelta
    return client.presigned_get_object(bucket, key, expires=timedelta(hours=expires_hours))


def upload_bytes(data: bytes, key: str, content_type: str = "application/octet-stream") -> str:
    """后端直接上传字节到 MinIO（如 AI 生成内容、平台下载媒体）。"""
    import io
    client = get_minio_client()
    bucket = ensure_bucket()
    client.put_object(bucket, key, io.BytesIO(data), len(data), content_type=content_type)
    return key


def upload_fileobj(fileobj, key: str, length: int, content_type: str = "application/octet-stream") -> str:
    """流式上传文件对象（Django UploadedFile 等），避免大文件全量读入内存。"""
    client = get_minio_client()
    bucket = ensure_bucket()
    client.put_object(
        bucket,
        key,
        fileobj,
        length,
        content_type=content_type or "application/octet-stream",
        part_size=10 * 1024 * 1024,
    )
    return key


def object_exists(key: str) -> bool:
    client = get_minio_client()
    bucket = ensure_bucket()
    try:
        client.stat_object(bucket, key)
        return True
    except S3Error as e:
        if e.code == "NoSuchKey":
            return False
        logger.warning("minio.stat_failed", extra={"key": key, "err": str(e)})
        return False


def guess_content_type(filename: str) -> str:
    return mimetypes.guess_type(filename)[0] or "application/octet-stream"
