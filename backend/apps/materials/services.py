"""materials/services.py — 素材业务逻辑（§6.6）。

- request_upload_url: 生成 presigned PUT URL（前端直传 MinIO）
- record_upload: 前端上传成功后回调入库
- 重复检测：同 team + 同 sha256 视为重复，复用已有 Material
- get_access_url: 生成临时可访问 URL（presigned GET）
"""
from __future__ import annotations

from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError
from apps.common.utils_minio import (
    generate_object_key,
    guess_content_type,
    object_exists,
    presigned_get_url,
    presigned_put_url,
    upload_bytes,
    upload_fileobj,
)
from apps.users.models import User

from .models import Material


@transaction.atomic
def request_upload_url(
    *,
    team_id: int,
    user: User,
    filename: str,
    material_type: str,
    size: int = 0,
    content_type: str = "",
    sha256: str = "",
) -> dict[str, Any]:
    """生成预签名 PUT URL。同 team + 同 sha256 直接复用。"""
    if sha256:
        existed = Material.objects.for_team(team_id).with_hash(sha256).first()
        if existed:
            return {
                "duplicate": True,
                "materialId": existed.id,
                "url": get_access_url(material=existed),
                "message": "素材已存在",
            }
    key = generate_object_key(filename, prefix=material_type)
    put_url = presigned_put_url(key, expires_hours=1)
    return {
        "duplicate": False,
        "objectKey": key,
        "uploadUrl": put_url,
        "contentType": content_type or guess_content_type(filename),
        "method": "PUT",
    }


@transaction.atomic
def record_upload(
    *,
    team_id: int,
    user: User,
    object_key: str,
    filename: str,
    material_type: str,
    size: int = 0,
    content_type: str = "",
    sha256: str = "",
    tags: list[str] | None = None,
    meta: dict | None = None,
) -> Material:
    """前端上传成功后回调写库。"""
    if not object_exists(object_key):
        raise BusinessError(
            ErrorCode.NOT_FOUND,
            "对象不存在，请确认已上传",
        )
    # 去重检查
    if sha256:
        existed = (
            Material.objects.for_team(team_id).with_hash(sha256).first()
        )
        if existed:
            # 已存在，可能需要补 tag
            return existed
    # url 不入库：签名 URL 超长且 24h 后过期，访问时由序列化器动态签名
    material = Material(
        team_id=team_id,
        uploader=user,
        type=material_type,
        name=filename,
        object_key=object_key,
        url="",
        size=size,
        content_type=content_type,
        hash_sha256=sha256,
        tags=tags or [],
        meta=meta or {},
    )
    material.save()
    return material


def get_access_url(*, material: Material, expires_hours: int = 24) -> str:
    """获取素材临时可访问 URL。"""
    if not material.object_key:
        return material.url
    return presigned_get_url(material.object_key, expires_hours=expires_hours)


@transaction.atomic
def update_material(*, material: Material, **fields: Any) -> Material:
    allowed = {"name", "tags", "meta"}
    for k, v in fields.items():
        if k in allowed:
            setattr(material, k, v)
    material.save()
    return material


@transaction.atomic
def delete_material(*, material: Material) -> None:
    """软删除素材。真实对象由清理任务定期清。"""
    material.delete()


def infer_material_type(*, filename: str, content_type: str) -> str:
    """按 MIME 推断素材类型；无法识别归为文档。"""
    ct = (content_type or "").lower()
    if ct.startswith("image/"):
        return "image"
    if ct.startswith("video/"):
        return "video"
    if ct.startswith("audio/"):
        return "audio"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in {"jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"}:
        return "image"
    if ext in {"mp4", "mov", "avi", "mkv", "webm", "flv"}:
        return "video"
    if ext in {"mp3", "wav", "flac", "aac", "m4a", "ogg"}:
        return "audio"
    return "document"


def store_proxied_upload(
    *,
    team_id: int,
    user: User,
    upload_file,
    material_type: str | None = None,
    tags: list[str] | None = None,
) -> Material:
    """同源代理上传：后端接收文件 → 算 sha256 去重 → 流式传 MinIO → 入库。

    upload_file: Django UploadedFile（.file 可 seek 的文件对象）。
    """
    import hashlib

    filename = upload_file.name
    content_type = upload_file.content_type or guess_content_type(filename)
    mat_type = material_type or infer_material_type(
        filename=filename, content_type=content_type
    )
    size = upload_file.size

    # 流式计算 sha256，再 seek 回起点用于上传
    sha = hashlib.sha256()
    upload_file.open()
    for chunk in upload_file.chunks():
        sha.update(chunk)
    sha256 = sha.hexdigest()
    upload_file.seek(0)

    # 同团队同 hash 去重，命中则直接复用，不再传 MinIO
    if sha256:
        existed = Material.objects.for_team(team_id).with_hash(sha256).first()
        if existed:
            return existed

    key = generate_object_key(filename, prefix=mat_type)
    upload_fileobj(upload_file, key, length=size, content_type=content_type)

    material = Material(
        team_id=team_id,
        uploader=user,
        type=mat_type,
        name=filename,
        object_key=key,
        url="",
        size=size,
        content_type=content_type,
        hash_sha256=sha256,
        tags=tags or [],
        meta={},
    )
    material.save()
    return material
