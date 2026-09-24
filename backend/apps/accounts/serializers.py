"""accounts/serializers.py — 平台账号序列化器（§3.1）。"""
from rest_framework import serializers

from apps.common.constants import AccountStatus, PlatformType

from .models import Account


class AccountListSerializer(serializers.ModelSerializer):
    """列表用：不返回 encrypted_token。"""

    platformName = serializers.CharField(source="get_platform_display", read_only=True)
    statusName = serializers.CharField(source="get_status_display", read_only=True)
    addedByName = serializers.CharField(source="added_by.display_name", read_only=True, default="")
    isExpired = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            "id", "platform", "platformName", "name", "avatar",
            "status", "statusName", "followers", "account_group",
            "platform_account_id", "token_expires_at", "last_synced_at",
            "isExpired", "addedByName", "created_at",
        ]

    def get_isExpired(self, obj: Account) -> bool:
        if obj.token_expires_at is None:
            return False
        from django.utils import timezone
        return obj.token_expires_at <= timezone.now()


class AccountDetailSerializer(AccountListSerializer):
    """详情用：多 raw_extra 字段。"""

    class Meta(AccountListSerializer.Meta):
        fields = AccountListSerializer.Meta.fields + ["raw_extra"]


class AccountWriteSerializer(serializers.ModelSerializer):
    """创建/更新：可写字段。"""

    class Meta:
        model = Account
        fields = [
            "platform", "name", "avatar", "followers",
            "account_group", "platform_account_id",
        ]

    def validate_platform(self, value: str) -> str:
        if value not in dict(PlatformType.choices):
            raise serializers.ValidationError("平台不合法")
        return value


class AccountStatusWriteSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=AccountStatus.choices)


class OAuthStartSerializer(serializers.Serializer):
    redirect_uri = serializers.URLField(required=False)


class OAuthCallbackSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=512)
    state = serializers.CharField(max_length=128, required=False, allow_blank=True)
    redirect_uri = serializers.URLField(required=False)
