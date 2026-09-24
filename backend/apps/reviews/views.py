"""reviews/views.py — 审核视图（§6.7）。"""
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError
from apps.common.response import ok
from apps.content.models import ContentDraft

from . import services
from .models import ReviewFlow
from .serializers import (
    ApproveSerializer,
    RejectSerializer,
    ReviewFlowSerializer,
    RollbackSerializer,
    SensitiveCheckSerializer,
    SubmitReviewSerializer,
)


class PendingReviewsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="待审列表")
    def get(self, request: Request) -> Response:
        team_id = (
            request.query_params.get("teamId")
            or (request.user.current_team_id if request.user.current_team_id else None)
        )
        if not team_id:
            raise BusinessError(ErrorCode.BUSINESS_ERROR, "尚未选择团队")
        flows = ReviewFlow.objects.filter(
            team_id=team_id,
            current_stage__in=["submit", "approve", "final"],
        ).select_related("draft", "submitted_by")
        # 注入预取
        for f in flows:
            f._records_prefetched = list(
                f.records.select_related("reviewer").order_by("-created_at")[:5]
            )
        return ok(ReviewFlowSerializer(flows, many=True).data)


class SubmitReviewView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="提交审核")
    def post(self, request: Request, draft_id: int) -> Response:
        from apps.content.permissions import CanManageContent

        try:
            draft = ContentDraft.objects.select_related("team").get(id=draft_id)
        except ContentDraft.DoesNotExist:
            raise BusinessError(ErrorCode.NOT_FOUND, "草稿不存在")
        ser = SubmitReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        flow = services.submit_for_review(
            draft=draft, user=request.user,
            comment=ser.validated_data.get("comment", "")
        )
        flow._records_prefetched = list(flow.records.all())
        return ok(ReviewFlowSerializer(flow).data, status=status.HTTP_201_CREATED)


class ApproveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="通过审核")
    def post(self, request: Request, flow_id: int) -> Response:
        flow = get_object_or_404(ReviewFlow, id=flow_id)
        ser = ApproveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        flow = services.approve(
            flow=flow, user=request.user,
            comment=ser.validated_data.get("comment", "")
        )
        flow._records_prefetched = list(flow.records.all())
        return ok(ReviewFlowSerializer(flow).data)


class RejectView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="驳回审核")
    def post(self, request: Request, flow_id: int) -> Response:
        flow = get_object_or_404(ReviewFlow, id=flow_id)
        ser = RejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        flow = services.reject(
            flow=flow, user=request.user,
            comment=ser.validated_data["comment"]
        )
        flow._records_prefetched = list(flow.records.all())
        return ok(ReviewFlowSerializer(flow).data)


class RollbackView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="回滚审核流程")
    def post(self, request: Request, flow_id: int) -> Response:
        flow = get_object_or_404(ReviewFlow, id=flow_id)
        ser = RollbackSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        flow = services.rollback(
            flow=flow, user=request.user,
            comment=ser.validated_data.get("comment", "")
        )
        flow._records_prefetched = list(flow.records.all())
        return ok(ReviewFlowSerializer(flow).data)


class SensitiveCheckView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="敏感词检测")
    def post(self, request: Request) -> Response:
        ser = SensitiveCheckSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return ok(services.sensitive_check(text=ser.validated_data["text"]))
