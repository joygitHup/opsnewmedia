"""common/urls.py — API 根信息与默认路由。"""
from django.urls import path

from . import views

app_name = "common"

urlpatterns = [
    path("", views.api_root, name="root"),
]
