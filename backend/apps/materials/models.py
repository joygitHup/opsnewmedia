"""materials/models.py — 素材（§6.6）。

- 统一存储图片/视频/音频/文档
- MinIO object key + sha256 用于去重
- 团队作用域，个人素材 + 团队共享
"""
from django.conf import settings
from django.db import models

from apps.common.constants import MaterialType
from apps.common.models import (
    SoftDeleteManager,
    SoftDeleteModel,
    SoftDeleteQuerySet,
    TeamScopedModel,
    TimeStampedModel,
)


class MaterialQuerySet(SoftDeleteQuerySet):
    """§2.1：常用 filter 抽到 QuerySet。

    继承 SoftDeleteQuerySet 以保留软删除过滤（默认排除 is_deleted=True）；
    否则 as_manager() 创建的普通 Manager 不会过滤已删除记录，导致删除后数据仍在列表。
    """

    def for_team(self, team_id: int):
        return self.filter(team_id=team_id)

    def for_uploader(self, user_id: int):
        return self.filter(uploader_id=user_id)

    def for_type(self, material_type: str):
        return self.filter(type=material_type)

    def with_hash(self, sha256: str):
        return self.filter(hash_sha256=sha256)


class Material(TeamScopedModel, TimeStampedModel, SoftDeleteModel):
    """素材。"""

    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="materials",
        verbose_name="上传者",
    )
    type = models.CharField(
        "类型",
        max_length=20,
        choices=MaterialType.choices,
        db_index=True,
    )
    name = models.CharField("素材名", max_length=255)
    object_key = models.CharField("MinIO key", max_length=512, db_index=True)
    # 存稳定路径（不存带签名的临时 URL：签名串超长且会过期）；
    # 对外访问地址由序列化器在响应时用 presigned GET 动态生成。
    url = models.URLField("稳定访问路径", max_length=1024, blank=True, default="")
    size = models.BigIntegerField("大小(bytes)", default=0)
    content_type = models.CharField("MIME 类型", max_length=128, blank=True, default="")
    hash_sha256 = models.CharField(
        "SHA256", max_length=64, blank=True, default="", db_index=True
    )
    tags = models.JSONField("标签", default=list, blank=True)
    meta = models.JSONField("元数据", default=dict, blank=True)

    objects = SoftDeleteManager.from_queryset(MaterialQuerySet)()

    class Meta:
        db_table = "materials"
        verbose_name = "素材"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["team", "type"]),
            models.Index(fields=["team", "hash_sha256"]),
            models.Index(fields=["uploader", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_type_display()})"
