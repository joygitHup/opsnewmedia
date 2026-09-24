"""teams/serializers.py — Team / TeamMember / Invitation 序列化器（§3.1）。"""
from rest_framework import serializers

from apps.common.constants import TeamRole
from apps.users.serializers import UserReadSerializer

from .models import Invitation, Team, TeamMember, TeamMemberStatus


class TeamListSerializer(serializers.ModelSerializer):
    ownerName = serializers.CharField(source="owner.display_name", read_only=True)
    memberCount = serializers.IntegerField(read_only=True)
    role = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    plan = serializers.CharField(read_only=True)

    class Meta:
        model = Team
        fields = [
            "id", "name", "avatar", "description", "ownerName",
            "memberCount", "role", "createdAt", "plan",
        ]

    def get_role(self, obj):
        # 由 View 注入 current_user_role 注解
        return getattr(obj, "_current_user_role", None)


class TeamDetailSerializer(TeamListSerializer):
    members = serializers.SerializerMethodField()

    class Meta(TeamListSerializer.Meta):
        fields = TeamListSerializer.Meta.fields + ["members"]

    def get_members(self, obj):
        members = getattr(obj, "_members_prefetched", None)
        if members is None:
            members = obj.members.select_related("user").all()
        return TeamMemberBriefSerializer(members, many=True).data


class TeamWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["name", "avatar", "description"]


class TeamMemberBriefSerializer(serializers.ModelSerializer):
    """轻量版：用于嵌套。"""

    userId = serializers.IntegerField(source="user_id")
    name = serializers.CharField(source="user.display_name", read_only=True)
    avatar = serializers.URLField(source="user.avatar", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    joinedAt = serializers.DateTimeField(source="joined_at", read_only=True)

    class Meta:
        model = TeamMember
        fields = ["id", "userId", "name", "avatar", "email", "role", "status", "joinedAt"]


class TeamMemberDetailSerializer(TeamMemberBriefSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta(TeamMemberBriefSerializer.Meta):
        fields = TeamMemberBriefSerializer.Meta.fields + ["createdAt"]


class TeamMemberWriteSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=TeamRole.choices)
    status = serializers.ChoiceField(choices=TeamMemberStatus.choices, required=False)


class InvitationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ["email", "role"]


class InvitationReadSerializer(serializers.ModelSerializer):
    inviterName = serializers.CharField(source="inviter.display_name", read_only=True)
    teamName = serializers.CharField(source="team.name", read_only=True)
    expiresAt = serializers.DateTimeField(source="expires_at", read_only=True)
    acceptedAt = serializers.DateTimeField(source="accepted_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Invitation
        fields = [
            "id", "teamName", "inviterName", "email", "role",
            "token", "expiresAt", "acceptedAt", "createdAt",
        ]
