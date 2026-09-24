"""integrations/registry.py — 平台适配器工厂（§6.4）。

通过 get_adapter(platform) 返回对应平台的适配器实例。
未接入平台返回 None。
"""
from __future__ import annotations

from typing import Dict, Type

from apps.accounts.platform_base import BasePlatformAdapter
from apps.common.constants import PlatformType

from .platforms.bilibili import BilibiliAdapter
from .platforms.douyin import DouyinAdapter
from .platforms.weibo import WeiboAdapter
from .platforms.wechat_mp import WechatMpAdapter
from .platforms.xiaohongshu import XiaohongshuAdapter
from .platforms.zhihu import ZhihuAdapter


_REGISTRY: Dict[str, Type[BasePlatformAdapter]] = {
    PlatformType.WECHAT: WechatMpAdapter,
    PlatformType.XIAOHONGSHU: XiaohongshuAdapter,
    PlatformType.DOUYIN: DouyinAdapter,
    PlatformType.ZHIHU: ZhihuAdapter,
    PlatformType.WEIBO: WeiboAdapter,
    PlatformType.BILIBILI: BilibiliAdapter,
}

_INSTANCES: Dict[str, BasePlatformAdapter] = {}


def get_adapter(platform: str) -> BasePlatformAdapter | None:
    """返回平台适配器单例（按需创建）。未注册返回 None。"""
    cls = _REGISTRY.get(platform)
    if cls is None:
        return None
    if platform not in _INSTANCES:
        _INSTANCES[platform] = cls()
    return _INSTANCES[platform]


def list_supported_platforms() -> list[dict]:
    """列出已注册的平台。"""
    return [
        {"code": code, "name": cls.platform_name}
        for code, cls in _REGISTRY.items()
    ]


def register_adapter(platform: str, adapter_cls: Type[BasePlatformAdapter]) -> None:
    """运行时注册新平台（用于插件化扩展）。"""
    _REGISTRY[platform] = adapter_cls
    _INSTANCES.pop(platform, None)
