"""common/urls_health.py — 健康检查（§22.3）。无认证。"""
from django.urls import path

from . import views

app_name = "common_health"

urlpatterns = [
    path("", views.health_check, name="health"),
    path("ready/", views.health_ready, name="ready"),
    path("live/", views.health_live, name="live"),
]
