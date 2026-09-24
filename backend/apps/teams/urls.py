"""teams/urls.py — 团队路由（§18.2）。

/api/v1/teams/
  GET    /            我加入的团队列表
  POST   /            创建团队
  GET    /current/    当前切换的团队
  POST   /current/    切换当前团队
  GET    /{id}/       团队详情（含成员）
  PATCH  /{id}/       更新团队
  GET    /{id}/members/  成员列表
  PATCH  /{id}/members/{member_id}/  修改成员角色
  DELETE /{id}/members/{member_id}/  移除成员
  POST   /{id}/invite/  邀请
  POST   /{id}/upgrade/  升级套餐
  POST   /accept/     接受邀请
  GET    /roles/      角色权限矩阵
  GET    /plan/       套餐信息+使用量
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = "teams"

router = DefaultRouter()
router.register("", views.TeamViewSet, basename="team")

# 固定路径必须放在 router（含 <pk>/ 动态路由）之前，
# 否则 current/ accept/ roles/ plan/ 会被详情路由当成 pk 吞掉（404）。
urlpatterns = [
    path("current/", views.CurrentTeamView.as_view(), name="current"),
    path("accept/", views.AcceptInvitationView.as_view(), name="accept"),
    path("roles/", views.RolesView.as_view(), name="roles"),
    path("plan/", views.PlanView.as_view(), name="plan"),
    path("", include(router.urls)),
]
