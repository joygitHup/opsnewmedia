"""common/utils_crypto.py — AES-GCM 对称加密（§9.4 / §21.3）。

用途：平台 Token 落库前加密，读出时解密。
密钥从 settings.PLATFORM_TOKEN_KEY 读取。
"""
import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from cryptography.exceptions import InvalidTag


def _resolve_key() -> bytes:
    """从 settings 解析 32 字节密钥（AES-256-GCM）。"""
    raw = settings.PLATFORM_TOKEN_KEY
    if not raw:
        raise RuntimeError("PLATFORM_TOKEN_KEY 未配置，无法加密平台 Token。")
    # 尝试 base64 解码失败则按 utf-8 取字节
    try:
        key = base64.urlsafe_b64decode(raw)
        if len(key) == 32:
            return key
    except Exception:
        pass
    key = raw.encode("utf-8")
    if len(key) < 32:
        key = key.ljust(32, b"\0")
    return key[:32]


_NONCE_SIZE = 12


def encrypt(plaintext: str) -> str:
    """AES-GCM 加密。返回 base64(nonce + ciphertext)。

    用法：db.encrypted_token = encrypt(json_str)
    """
    if plaintext is None:
        return ""
    key = _resolve_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(_NONCE_SIZE)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.urlsafe_b64encode(nonce + ct).decode("ascii")


def decrypt(token: str) -> str:
    """AES-GCM 解密。"""
    if not token:
        return ""
    key = _resolve_key()
    aesgcm = AESGCM(key)
    raw = base64.urlsafe_b64decode(token.encode("ascii"))
    nonce, ct = raw[:_NONCE_SIZE], raw[_NONCE_SIZE:]
    try:
        return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
    except InvalidTag:
        # 解密失败：密钥被替换 / 数据被篡改
        return ""
