"""common/pagination.py — 统一分页（§8.1 / §19.2）。

- 默认 page_size=20，pageSize 查询参数
- max_page_size=100 防 ?pageSize=100000
- get_paginated_response 输出统一结构
"""
from rest_framework.pagination import PageNumberPagination

from .response import ok


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "pageSize"
    max_page_size = 100
    page_query_param = "page"

    def get_paginated_response(self, data):
        return ok({
            "list": data,
            "total": self.page.paginator.count,
            "page": self.page.number,
            "pageSize": self.get_page_size(self.request),
        })
