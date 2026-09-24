"""dashboard/urls.py — 看板路由（§18.2）。

/api/v1/dashboard/
  GET /overview/         总览
  GET /trend/            趋势
  GET /distribution/     平台分布
  GET /top-contents/     内容排行
  GET /publish-queue/    发布队列
"""
from django.urls import path

from . import views

app_name = "dashboard"

urlpatterns = [
    path("overview/", views.OverviewView.as_view(), name="overview"),
    path("trend/", views.TrendView.as_view(), name="trend"),
    path("distribution/", views.PlatformDistributionView.as_view(), name="distribution"),
    path("top-contents/", views.TopContentsView.as_view(), name="top-contents"),
    path("publish-queue/", views.PublishQueueView.as_view(), name="publish-queue"),
]
