"""common/constants.py — 跨 app 共享的枚举与文案。

按 §7.1：枚举用 TextChoices，文案映射放 Constants。
"""
from django.db import models


class PlatformType(models.TextChoices):
    WECHAT = "wechat", "公众号"
    XIAOHONGSHU = "xiaohongshu", "小红书"
    DOUYIN = "douyin", "抖音"
    ZHIHU = "zhihu", "知乎"
    WEIBO = "weibo", "微博"
    BILIBILI = "bilibili", "B站"


PLATFORM_CONFIG = {
    PlatformType.WECHAT: {"name": "公众号", "color": "#07C160", "icon": "message-circle"},
    PlatformType.XIAOHONGSHU: {"name": "小红书", "color": "#FF2442", "icon": "book-open"},
    PlatformType.DOUYIN: {"name": "抖音", "color": "#000000", "icon": "music"},
    PlatformType.ZHIHU: {"name": "知乎", "color": "#0066FF", "icon": "help-circle"},
    PlatformType.WEIBO: {"name": "微博", "color": "#E6162D", "icon": "at-sign"},
    PlatformType.BILIBILI: {"name": "B站", "color": "#FB7299", "icon": "play-circle"},
}


class AccountStatus(models.TextChoices):
    ACTIVE = "active", "正常"
    EXPIRED = "expired", "已过期"
    ERROR = "error", "异常"


class DraftStatus(models.TextChoices):
    DRAFT = "draft", "草稿"
    PENDING = "pending", "待审"
    PUBLISHED = "published", "已发布"
    FAILED = "failed", "失败"


class PublishTaskStatus(models.TextChoices):
    PENDING = "pending", "待发布"
    PUBLISHING = "publishing", "发布中"
    SUCCESS = "success", "成功"
    FAILED = "failed", "失败"
    CANCELED = "canceled", "已取消"


class MaterialType(models.TextChoices):
    IMAGE = "image", "图片"
    VIDEO = "video", "视频"
    AUDIO = "audio", "音频"
    DOCUMENT = "document", "文档"


class TeamRole(models.TextChoices):
    ADMIN = "admin", "管理员"
    EDITOR = "editor", "编辑"
    REVIEWER = "reviewer", "审核员"
    VIEWER = "viewer", "只读"


# 角色权限矩阵（§5.1）
ROLE_PERMISSIONS = {
    TeamRole.ADMIN: {"*": "*"},
    TeamRole.EDITOR: {
        "content": ["create", "read", "update"],
        "publish": ["create", "read"],
        "materials": ["create", "read", "update", "delete"],
        "accounts": ["read"],
        "dashboard": ["read"],
    },
    TeamRole.REVIEWER: {
        "content": ["read"],
        "publish": ["read"],
        "materials": ["read"],
        "reviews": ["create", "read", "update"],
        "dashboard": ["read"],
        "accounts": ["read"],
    },
    TeamRole.VIEWER: {
        "content": ["read"],
        "publish": ["read"],
        "materials": ["read"],
        "dashboard": ["read"],
    },
}

# 权限矩阵资源中文名
ROLE_RESOURCE_LABELS = {
    "content": "内容创作",
    "publish": "发布管理",
    "materials": "素材库",
    "accounts": "社交账号",
    "dashboard": "数据看板",
    "reviews": "审核流程",
    "*": "全部权限",
}

# 权限操作中文名
ROLE_ACTION_LABELS = {
    "create": "创建",
    "read": "查看",
    "update": "编辑",
    "delete": "删除",
    "*": "全部",
}


class ReviewAction(models.TextChoices):
    SUBMIT = "submit", "提交"
    APPROVE = "approve", "通过"
    REJECT = "reject", "驳回"
    ROLLBACK = "rollback", "回滚"


# 错误码（§7.2）
class ErrorCode:
    # 客户端错误
    OK = 0
    INVALID_PARAM = 40001
    UNAUTHORIZED = 40101
    TOKEN_EXPIRED = 40102
    TOKEN_INVALID = 40103
    FORBIDDEN = 40301
    NOT_FOUND = 40401
    CONFLICT = 40901
    RATE_LIMITED = 42901
    # 业务错误
    BUSINESS_ERROR = 40010
    ACCOUNT_NOT_AUTHORIZED = 40020
    PUBLISH_FAILED = 40030
    SENSITIVE_DETECTED = 40040
    # 服务端错误
    INTERNAL_ERROR = 50000
    PLATFORM_API_ERROR = 50010
    TASK_FAILED = 50020
    # 套餐限制
    PLAN_LIMIT_EXCEEDED = 40050


# ===== 套餐定义 =====
class PlanType(models.TextChoices):
    FREE = "free", "免费版"
    PERSONAL = "personal", "个人版"
    TEAM = "team", "团队版"
    ENTERPRISE = "enterprise", "企业版"


# 套餐限制配置
# max_accounts: 绑定的社交账号上限（None = 不限）
# max_platforms: 可用平台数上限（None = 不限）
# max_members: 团队成员上限（None = 不限）
# scheduled_publish: 是否支持定时发布
# review_flow: 是否支持审核流程
# api_access: 是否支持 API 接入
PLAN_LIMITS = {
    PlanType.FREE: {
        "max_accounts": 1,
        "max_platforms": 2,
        "max_members": 1,
        "scheduled_publish": False,
        "review_flow": False,
        "api_access": False,
        "price": 0,
    },
    PlanType.PERSONAL: {
        "max_accounts": 2,
        "max_platforms": 2,
        "max_members": 2,
        "scheduled_publish": True,
        "review_flow": False,
        "api_access": False,
        "price": 39,
    },
    PlanType.TEAM: {
        "max_accounts": 10,
        "max_platforms": 6,
        "max_members": 5,
        "scheduled_publish": True,
        "review_flow": True,
        "api_access": False,
        "price": 199,
    },
    PlanType.ENTERPRISE: {
        "max_accounts": None,
        "max_platforms": None,
        "max_members": None,
        "scheduled_publish": True,
        "review_flow": True,
        "api_access": True,
        "price": 999,
    },
}

# 套餐展示信息
PLAN_INFO = {
    PlanType.FREE: {
        "name": "免费版",
        "price": 0,
        "features": ["1 个账号", "2 个平台", "基础功能"],
    },
    PlanType.PERSONAL: {
        "name": "个人版",
        "price": 39,
        "features": ["2 个账号", "2 个平台", "定时发布"],
    },
    PlanType.TEAM: {
        "name": "团队版",
        "price": 199,
        "features": ["10 个账号", "5 人协作", "审核流程", "定时发布"],
    },
    PlanType.ENTERPRISE: {
        "name": "企业版",
        "price": 999,
        "features": ["不限账号", "不限成员", "审核流程", "API 接入"],
    },
}
