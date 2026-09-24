# 稿定分发后端实施计划

## Context

前端（Next.js 16 + React 19 + shadcn/ui）已完成 6 个核心页面的 UI，但所有业务数据都是组件内 Mock 常量（`mockAccounts`/`mockTasks`/`mockMembers` 等），无任何 API 调用。需要：

1. 在仓库根目录新建独立的 `backend/` 子项目，使用 **Python 3.11 + FastAPI** 实现 V1.0 + V1.5 全功能后端
2. 真实对接**微信公众号开放平台**与**小红书官方 API**（用户自备 AppID/Secret）
3. 改造前端：去除 Mock，对接真实 API，新增登录页与鉴权上下文

基础设施（PostgreSQL / Redis / RabbitMQ / MinIO）由用户自备，仓库仅提供 `.env.example` 与连接配置。

## 技术栈定稿

| 层 | 选型 |
|---|---|
| Web 框架 | FastAPI 0.115+ |
| ASGI 服务器 | Uvicorn（开发）/ Gunicorn+UvicornWorker（生产） |
| ORM | SQLAlchemy 2.0（async, asyncpg 驱动） |
| 迁移 | Alembic（async 模式） |
| 校验 | Pydantic v2 |
| 认证 | JWT（python-jose）+ bcrypt 密码哈希（passlib） |
| 缓存 | redis-py 5.x async API |
| 消息队列 | RabbitMQ via `aio-pika`（异步发布任务） |
| 定时任务 | Celery 5 + celery-beat（定时发布、错峰调度） |
| 对象存储 | MinIO Python SDK |
| HTTP 客户端 | httpx（async） |
| AI | OpenAI 兼容客户端（可接 OpenAI / DeepSeek / 通义） |
| 敏感词 | `bannedword` 或自实现 DFA 算法 |
| 测试 | pytest + pytest-asyncio + httpx AsyncClient |

## 仓库目录结构

```
backend/
├── app/
│   ├── main.py                      # FastAPI 应用入口、路由挂载、中间件、异常处理器
│   ├── core/
│   │   ├── config.py               # Pydantic Settings（从 .env 读）
│   │   ├── security.py              # JWT 签发/校验、密码哈希
│   │   ├── database.py              # async engine + sessionmaker
│   │   ├── redis.py                 # redis 连接池
│   │   ├── mq.py                    # aio-pika 连接 + 发布任务队列声明
│   │   ├── minio_client.py          # MinIO 客户端单例 + presigned URL
│   │   ├── logging.py               # 结构化日志
│   │   └── exceptions.py            # 自定义异常 + 全局处理器
│   ├── deps.py                      # 公共依赖：current_user / db / redis / minio
│   ├── models/                      # SQLAlchemy ORM 模型
│   │   ├── user.py
│   │   ├── team.py                  # Team / TeamMember / Role
│   │   ├── account.py               # Account（含 token 加密字段）
│   │   ├── content.py               # ContentDraft / ContentVersion
│   │   ├── publish.py               # PublishTask / PublishLog
│   │   ├── material.py              # Material / MaterialTag
│   │   ├── stats.py                 # PlatformStats（按日聚合）
│   │   ├── review.py                # ReviewFlow / ReviewRecord
│   │   └── audit_log.py             # 操作日志
│   ├── schemas/                     # Pydantic v2 入参/出参
│   │   └── （与 models 一一对应）
│   ├── api/v1/                      # 路由（版本前缀 /api/v1）
│   │   ├── auth.py                  # /auth/register /login /refresh /me
│   │   ├── accounts.py              # CRUD + 授权回调 + 状态刷新
│   │   ├── content.py               # 草稿 CRUD + 版本历史 + AI 写作入口
│   │   ├── publish.py               # 创建发布任务 / 列表 / 重试 / 取消
│   │   ├── dashboard.py             # 数据聚合（趋势 / 平台分布 / 排行 / 队列）
│   │   ├── materials.py             # 上传（MinIO presigned）/ 列表 / 标签 / 去重
│   │   ├── team.py                  # 团队 / 成员 / 邀请 / 角色
│   │   ├── review.py                # 提交审核 / 审批 / 历史 / 敏感词检测
│   │   ├── ai.py                    # 生成 / 润色 / 标题 / 标签
│   │   └── platform_callbacks.py    # 公众号授权回调 / 小红书授权回调
│   ├── services/                    # 业务逻辑层
│   │   ├── auth_service.py
│   │   ├── account_service.py       # 含 Token 加密存储（AES-GCM）
│   │   ├── content_service.py
│   │   ├── publish_service.py       # 投递 RabbitMQ 任务
│   │   ├── dashboard_service.py    # 多源聚合查询
│   │   ├── material_service.py
│   │   ├── team_service.py
│   │   ├── review_service.py
│   │   ├── ai_service.py            # LLM 客户端封装
│   │   └── sensitive_service.py     # DFA 敏感词
│   ├── platform/                   # 平台适配层
│   │   ├── base.py                  # 抽象接口（publish/refresh_token/get_stats）
│   │   ├── wechat_mp.py             # 公众号开放平台
│   │   ├── xiaohongshu.py           # 小红书官方 API
│   │   ├── douyin.py                # V1.5 占位
│   │   ├── zhihu.py                 # V1.5 占位
│   │   ├── weibo.py                 # V1.5 占位
│   │   ├── bilibili.py              # V1.5 占位
│   │   └── registry.py              # 工厂 + 平台路由
│   ├── workers/                     # Celery worker
│   │   ├── celery_app.py            # Celery 实例（RabbitMQ broker）
│   │   ├── beat_schedule.py         # 定时发布 / Token 刷新 / 数据抓取 调度
│   │   ├── tasks_publish.py         # 消费发布队列 + 重试退避
│   │   ├── tasks_token.py           # 平台 Token 续期
│   │   ├── tasks_stats.py           # 拉取平台数据入 stats 表
│   │   └── tasks_ai.py              # 长任务 AI 生成
│   └── utils/
│       ├── crypto.py                # AES-GCM 对称加密（Token 落库前加密）
│       ├── markdown.py              # Markdown → 平台格式适配
│       └── pagination.py            # 通用分页
├── alembic/                          # 数据库迁移
│   ├── env.py
│   └── versions/
├── alembic.ini
├── tests/                            # pytest 测试
│   ├── conftest.py                   # async fixtures + 测试 DB
│   ├── test_auth.py
│   ├── test_accounts.py
│   ├── test_publish.py
│   └── ...
├── pyproject.toml                   # 依赖 + ruff/black 配置
├── .env.example                      # 配置模板
├── README.md                         # 启动指南
└── docker-compose.yml                # 仅本地开发依赖（PG/Redis/RabbitMQ/MinIO）
```

## 数据库核心表设计

> 完整 schema 详见 `backend/app/models/`，下表为关键约束说明。

| 表 | 关键字段 | 备注 |
|---|---|---|
| `users` | id, email, password_hash, role, team_id | 全局用户 |
| `teams` | id, name, owner_id | 团队/工作空间 |
| `team_members` | team_id, user_id, role(admin/editor/reviewer/viewer), status | 多对多 |
| `accounts` | id, team_id, platform, name, **encrypted_token**(JSON, AES-GCM), status, followers, group | 平台账号 |
| `content_drafts` | id, team_id, author_id, title, content_md, cover_url, tags(JSONB), status, version | 内容草稿 |
| `content_versions` | draft_id, version_no, content_md, created_by, changelog | 版本快照 |
| `publish_tasks` | id, draft_id, account_id, platform, status(pending/publishing/success/failed), scheduled_at, published_at, error_msg, retry_count | 发布任务 |
| `publish_logs` | task_id, action, payload, response, status_code | 发布全链路日志 |
| `materials` | id, team_id, type, name, url, size, hash_sha256, tags | 素材 + 去重 hash |
| `platform_stats` | account_id, date, views, likes, comments, shares, followers, follower_growth | 日聚合 |
| `review_flows` | draft_id, current_stage, config(JSONB) | 审核流配置 |
| `review_records` | flow_id, reviewer_id, stage, action, comment, created_at | 审核记录 |
| `audit_logs` | user_id, team_id, action, resource, ip, ua, payload, created_at | 全量操作日志 |

## API 端点清单（v1）

### 鉴权
- `POST /auth/register` `POST /auth/login` `POST /auth/refresh` `GET /auth/me`

### 账号
- `GET /accounts` `POST /accounts` `PATCH /accounts/{id}` `DELETE /accounts/{id}`
- `GET /accounts/{id}/status` 刷新并返回授权状态
- `GET /accounts/oauth/{platform}/start` 生成授权跳转 URL
- `GET /accounts/oauth/{platform}/callback` 处理回调（公众号走网页授权、小红书走 OAuth2 code）

### 内容创作
- `GET /content` `POST /content` `GET /content/{id}` `PATCH /content/{id}` `DELETE /content/{id}`
- `GET /content/{id}/versions` `POST /content/{id}/versions/rollback`
- `POST /content/{id}/preview?platform=wechat` 返回平台适配后的预览数据

### 发布
- `POST /publish` 创建发布任务（多账号多平台），写入 DB + 投递 RabbitMQ
- `GET /publish?status=...&page=...`
- `GET /publish/{id}` `POST /publish/{id}/retry` `POST /publish/{id}/cancel`

### 数据看板
- `GET /dashboard/overview?range=7d` 五大指标 + 环比
- `GET /dashboard/trend?range=7d` 折线趋势
- `GET /dashboard/platform-distribution` 饼图数据
- `GET /dashboard/top-contents?sort=views` 排行
- `GET /dashboard/publish-queue` 最近发布队列

### 素材
- `POST /materials/upload-url` 返回 MinIO presigned PUT URL
- `POST /materials` 完成上传后入库（含 sha256 去重）
- `GET /materials?type=&tag=&page=` `DELETE /materials/{id}`

### 团队
- `GET /team/members` `POST /team/invite` `PATCH /team/members/{id}` `DELETE /team/members/{id}`
- `GET /team/roles` 返回角色权限矩阵

### 审核
- `POST /review/submit/{draft_id}` 提交审核
- `GET /review/pending` 待我审
- `POST /review/{record_id}/approve` `POST /review/{record_id}/reject`
- `POST /review/sensitive-check` 敏感词检测接口

### AI
- `POST /ai/generate` `POST /ai/polish` `POST /ai/title` `POST /ai/tags`

## 平台真实 API 对接要点

### 微信公众号（`platform/wechat_mp.py`）
- 走「网页授权 + access_token」+「草稿箱接口 + 群发接口」
- 实现方法：
  - `get_authorize_url(state)` → 跳微信扫码授权
  - `exchange_code_for_token(code)` → 拿 openid + access_token
  - `refresh_token_if_expired(account)` → 自动续期
  - `publish(task)` → 上传图文素材(`uploadnews`) → 群发(`freepublish/submit`)
  - `get_stats(account, since, until)` → `getusersummary` / `getarticletotal`
- Token 加密：DB 落库前用 AES-GCM 加密，密钥从 `settings.PLATFORM_TOKEN_KEY` 读取

### 小红书（`platform/xiaohongshu.py`）
- 走小红书开放平台 OAuth2 + 笔记发布 API（`api.xiaohongshu.com/openapi/...`）
- 实现方法：
  - `get_authorize_url(state)` → 跳转授权
  - `exchange_token(code)` → access_token + refresh_token
  - `publish(task)` → 上传图片(`upload_image`) → 创建笔记(`create_note`)
  - `get_stats(account)` → `note_metrics`
- 小红书对图文/视频/标题长度有严格限制，适配层会做校验与裁剪

### 其他平台（V1.5 占位）
- `douyin/zhihu/weibo/bilibili` 实现抽象基类 + 抛 `NotImplementedError`，留 TODO 注释 + 配置位

## 任务调度

`workers/beat_schedule.py` 定义三类定时任务：

| 任务 | 频率 | 作用 |
|---|---|---|
| `refresh_platform_tokens` | 每 30 分钟 | 扫描 token 即将过期的账号自动续期 |
| `process_scheduled_publish` | 每分钟 | 拉取 `scheduled_at <= now` 的待发任务投递 MQ |
| `pull_platform_stats` | 每日 02:00 | 拉取所有账号昨日数据入 `platform_stats` |

发布队列消费：Celery worker 订阅 RabbitMQ `publish.tasks` 队列，单任务失败指数退避重试最多 3 次。

## 前端对接改造

### 新增前端文件
```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts              # fetch 封装 + 401 自动 refresh + credentials
│   │   ├── auth.ts                # 鉴权 API
│   │   ├── accounts.ts
│   │   ├── content.ts
│   │   ├── publish.ts
│   │   ├── dashboard.ts
│   │   ├── materials.ts
│   │   ├── team.ts
│   │   ├── review.ts
│   │   └── ai.ts
│   └── auth/
│       └── auth-context.tsx       # AuthProvider + useAuth hook
├── app/
│   ├── login/
│   │   └── page.tsx               # 登录页
│   └── layout.tsx                 # 改：包 AuthProvider；未登录 redirect /login
└── hooks/
    └── use-query.ts               # 基于 SWR 或自实现 useQuery
```

### 前端改造点
| 文件 | 改造 |
|---|---|
| `src/app/layout.tsx` | 包 `AuthProvider`；未登录 redirect `/login` |
| `src/app/page.tsx` | 保持 redirect `/dashboard` |
| `src/app/dashboard/page.tsx` | 用 `useQuery('/dashboard/overview')` 替换 `stats`/`trendData`/`platformData`/`topContents`/`recentPublish` Mock |
| `src/app/editor/page.tsx` | 草稿从 API 加载；保存走 `PATCH /content/{id}`；AI 走 `POST /ai/generate`；发布走 `POST /publish` |
| `src/app/distribute/page.tsx` | `mockTasks` → `GET /publish`；新建发布走 `POST /publish`；重试走 `POST /publish/{id}/retry` |
| `src/app/accounts/page.tsx` | `mockAccounts` → `GET /accounts`；新增账号跳 `GET /accounts/oauth/{platform}/start` |
| `src/app/materials/page.tsx` | 上传走 `POST /materials/upload-url` + PUT；列表走 `GET /materials` |
| `src/app/team/page.tsx` | `mockMembers` → `GET /team/members` |
| `src/components/layout/top-bar.tsx` | `mockAccounts` → `GET /accounts?limit=5`；新建对话保持 |

### CORS 与 Cookie
- 后端 FastAPI 配置 `CORSMiddleware`，allow_origins 包含 `http://localhost:5000` 与生产域名
- Access/Refresh Token 走 **httpOnly Cookie**（SSR 友好，防 XSS）；CSRF 用 SameSite=Lax

## 配置与启动

### `backend/.env.example`
```
APP_ENV=dev
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/gaoding
REDIS_URL=redis://localhost:6379/0
RABBITMQ_URL=amqp://guest:guest@localhost:5672//
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=gaoding-media
JWT_SECRET=change-me
JWT_ACCESS_EXPIRE_MINUTES=60
JWT_REFRESH_EXPIRE_DAYS=30
PLATFORM_TOKEN_KEY=change-me-32bytes
WECHAT_MP_APP_ID=
WECHAT_MP_APP_SECRET=
XHS_APP_ID=
XHS_APP_SECRET=
LLM_API_BASE=https://api.openai.com/v1
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LOG_LEVEL=INFO
```

### `backend/docker-compose.yml`（仅本地依赖，可选）
提供 postgres / redis / rabbitmq / minio 四个容器，方便用户一键拉起依赖。

### 启动命令
```bash
cd backend
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload --port 8000
celery -A app.workers.celery_app worker -l info
celery -A app.workers.celery_app beat -l info
```

## 实施步骤（执行顺序）

1. **脚手架**：`backend/` 骨架 + pyproject.toml + 配置 + 日志 + 异常处理 + 全局依赖
2. **DB 与模型**：core/database.py + 所有 models + Alembic 初始迁移
3. **鉴权模块**：JWT + 密码 + auth_service + auth 路由 + 测试
4. **团队模块**：team / team_members / 角色权限
5. **账号模块**：CRUD + Token 加密 + 平台适配层抽象基类
6. **平台对接**：wechat_mp + xiaohongshu 真实实现 + OAuth 回调路由
7. **内容创作**：草稿 + 版本历史 + AI 服务 + 路由
8. **发布模块**：RabbitMQ 队列 + publish_service + 路由 + Celery 消费任务
9. **定时调度**：Celery beat + 三类定时任务
10. **数据看板**：dashboard_service 聚合查询 + 路由
11. **素材库**：MinIO 集成 + presigned URL + 去重
12. **审核流程**：review_service + 敏感词 DFA
13. **前端 API 客户端**：lib/api/* + AuthProvider + login 页
14. **前端页面改造**：按上述改造点逐页替换 Mock
15. **联调验证**：登录 → 创建草稿 → AI 生成 → 绑定账号 → 发布 → 看板数据回填

## 验证方案

### 后端单测
```bash
cd backend && pytest -v
```
覆盖：auth/accounts/content/publish/materials/team/review 各模块关键路径。

### 端到端联调
1. 启动后端：`uvicorn app.main:app --reload` + `celery worker` + `celery beat`
2. 启动前端：`pnpm dev`
3. 浏览器访问 `http://localhost:5000/login`，注册/登录
4. 在「账号管理」点「绑定公众号」→ 完成微信扫码授权（如无 AppID，验证回调错误提示）
5. 在「内容创作」写一篇草稿 → 调用 AI 润色 → 保存
6. 在「一键分发」选择草稿 + 公众号账号 → 立即发布 → 看板「发布队列」状态变为「发布中」→「已发布」
7. 在「数据看板」验证趋势图/平台分布/排行从真实 DB 拉取

### 静态检查
```bash
cd backend && ruff check . && black --check .
cd .. && pnpm validate
```

## 范围边界

- ✅ 实现：V1.0 + V1.5 全部功能（账号、内容创作+AI、发布+定时+错峰+重试、看板、素材库、团队、审核流程、敏感词、操作日志）
- ✅ 真实对接：微信公众号 + 小红书
- ⚠️ 占位：抖音/知乎/微博/B站适配器（抽象基类 + 配置位 + TODO，不实现真实 API）
- ⚠️ 用户自备：PostgreSQL / Redis / RabbitMQ / MinIO 实例（提供 docker-compose 方便本地起）
- ⚠️ 用户自备：微信开放平台 AppID/Secret、小红书开放平台 AppID/Secret、LLM API Key
