"""users/urls.py — 鉴权路由（§18.2）。

/api/v1/auth/
  POST register/
  POST login/
  POST logout/
  POST refresh/
  GET  me/
  PATCH me/
  POST change-password/
"""
from django.urls import path

from . import views

app_name = "auth"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="jwt-register"),
    path("login/", views.LoginView.as_view(), name="jwt-login"),
    path("logout/", views.LogoutView.as_view(), name="jwt-logout"),
    path("refresh/", views.RefreshView.as_view(), name="jwt-refresh"),
    path("me/", views.MeView.as_view(), name="me"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),
]
