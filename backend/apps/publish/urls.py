"""publish/urls.py — 发布任务路由（§18.2）。

/api/v1/publish/
  GET    /                    任务列表
  POST   /                    创建任务
  GET    /{id}/               任务详情
  POST   /{id}/retry/         手动重试
  POST   /{id}/cancel/        取消任务
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "publish"

router = DefaultRouter()
router.register("", views.PublishTaskViewSet, basename="publish-task")

urlpatterns = [
    path("", include(router.urls)),
]
