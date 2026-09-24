"""ai/urls.py — AI 路由（§18.2）。

/api/v1/ai/
  POST /generate/   内容生成
  POST /polish/     内容润色
  POST /title/      标题生成
  POST /tags/       标签推荐
"""
from django.urls import path

from . import views

app_name = "ai"

urlpatterns = [
    path("generate/", views.GenerateView.as_view(), name="generate"),
    path("polish/", views.PolishView.as_view(), name="polish"),
    path("title/", views.TitleView.as_view(), name="title"),
    path("tags/", views.TagsView.as_view(), name="tags"),
]
