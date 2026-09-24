"""materials/urls.py — 素材路由（§18.2）。

/api/v1/materials/
  GET    /                    素材列表
  POST   /                    入库素材（上传回调）
  GET    /{id}/               素材详情
  PATCH  /{id}/               更新素材
  DELETE /{id}/               删除素材
  POST   /upload-url/         申请 presigned PUT URL
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "materials"

router = DefaultRouter()
router.register("", views.MaterialViewSet, basename="material")

urlpatterns = [
    path("", include(router.urls)),
]
