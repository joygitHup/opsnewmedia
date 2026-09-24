"""accounts/urls.py — 平台账号路由（§18.2）。

/api/v1/accounts/
  GET    /                  账号列表
  POST   /                  绑定账号
  GET    /{id}/             账号详情
  PATCH  /{id}/             更新账号
  DELETE /{id}/             解绑账号
  PATCH  /{id}/status/     修改状态
  POST   /oauth/start/      OAuth 起点
  POST   /oauth/callback/   OAuth 回调
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "accounts"

router = DefaultRouter()
router.register("", views.AccountViewSet, basename="account")

urlpatterns = [
    path("", include(router.urls)),
]
