"""common/exceptions.py — 业务异常 + 全局异常处理（§7.2 / §8.1）。

- BusinessError(APIException) 集中定义业务异常
- exception_handler 统一异常格式
"""
import logging
from typing import Any

from rest_framework.exceptions import APIException, AuthenticationFailed
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status as http_status

from .constants import ErrorCode

logger = logging.getLogger(__name__)


class BusinessError(APIException):
    """业务异常基类。

    用法：raise BusinessError(ErrorCode.NOT_FOUND, "内容不存在")
    """

    status_code = http_status.HTTP_400_BAD_REQUEST
    default_code = ErrorCode.BUSINESS_ERROR
    default_detail = "操作失败"

    def __init__(
        self,
        code: int = ErrorCode.BUSINESS_ERROR,
        message: str = "操作失败",
        status_code: int | None = None,
        errors: dict | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.errors = errors
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail=message, code=code)


def exception_handler(exc, context):
    """统一异常格式（§8.1）。

    DRF 默认 handler 处理 APIException / Http404 / PermissionDenied，
    其他 Exception 兜底为 500 内部错误。
    """
    # 先走 DRF 默认处理
    response = drf_exception_handler(exc, context)
    request = context.get("request")

    if isinstance(exc, BusinessError):
        # 业务异常，按业务码返回
        payload: dict[str, Any] = {"code": exc.code, "message": exc.message}
        if exc.errors:
            payload["errors"] = exc.errors
        return Response(payload, status=exc.status_code)

    if response is not None:
        # DRF 已识别异常，按统一格式重塑
        code = ErrorCode.INVALID_PARAM
        status_code = response.status_code

        # 按状态码映射错误码
        if status_code == 401:
            code = ErrorCode.UNAUTHORIZED
            if isinstance(exc, AuthenticationFailed):
                if "expired" in str(exc.detail).lower():
                    code = ErrorCode.TOKEN_EXPIRED
                else:
                    code = ErrorCode.TOKEN_INVALID
        elif status_code == 403:
            code = ErrorCode.FORBIDDEN
        elif status_code == 404:
            code = ErrorCode.NOT_FOUND
        elif status_code == 429:
            code = ErrorCode.RATE_LIMITED
            return Response(
                {"code": code, "message": "请求过于频繁，请稍后重试"},
                status=status_code,
            )

        # 提取错误详情
        detail = response.data
        if isinstance(detail, dict):
            message = "参数错误"
            errors = detail
        elif isinstance(detail, list):
            message = "参数错误"
            errors = {"non_field_errors": detail}
        else:
            message = str(detail)
            errors = None

        # 处理 DRF 校验错误，提取字段错误
        if isinstance(detail, dict):
            # 把 detail 里的 ValidationError 字符串化
            errors = {k: (v if isinstance(v, list) else [str(v)]) for k, v in detail.items()}
            message = "参数校验失败"

        return Response(
            {
                "code": code,
                "message": message,
                **({"errors": errors} if errors else {}),
            },
            status=status_code,
        )

    # 兜底：未识别异常 500
    logger.exception(
        "unhandled_exception",
        extra={"path": getattr(request, "path", ""), "method": getattr(request, "method", "")},
    )
    return Response(
        {"code": ErrorCode.INTERNAL_ERROR, "message": "服务器内部错误，请稍后重试"},
        status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
