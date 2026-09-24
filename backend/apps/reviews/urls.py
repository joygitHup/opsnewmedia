"""reviews/urls.py — 审核路由（§18.2）。

/api/v1/reviews/
  GET  /pending/                     待审列表
  POST /drafts/{draft_id}/submit/    提交审核
  POST /flows/{flow_id}/approve/     通过
  POST /flows/{flow_id}/reject/      驳回
  POST /flows/{flow_id}/rollback/    回滚
  POST /sensitive-check/             敏感词检测
"""
from django.urls import path

from . import views

app_name = "reviews"

urlpatterns = [
    path("pending/", views.PendingReviewsView.as_view(), name="pending"),
    path("drafts/<int:draft_id>/submit/", views.SubmitReviewView.as_view(), name="submit"),
    path("flows/<int:flow_id>/approve/", views.ApproveView.as_view(), name="approve"),
    path("flows/<int:flow_id>/reject/", views.RejectView.as_view(), name="reject"),
    path("flows/<int:flow_id>/rollback/", views.RollbackView.as_view(), name="rollback"),
    path("sensitive-check/", views.SensitiveCheckView.as_view(), name="sensitive-check"),
]
