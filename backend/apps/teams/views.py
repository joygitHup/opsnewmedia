"""teams/views.py — 团队视图（§4.1 / §4.2 / §4.3 / §4.5）。"""
from django.db.models import Count
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.constants import TeamRole
from apps.common.exceptions import BusinessError
from apps.common.pagination import StandardPagination
from apps.common.response import ok

from . import services
from .models import Invitation, Team, TeamMember
from .serializers import (
    InvitationReadSerializer,
    InvitationWriteSerializer,
    TeamDetailSerializer,
    TeamListSerializer,
    TeamMemberBriefSerializer,
    TeamMemberDetailSerializer,
    TeamMemberWriteSerializer,
    TeamWriteSerializer,
)


@extend_schema_view(
    list=extend_schema(summary="我的团队列表"),
    retrieve=extend_schema(summary="团队详情"),
    create=extend_schema(summary="创建团队"),
    update=extend_schema(summary="更新团队"),
    partial_update=extend_schema(summary="部分更新团队"),
)
class TeamViewSet(viewsets.ModelViewSet):
    """团队 CRUD + 成员管理。"""

    pagination_class = StandardPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 当前用户加入的团队
        user = self.request.user
        qs = (
            Team.objects.filter(members__user=user, is_deleted=False)
            .select_related("owner")
            .annotate(memberCount=Count("members"))
        )
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return TeamListSerializer
        if self.action == "retrieve":
            return TeamDetailSerializer
        return TeamWriteSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        # 注入当前用户在团队的 role
        page = self.paginate_queryset(qs)
        if page is not None:
            self._inject_role(page, request.user)
            return self.get_paginated_response(TeamListSerializer(page, many=True).data)
        self._inject_role(qs, request.user)
        return ok(TeamListSerializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        team = self.get_object()
        # 预加载成员
        members = list(team.members.select_related("user").all())
        team._members_prefetched = members
        self._inject_role([team], request.user)
        return ok(TeamDetailSerializer(team).data)

    def create(self, request, *args, **kwargs):
        """创建团队：统一 ok() 包装，返回团队详情（含成员）。"""
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team = services.create_team(owner=request.user, **ser.validated_data)
        members = list(team.members.select_related("user").all())
        team._members_prefetched = members
        self._inject_role([team], request.user)
        return ok(
            TeamDetailSerializer(team).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        """更新团队：统一 ok() 包装。"""
        team = self.get_object()
        ser = self.get_serializer(team, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        members = list(team.members.select_related("user").all())
        team._members_prefetched = members
        self._inject_role([team], request.user)
        return ok(TeamDetailSerializer(team).data)

    def destroy(self, request, *args, **kwargs):
        """删除团队：仅创建者可操作。"""
        team = self.get_object()
        services.delete_team(team=team, actor=request.user)
        return ok({"message": "团队已删除"})

    @action(detail=True, methods=["get"], url_path="members")
    def members(self, request: Request, pk: int = None) -> Response:
        team = self.get_object()
        members = team.members.select_related("user").all()
        return ok(TeamMemberBriefSerializer(members, many=True).data)

    @action(detail=True, methods=["patch"], url_path=r"members/(?P<member_id>\d+)")
    def update_member(self, request: Request, pk: int = None, member_id: int = None) -> Response:
        team = self.get_object()
        member = get_object_or_404(TeamMember, pk=member_id, team=team)
        ser = TeamMemberWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        member = services.update_member_role(
            team=team, actor=request.user, member=member, role=ser.validated_data["role"]
        )
        return ok(TeamMemberDetailSerializer(member).data)

    @update_member.mapping.delete
    def remove_member(self, request: Request, pk: int = None, member_id: int = None) -> Response:
        team = self.get_object()
        member = get_object_or_404(TeamMember, pk=member_id, team=team)
        services.remove_member(team=team, actor=request.user, member=member)
        return ok({"message": "成员已移除"})

    @action(detail=True, methods=["post"], url_path="invite")
    def invite(self, request: Request, pk: int = None) -> Response:
        team = self.get_object()
        ser = InvitationWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        # 检查成员数量限制
        services.check_plan_limit(team, "members")
        inv = services.invite_member(
            team=team, inviter=request.user, **ser.validated_data
        )
        return ok(InvitationReadSerializer(inv).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="upgrade")
    def upgrade(self, request: Request, pk: int = None) -> Response:
        """升级团队套餐。"""
        team = self.get_object()
        plan = request.data.get("plan")
        if not plan:
            raise BusinessError(400, "缺少 plan")
        team = services.upgrade_plan(team=team, plan=plan)
        members = list(team.members.select_related("user").all())
        team._members_prefetched = members
        self._inject_role([team], request.user)
        return ok(TeamDetailSerializer(team).data)

    @staticmethod
    def _inject_role(teams, user):
        """批量注入当前用户在团队的 role（避免 N+1，§15.2）。"""
        team_ids = [t.id for t in teams]
        role_map = {
            m.team_id: m.role
            for m in TeamMember.objects.filter(team_id__in=team_ids, user=user)
        }
        for t in teams:
            t._current_user_role = role_map.get(t.id)


class CurrentTeamView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="当前团队")
    def get(self, request: Request) -> Response:
        team = request.user.current_team
        if team is None:
            # 回退到第一个团队
            member = request.user.team_members.filter(status="active").select_related("team").first()
            team = member.team if member else None
        if team is None:
            raise BusinessError(404, "尚未加入任何团队", status_code=404)
        return ok(TeamDetailSerializer(team).data)

    @extend_schema(summary="切换当前团队")
    def post(self, request: Request) -> Response:
        team_id = request.data.get("teamId")
        if not team_id:
            raise BusinessError(400, "缺少 teamId")
        if not request.user.is_in_team(team_id):
            raise BusinessError(403, "不在该团队")
        request.user.current_team_id = team_id
        request.user.save(update_fields=["current_team", "updated_at"])
        return ok({"teamId": team_id})


class AcceptInvitationView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="接受邀请")
    def post(self, request: Request) -> Response:
        token = request.data.get("token")
        if not token:
            raise BusinessError(400, "缺少 token")
        # 预检查：邀请对应的团队是否超出成员上限
        from apps.teams.models import Invitation
        inv = Invitation.objects.filter(token=token).select_related("team").first()
        if inv and inv.team:
            services.check_plan_limit(inv.team, "members")
        member = services.accept_invitation(token=token, user=request.user)
        return ok(TeamMemberDetailSerializer(member).data)


class RolesView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="角色权限矩阵")
    def get(self, request: Request) -> Response:
        return ok(services.get_role_matrix())


class PlanView(APIView):
    """套餐信息：返回所有套餐定义 + 当前团队的使用量和限制。"""

    permission_classes = [IsAuthenticated]

    @extend_schema(summary="套餐信息")
    def get(self, request: Request) -> Response:
        from apps.common.constants import PLAN_INFO, PLAN_LIMITS, PlanType
        plans = []
        for pt in PlanType:
            info = PLAN_INFO[pt]
            limits = PLAN_LIMITS[pt]
            plans.append({
                "value": pt.value,
                "label": info["name"],
                "price": info["price"],
                "features": info["features"],
                "limits": {
                    "maxAccounts": limits["max_accounts"],
                    "maxPlatforms": limits["max_platforms"],
                    "maxMembers": limits["max_members"],
                    "scheduledPublish": limits["scheduled_publish"],
                    "reviewFlow": limits["review_flow"],
                    "apiAccess": limits["api_access"],
                },
            })
        team = request.user.current_team
        if team:
            team.refresh_from_db()
        current_plan = team.plan if team else "free"
        usage = services.get_plan_usage(team) if team else {}
        return ok({
            "currentPlan": current_plan,
            "plans": plans,
            "usage": {
                "accounts": usage.get("accounts", 0),
                "platforms": len(usage.get("platforms", set())),
                "members": usage.get("members", 0),
            },
        })
