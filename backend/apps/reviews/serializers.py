"""reviews/serializers.py — 审核序列化器。"""
from rest_framework import serializers

from .models import ReviewFlow, ReviewRecord


class ReviewRecordSerializer(serializers.ModelSerializer):
    reviewerName = serializers.CharField(
        source="reviewer.display_name", read_only=True, default=""
    )

    class Meta:
        model = ReviewRecord
        fields = [
            "id", "action", "stage", "comment",
            "reviewerName", "created_at",
        ]


class ReviewFlowSerializer(serializers.ModelSerializer):
    draftTitle = serializers.CharField(
        source="draft.title", read_only=True, default=""
    )
    submittedByName = serializers.CharField(
        source="submitted_by.display_name", read_only=True, default=""
    )
    records = serializers.SerializerMethodField()
    actionName = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = ReviewFlow
        fields = [
            "id", "draft", "draftTitle", "current_stage",
            "submittedByName", "submitted_at", "approved_at",
            "records", "created_at",
        ]

    def get_records(self, obj):
        records = getattr(obj, "_records_prefetched", None)
        if records is None:
            records = obj.records.select_related("reviewer").order_by("-created_at")[:10]
        return ReviewRecordSerializer(records, many=True).data


class SubmitReviewSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class ApproveSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    stage = serializers.CharField(max_length=32, required=False, allow_blank=True)


class RejectSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=2000, required=True, allow_blank=False)


class SensitiveCheckSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=8000)


class RollbackSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=2000, required=False, allow_blank=True)
