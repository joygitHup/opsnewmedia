"""dashboard/serializers.py — 看板序列化器。"""
from rest_framework import serializers


class OverviewSerializer(serializers.Serializer):
    totalViews = serializers.IntegerField()
    totalLikes = serializers.IntegerField()
    totalComments = serializers.IntegerField()
    totalShares = serializers.IntegerField()
    totalFollowers = serializers.IntegerField()
    followerGrowth = serializers.IntegerField()
    publishCount = serializers.IntegerField()
    accountCount = serializers.IntegerField()


class TrendPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    views = serializers.IntegerField()
    likes = serializers.IntegerField()
    comments = serializers.IntegerField()
    shares = serializers.IntegerField()
    followerGrowth = serializers.IntegerField()


class PlatformDistributionItemSerializer(serializers.Serializer):
    platform = serializers.CharField()
    platformName = serializers.CharField()
    followers = serializers.IntegerField()
    views = serializers.IntegerField()
    likes = serializers.IntegerField()
    accountCount = serializers.IntegerField()


class TopContentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    platform = serializers.CharField()
    views = serializers.IntegerField()
    likes = serializers.IntegerField()
    publishedAt = serializers.DateTimeField()


class PublishQueueItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    platform = serializers.CharField()
    accountName = serializers.CharField()
    status = serializers.CharField()
    scheduledAt = serializers.DateTimeField()
    publishedAt = serializers.DateTimeField()
    errorMsg = serializers.CharField()


class RangeSerializer(serializers.Serializer):
    start = serializers.DateField(required=False)
    end = serializers.DateField(required=False)
    platform = serializers.CharField(required=False, allow_blank=True)
