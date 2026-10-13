"""notifications/urls.py — 通知消息路由。

固定路径（unread-count/、read-all/）必须放在动态 <pk>/ 路由之前。
"""
from django.urls import path

from . import views

app_name = "notifications"

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="list"),
    path("unread-count/", views.UnreadCountView.as_view(), name="unread_count"),
    path("read-all/", views.ReadAllView.as_view(), name="read_all"),
    path("<int:pk>/read/", views.MarkReadView.as_view(), name="mark_read"),
]
