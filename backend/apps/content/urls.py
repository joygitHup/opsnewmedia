"""content/urls.py — 内容草稿路由（§18.2）。

/api/v1/content/
  GET    /                     草稿列表
  POST   /                     创建草稿
  GET    /{id}/                草稿详情
  PATCH  /{id}/                更新草稿
  DELETE /{id}/                删除草稿
  PATCH  /{id}/status/         修改状态
  GET    /{id}/preview?platform=xx  平台预览
  POST   /{id}/preview         平台预览（POST）
  GET    /{id}/versions/       版本列表
  GET    /{id}/versions/{v}/   版本详情
  POST   /{id}/versions/{v}/rollback/ 回滚到指定版本
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "content"

router = DefaultRouter()
router.register("", views.ContentDraftViewSet, basename="draft")

urlpatterns = [
    path("", include(router.urls)),
]
