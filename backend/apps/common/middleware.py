"""common/middleware.py — 横切关注点（§18.4）。

- RequestIDMiddleware: 生成 request_id 透传到日志与响应头
- 轻量，不查数据库，不做业务逻辑
"""
import uuid

from django.utils.deprecation import MiddlewareMixin


class RequestIDMiddleware(MiddlewareMixin):
    """为每个请求注入 request_id（§22.3）。

    - 优先复用 X-Request-Id 请求头
    - 缺失则生成 uuid4
    - 响应头回写 X-Request-Id
    """

    HEADER = "X-Request-Id"

    def process_request(self, request):
        request.id = request.headers.get(self.HEADER) or uuid.uuid4().hex

    def process_response(self, request, response):
        response[self.HEADER] = getattr(request, "id", "")
        return response
