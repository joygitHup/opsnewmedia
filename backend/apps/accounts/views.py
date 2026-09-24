"""accounts/views.py — 平台账号视图（§6.1 / §6.2）。

- CRUD：list/retrieve/create/update/destroy
- status：修改账号状态
- oauth_start / oauth_callback：占位入口，真正 OAuth 实现在 apps/integrations
"""
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.constants import AccountStatus, ErrorCode
from apps.common.exceptions import BusinessError
from apps.common.pagination import StandardPagination
from apps.common.response import ok

from . import services
from .models import Account
from .permissions import CanManageAccounts
from .serializers import (
    AccountDetailSerializer,
    AccountListSerializer,
    AccountStatusWriteSerializer,
    AccountWriteSerializer,
    OAuthCallbackSerializer,
    OAuthStartSerializer,
)


def _resolve_team_id(request: Request) -> int:
    """从 query / 当前用户推断 team_id。"""
    team_id = request.query_params.get("teamId") or request.data.get("teamId")
    if team_id:
        try:
            return int(team_id)
        except (TypeError, ValueError):
            raise BusinessError(ErrorCode.INVALID_PARAM, "teamId 非法")
    if request.user.current_team_id:
        return request.user.current_team_id
    raise BusinessError(ErrorCode.BUSINESS_ERROR, "尚未选择团队")


@extend_schema_view(
    list=extend_schema(summary="账号列表"),
    retrieve=extend_schema(summary="账号详情"),
    create=extend_schema(summary="绑定账号"),
    update=extend_schema(summary="更新账号"),
    partial_update=extend_schema(summary="部分更新账号"),
    destroy=extend_schema(summary="解绑账号"),
)
class AccountViewSet(viewsets.ModelViewSet):
    """平台账号 CRUD。"""

    pagination_class = StandardPagination
    permission_classes = [IsAuthenticated, CanManageAccounts]
    filterset_fields = ["platform", "status", "account_group"]
    search_fields = ["name", "platform_account_id", "account_group"]
    ordering_fields = ["created_at", "followers", "last_synced_at"]

    def get_queryset(self):
        user = self.request.user
        team_id = self.request.query_params.get("teamId") or (
            user.current_team_id if user.current_team_id else None
        )
        qs = Account.objects.select_related("added_by")
        if team_id:
            qs = qs.for_team(team_id)
        else:
            # 没有团队：返回空集
            qs = qs.none()
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return AccountListSerializer
        if self.action == "retrieve":
            return AccountDetailSerializer
        return AccountWriteSerializer

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(
                AccountListSerializer(page, many=True).data
            )
        return ok(AccountListSerializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        account = self.get_object()
        return ok(AccountDetailSerializer(account).data)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team_id = _resolve_team_id(request)
        # 检查套餐账号数量限制
        from apps.teams.models import Team
        from apps.teams.services import check_plan_limit
        team = Team.objects.get(id=team_id)
        check_plan_limit(team, "accounts")
        account = services.create_account(
            team_id=team_id,
            user=request.user,
            platform=ser.validated_data["platform"],
            name=ser.validated_data["name"],
            avatar=ser.validated_data.get("avatar", ""),
            followers=ser.validated_data.get("followers", 0),
            account_group=ser.validated_data.get("account_group", ""),
            platform_account_id=ser.validated_data.get(
                "platform_account_id", ""
            ),
        )
        return ok(
            AccountDetailSerializer(account).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        account = self.get_object()
        ser = self.get_serializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        account = services.update_account(
            account=account, **ser.validated_data
        )
        return ok(AccountDetailSerializer(account).data)

    def destroy(self, request, *args, **kwargs):
        account = self.get_object()
        services.delete_account(account=account)
        return ok({"message": "账号已解绑"})

    @action(detail=True, methods=["patch"], url_path="status")
    def status(self, request: Request, pk: int = None) -> Response:
        account = self.get_object()
        ser = AccountStatusWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        account = services.update_account_status(
            account=account, status=ser.validated_data["status"]
        )
        return ok(AccountDetailSerializer(account).data)

    @action(detail=False, methods=["post"], url_path="oauth/start")
    def oauth_start(self, request: Request) -> Response:
        """OAuth 起点：生成授权 URL。真正实现在 integrations。"""
        ser = OAuthStartSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        platform = request.data.get("platform")
        if not platform:
            raise BusinessError(ErrorCode.INVALID_PARAM, "缺少 platform")
        redirect_uri = ser.validated_data.get(
            "redirect_uri",
            request.build_absolute_uri("/api/v1/integrations/oauth/callback/"),
        )
        result = services.start_oauth(
            platform=platform, redirect_uri=redirect_uri
        )
        return ok(result)

    @action(detail=False, methods=["post"], url_path="oauth/callback")
    def oauth_callback(self, request: Request) -> Response:
        """OAuth 回调：用 code 换 token 并落库。"""
        ser = OAuthCallbackSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        platform = request.data.get("platform")
        if not platform:
            raise BusinessError(ErrorCode.INVALID_PARAM, "缺少 platform")
        team_id = _resolve_team_id(request)
        account = services.handle_oauth_callback(
            platform=platform,
            code=ser.validated_data["code"],
            state=ser.validated_data.get("state", ""),
            redirect_uri=ser.validated_data.get(
                "redirect_uri",
                request.build_absolute_uri("/api/v1/integrations/oauth/callback/"),
            ),
            team_id=team_id,
            user=request.user,
        )
        return ok(AccountDetailSerializer(account).data)
