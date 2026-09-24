"""dashboard/views.py — 数据看板视图（§6.4）。"""
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError
from apps.common.response import ok

from . import services


def _resolve_team_id(request: Request) -> int:
    team_id = request.query_params.get("teamId") or (
        request.user.current_team_id if request.user.current_team_id else None
    )
    if not team_id:
        raise BusinessError(ErrorCode.BUSINESS_ERROR, "尚未选择团队")
    try:
        return int(team_id)
    except (TypeError, ValueError):
        raise BusinessError(ErrorCode.INVALID_PARAM, "teamId 非法")


def _parse_dates(request: Request):
    start = request.query_params.get("start")
    end = request.query_params.get("end")
    from datetime import datetime
    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d").date() if start else None
    except ValueError:
        raise BusinessError(ErrorCode.INVALID_PARAM, "start 日期格式应为 YYYY-MM-DD")
    try:
        end_dt = datetime.strptime(end, "%Y-%m-%d").date() if end else None
    except ValueError:
        raise BusinessError(ErrorCode.INVALID_PARAM, "end 日期格式应为 YYYY-MM-DD")
    return start_dt, end_dt


class OverviewView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="总览数据")
    def get(self, request: Request) -> Response:
        team_id = _resolve_team_id(request)
        start, end = _parse_dates(request)
        return ok(services.get_overview(team_id=team_id, start=start, end=end))


class TrendView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="趋势数据")
    def get(self, request: Request) -> Response:
        team_id = _resolve_team_id(request)
        start, end = _parse_dates(request)
        days = int(request.query_params.get("days", 30))
        return ok(
            {"points": services.get_trend(
                team_id=team_id, start=start, end=end, days=days
            )}
        )


class PlatformDistributionView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="平台分布")
    def get(self, request: Request) -> Response:
        team_id = _resolve_team_id(request)
        start, end = _parse_dates(request)
        return ok(
            {"items": services.get_platform_distribution(
                team_id=team_id, start=start, end=end
            )}
        )


class TopContentsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="内容排行")
    def get(self, request: Request) -> Response:
        team_id = _resolve_team_id(request)
        limit = int(request.query_params.get("limit", 10))
        return ok(
            {"items": services.get_top_contents(team_id=team_id, limit=limit)}
        )


class PublishQueueView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="发布队列")
    def get(self, request: Request) -> Response:
        team_id = _resolve_team_id(request)
        limit = int(request.query_params.get("limit", 20))
        return ok(
            {"items": services.get_publish_queue(team_id=team_id, limit=limit)}
        )
