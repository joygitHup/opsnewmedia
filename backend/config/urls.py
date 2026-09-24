"""config/urls.py — 项目路由聚合。

按 §18.2：
- URL 版本：/api/v1/
- 资源用复数名词
- 自定义动作用动词
- 用 DefaultRouter 自动生成
"""
from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # 健康检查（§22.3 不加认证）
    path("api/health/", include("apps.common.urls_health")),
    # API v1
    path("api/v1/", include([
        path("", include("apps.common.urls")),
        path("auth/", include(("apps.users.urls", "users"), namespace="auth")),
        path("teams/", include(("apps.teams.urls", "teams"), namespace="teams")),
        path("accounts/", include(("apps.accounts.urls", "accounts"), namespace="accounts")),
        path("content/", include(("apps.content.urls", "content"), namespace="content")),
        path("ai/", include(("apps.ai.urls", "ai"), namespace="ai")),
        path("publish/", include(("apps.publish.urls", "publish"), namespace="publish")),
        path("materials/", include(("apps.materials.urls", "materials"), namespace="materials")),
        path("dashboard/", include(("apps.dashboard.urls", "dashboard"), namespace="dashboard")),
        path("reviews/", include(("apps.reviews.urls", "reviews"), namespace="reviews")),
        path("integrations/", include(("apps.integrations.urls", "integrations"), namespace="integrations")),
        path("audit-logs/", include(("apps.audit_logs.urls", "audit_logs"), namespace="audit_logs")),
    ])),
    # OpenAPI 文档
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# 开发阶段服务静态/媒体文件
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
