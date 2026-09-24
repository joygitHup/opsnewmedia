"""common/models.py — 公共抽象基类与 mixin（§2.3 / §2.4）。

- TimeStampedModel: created_at / updated_at
- SoftDeleteModel: is_deleted / deleted_at + 自定义 Manager 默认过滤
- TeamScopedModel: 团队作用域基类
"""
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """通用时间字段：创建 + 更新。"""

    created_at = models.DateTimeField("创建时间", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    """软删除 QuerySet。

    - 默认通过 Manager 过滤 is_deleted=False
    - all_with_deleted() 返回包含已删除的 QuerySet
    - delete() 走软删除，hard_delete() 走真删
    """

    def all_with_deleted(self):
        # 绕过 Manager 的过滤，直接返回 QuerySet 全部行
        return self.all()._chain()

    def delete(self, *args, **kwargs):
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self, *args, **kwargs):
        return super().delete(*args, **kwargs)


class SoftDeleteManager(models.Manager):
    """软删除 Manager：默认过滤 is_deleted=False。

    get_queryset 使用 _queryset_class（由 from_queryset 设置），
    这样 from_queryset(MaterialQuerySet) 创建的 Manager
    既能保留软删除过滤，又能返回带自定义方法的 QuerySet。
    """

    def get_queryset(self):
        qs_class = getattr(self, "_queryset_class", SoftDeleteQuerySet)
        return qs_class(self.model, using=self._db).filter(is_deleted=False)

    def all_with_deleted(self):
        qs_class = getattr(self, "_queryset_class", SoftDeleteQuerySet)
        return qs_class(self.model, using=self._db).all()

    def deleted_only(self):
        qs_class = getattr(self, "_queryset_class", SoftDeleteQuerySet)
        return qs_class(self.model, using=self._db).filter(is_deleted=True)


class SoftDeleteModel(models.Model):
    """软删除基类（§2.3）。"""

    is_deleted = models.BooleanField("是否删除", default=False, db_index=True)
    deleted_at = models.DateTimeField("删除时间", null=True, blank=True)

    objects = SoftDeleteManager()

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        """重写 delete 为软删除。force=True 时真删。"""
        if kwargs.pop("force", False):
            return super().delete(*args, **kwargs)
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])


class TeamScopedModel(models.Model):
    """团队作用域基类：所有业务模型继承以做隔离。"""

    team = models.ForeignKey(
        "teams.Team",
        on_delete=models.CASCADE,
        related_name="+",
        verbose_name="所属团队",
    )

    class Meta:
        abstract = True
