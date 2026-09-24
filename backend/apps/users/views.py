"""users/views.py — 鉴权视图（§4.1 / §4.5）。"""
from drf_spectacular.utils import OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.response import ok

from . import services
from .models import User
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    RefreshSerializer,
    RegisterSerializer,
    UserMeSerializer,
    UserReadSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    @extend_schema(
        request=RegisterSerializer,
        responses={200: UserReadSerializer},
        summary="注册",
    )
    def post(self, request: Request) -> Response:
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user, tokens = services.register_user(**ser.validated_data)
        data = UserReadSerializer(user).data
        data["tokens"] = tokens
        return ok(data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    @extend_schema(
        request=LoginSerializer,
        responses={200: UserReadSerializer},
        summary="登录",
    )
    def post(self, request: Request) -> Response:
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user, tokens = services.login_user(**ser.validated_data)
        data = UserReadSerializer(user).data
        data["tokens"] = tokens
        return ok(data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RefreshSerializer

    @extend_schema(
        request=RefreshSerializer,
        responses={200: OpenApiTypes.OBJECT},
        summary="登出（黑名单 refresh token）",
    )
    def post(self, request: Request) -> Response:
        ser = RefreshSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        services.logout_user(ser.validated_data["refresh"])
        return ok({"message": "已登出"})


class RefreshView(APIView):
    permission_classes = [AllowAny]
    serializer_class = RefreshSerializer

    @extend_schema(
        request=RefreshSerializer,
        responses={200: OpenApiTypes.OBJECT},
        summary="刷新 access token",
    )
    def post(self, request: Request) -> Response:
        ser = RefreshSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        tokens = services.refresh_token(ser.validated_data["refresh"])
        return ok(tokens)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserMeSerializer

    def get_queryset(self):
        # 不在此处查 DB；通过 prefetch
        return User.objects.filter(pk=self.request.user.pk).prefetch_related(
            "team_members__team"
        )

    @extend_schema(responses={200: UserMeSerializer}, summary="当前用户详情")
    def get(self, request: Request) -> Response:
        # 重新查一次，预加载 teams
        user = (
            User.objects.filter(pk=request.user.pk)
            .prefetch_related("team_members__team")
            .first()
        )
        # 通过 setattr 让 serializer 不再重复查询
        user.teams_prefetched = list(user.team_members.all())
        return ok(UserMeSerializer(user).data)

    @extend_schema(
        request=UserReadSerializer,
        responses={200: UserMeSerializer},
        summary="更新当前用户资料",
    )
    def patch(self, request: Request) -> Response:
        # 只允许更新 name/avatar/phone
        allowed = {k: request.data.get(k) for k in ("name", "avatar", "phone") if k in request.data}
        user = services.update_profile(request.user, **allowed)
        user.teams_prefetched = list(user.team_members.all())
        return ok(UserMeSerializer(user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={200: OpenApiTypes.OBJECT},
        summary="修改密码",
    )
    def post(self, request: Request) -> Response:
        ser = ChangePasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        services.change_password(request.user, **ser.validated_data)
        return ok({"message": "密码已修改"})
