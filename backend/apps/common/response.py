"""common/response.py — 统一响应包装（§8.1）。

成功：{"code":0,"message":"ok","data":{...}}
分页：{"code":0,"message":"ok","data":{"list":[...],"total":N,"page":1,"pageSize":20}}
失败：{"code":40001,"message":"参数错误","errors":{...}}
"""
from typing import Any, Optional

from rest_framework.response import Response
from rest_framework import status as http_status

from .constants import ErrorCode


def ok(data: Any = None, message: str = "ok", status: int = http_status.HTTP_200_OK) -> Response:
    """成功响应包装。"""
    return Response(
        {"code": ErrorCode.OK, "message": message, "data": data},
        status=status,
    )


def fail(
    code: int = ErrorCode.BUSINESS_ERROR,
    message: str = "操作失败",
    errors: Optional[dict] = None,
    status: int = http_status.HTTP_400_BAD_REQUEST,
) -> Response:
    """失败响应包装。"""
    payload: dict[str, Any] = {"code": code, "message": message}
    if errors is not None:
        payload["errors"] = errors
    return Response(payload, status=status)
