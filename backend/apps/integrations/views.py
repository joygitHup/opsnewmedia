"""integrations/views.py — 平台对接入口视图（§6.4）。

OAuth 回调视图：接收平台 code，调用 services.handle_oauth_callback。
平台列表：返回当前已接入平台。
"""
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts import services as account_services
from apps.accounts.serializers import AccountDetailSerializer
from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError
from apps.common.response import ok

from . import registry


class PlatformListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="已接入平台列表")
    def get(self, request: Request) -> Response:
        return ok({"platforms": registry.list_supported_platforms()})


class OAuthStartView(APIView):
    """OAuth 起点：生成授权 URL，前端跳转到平台授权页。"""

    permission_classes = [IsAuthenticated]

    @extend_schema(summary="OAuth 起点")
    def post(self, request: Request, platform: str) -> Response:
        redirect_uri = request.data.get(
            "redirect_uri",
            request.build_absolute_uri(
                f"/api/v1/integrations/oauth/{platform}/callback/"
            ),
        )
        try:
            result = account_services.start_oauth(
                platform=platform, redirect_uri=redirect_uri
            )
        except BusinessError:
            raise
        return ok(result)


class OAuthCallbackView(APIView):
    """OAuth 回调：由平台重定向到此（GET）。也可由前端 POST 提交 code。"""

    permission_classes = [IsAuthenticated]

    @extend_schema(summary="OAuth 回调")
    def get(self, request: Request, platform: str) -> Response:
        code = request.query_params.get("code")
        state = request.query_params.get("state", "")
        if not code:
            raise BusinessError(ErrorCode.INVALID_PARAM, "缺少 code")
        return self._handle(platform=platform, code=code, state=state, request=request)

    @extend_schema(summary="OAuth 回调（POST）")
    def post(self, request: Request, platform: str) -> Response:
        code = request.data.get("code")
        state = request.data.get("state", "")
        if not code:
            raise BusinessError(ErrorCode.INVALID_PARAM, "缺少 code")
        return self._handle(platform=platform, code=code, state=state, request=request)

    def _handle(self, *, platform: str, code: str, state: str, request: Request):
        redirect_uri = request.build_absolute_uri(
            f"/api/v1/integrations/oauth/{platform}/callback/"
        )
        team_id = request.user.current_team_id
        if team_id is None:
            raise BusinessError(ErrorCode.BUSINESS_ERROR, "尚未选择团队")
        account = account_services.handle_oauth_callback(
            platform=platform,
            code=code,
            state=state,
            redirect_uri=redirect_uri,
            team_id=team_id,
            user=request.user,
        )
        return ok(AccountDetailSerializer(account).data, status=status.HTTP_201_CREATED)
