"""users/serializers.py — 注册/登录/资料序列化器（§3.1 / §3.5）。

按场景拆：Write(注册) / Login / Read(资料) / Me(当前用户)。
"""
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.common.constants import ErrorCode
from apps.common.exceptions import BusinessError
from .models import User


class UserReadSerializer(serializers.ModelSerializer):
    """用户列表/详情只读。"""

    displayName = serializers.CharField(source="display_name", read_only=True)
    currentTeamId = serializers.IntegerField(source="current_team_id", allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "avatar",
            "phone",
            "displayName",
            "currentTeamId",
            "is_staff",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "email", "is_staff", "created_at", "updated_at"]


class UserMeSerializer(UserReadSerializer):
    """当前用户详情。"""

    teams = serializers.SerializerMethodField()

    class Meta(UserReadSerializer.Meta):
        fields = UserReadSerializer.Meta.fields + ["teams"]

    def get_teams(self, obj):
        # 通过 prefetch_related 传入 teams；不在序列化器里查 DB（§3.3）
        teams = obj.teams_prefetched if hasattr(obj, "teams_prefetched") else None
        if teams is None:
            teams = list(obj.team_members.select_related("team").all())
        from apps.teams.serializers import TeamMemberBriefSerializer
        return TeamMemberBriefSerializer(teams, many=True).data


class RegisterSerializer(serializers.Serializer):
    """注册入参。"""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    name = serializers.CharField(required=False, max_length=64, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise BusinessError(
                ErrorCode.CONFLICT,
                "该邮箱已被注册",
                status_code=409,
            )
        return value

    def validate_password(self, value):
        validate_password(value)
        return value


class LoginSerializer(serializers.Serializer):
    """登录入参。"""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True)


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value
