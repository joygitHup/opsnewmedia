"""knowledge/urls.py — 知识库路由（固定路径在前，动态 pk 在后）。"""
from django.urls import path

from . import views

urlpatterns = [
    path("docs/", views.KnowledgeDocListView.as_view()),
    path("upload/", views.KnowledgeUploadView.as_view()),
    path("paste/", views.KnowledgePasteView.as_view()),
    path("batch/", views.KnowledgeBatchDeleteView.as_view()),
    path("search/", views.KnowledgeSearchView.as_view()),
    path("qa/ask/", views.KnowledgeQAAskView.as_view()),
    path("docs/<int:pk>/chunks/", views.KnowledgeChunkListView.as_view()),
    path("docs/<int:pk>/reparse/", views.KnowledgeReparseView.as_view()),
    path("docs/<int:pk>/", views.KnowledgeDocDetailView.as_view()),
]
