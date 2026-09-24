"""integrations/urls.py — 平台对接路由（§18.2）。

/api/v1/integrations/
  GET  /platforms/                 已接入平台列表
  POST /oauth/{platform}/start/    OAuth 起点
  GET  /oauth/{platform}/callback/ OAuth 回调（GET）
  POST /oauth/{platform}/callback/ OAuth 回调（POST）
"""
from django.urls import path

from . import views

app_name = "integrations"

urlpatterns = [
    path("platforms/", views.PlatformListView.as_view(), name="platforms"),
    path(
        "oauth/<str:platform>/start/",
        views.OAuthStartView.as_view(),
        name="oauth_start",
    ),
    path(
        "oauth/<str:platform>/callback/",
        views.OAuthCallbackView.as_view(),
        name="oauth_callback",
    ),
]
