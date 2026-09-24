"""ai/views.py — AI 辅助视图（§6.5）。

四个 action：
- POST /generate/   内容生成
- POST /polish/     内容润色
- POST /title/      标题生成
- POST /tags/       标签推荐
"""
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError
from apps.common.response import ok

from . import services
from .serializers import (
    GenerateSerializer,
    PolishSerializer,
    TagsSerializer,
    TitleSerializer,
)


def _resolve_team_id(request: Request) -> int:
    team_id = request.data.get("teamId") or (
        request.user.current_team_id if request.user.current_team_id else None
    )
    if not team_id:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "尚未选择团队")
    return team_id


class GenerateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="AI 内容生成")
    def post(self, request: Request) -> Response:
        ser = GenerateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team_id = _resolve_team_id(request)
        output = services.generate_content(
            user=request.user,
            team_id=team_id,
            prompt=ser.validated_data["prompt"],
            platform=ser.validated_data.get("platform", ""),
            length=ser.validated_data.get("length", 800),
            tone=ser.validated_data.get("tone", ""),
            keywords=ser.validated_data.get("keywords"),
        )
        return ok({"output": output})


class PolishView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="AI 内容润色")
    def post(self, request: Request) -> Response:
        ser = PolishSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team_id = _resolve_team_id(request)
        output = services.polish_content(
            user=request.user,
            team_id=team_id,
            content=ser.validated_data["content"],
            platform=ser.validated_data.get("platform", ""),
            mode=ser.validated_data.get("mode", "lite"),
        )
        return ok({"output": output})


class TitleView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="AI 标题生成")
    def post(self, request: Request) -> Response:
        ser = TitleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team_id = _resolve_team_id(request)
        titles = services.generate_titles(
            user=request.user,
            team_id=team_id,
            content=ser.validated_data["content"],
            platform=ser.validated_data.get("platform", ""),
            count=ser.validated_data.get("count", 3),
        )
        return ok({"options": titles})


class TagsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="AI 标签推荐")
    def post(self, request: Request) -> Response:
        ser = TagsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team_id = _resolve_team_id(request)
        tags = services.recommend_tags(
            user=request.user,
            team_id=team_id,
            content=ser.validated_data["content"],
            platform=ser.validated_data.get("platform", ""),
            count=ser.validated_data.get("count", 5),
        )
        return ok({"tags": tags})
