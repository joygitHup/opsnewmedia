"""audit_logs/urls.py — 操作日志路由。

/api/v1/audit-logs/
  GET /                日志列表
  GET /{id}/           日志详情
"""
from django.urls import path

from . import views

app_name = "audit_logs"

urlpatterns = [
    path("", views.AuditLogListView.as_view(), name="list"),
    path("<int:pk>/", views.AuditLogDetailView.as_view(), name="detail"),
]
