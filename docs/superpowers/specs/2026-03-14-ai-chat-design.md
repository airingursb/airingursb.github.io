# AI Chat 设计文档（SHU-201）

基于 OpenClaw 的博客 AI 问答功能，嵌入主页 intro card。

## 架构

```
用户浏览器
  → LocalCan 公网域名
  → Mac Mini :18789
  → Docker 容器（OrbStack）
    → 中间服务（Node.js HTTP server）
      → OpenClaw Gateway（/v1/chat/completions，session 隔离）
      → Supabase PostgreSQL（写入聊天记录 + 访客信息）
  ← SSE 流式响应
  → 前端展示
```

### 为什么需要中间服务

OpenClaw Chat Completions API 是 operator 级权限，不能直接暴露给前端。中间服务负责：

1. 注入 OpenClaw auth token 和 agent ID
2. 管理访客 session（visitor_id → OpenClaw user 字段映射）
3. 每轮对话写入 Supabase
4. 限频（IP 维度）
5. 透传 SSE 流式响应

中间服务和 OpenClaw Gateway 运行在同一个 Docker 容器内。对外只暴露中间服务端口（如 3000），OpenClaw Gateway 端口（18789）仅容器内部可达。

## 前端设计

### 入口

嵌入 intro card 底部，分隔线下方，一行终端风格输入框：

```
Hi, folks. I'm
Airing_
Software Engineer @ Singapore
Blog · GitHub · Twitter
─────────────────────────
>_ Ask me anything about my blog...
```

### 对话展开

用户输入后，intro card 向下展开。对话区出现在分隔线和输入框之间：

```
─────────────────────────
you> 你博客里写过 SwiftUI 吗？
ai> 有的，我写过几篇关于 SwiftUI 的文章...
you> 哪篇最推荐？
ai> 推荐《SwiftUI 实践指南》这篇...          3/5 轮
─────────────────────────
>_ |
```

- 对话区 max-height 约 200px，超出可滚动
- AI 回答逐字流式显示（SSE）
- 右下角显示轮次计数（x/5）
- 5 轮后输入框替换为提示文字："更多内容请访问我的博客 →"
- 颜色：用户 `you>` 用 `#4ade80`，AI `ai>` 用 `#7d8590`

### 会话恢复

- 访客 ID 存 `localStorage`（`crypto.randomUUID()`）
- 页面加载时，用 visitor_id 请求中间服务获取历史对话
- 有历史记录时，intro card 默认展开显示最近对话
- 无历史记录时，只显示输入框

### 移动端

- 输入框和对话区全宽
- 对话区 max-height 适当缩小（约 160px）
- 虚拟键盘弹出时页面不跳动（用 `visualViewport` API 处理）

## 后端设计

### Docker 容器结构

```
Docker 容器（OrbStack，node:24-slim）
├── OpenClaw Gateway（端口 18789，仅容器内部）
├── 中间服务（端口 3000，映射到宿主机）
├── 博客文件（/app/blog/，挂载）
└── 配置文件
```

### 中间服务 API

**POST /api/chat**

请求：
```json
{
  "visitor_id": "uuid-string",
  "message": "你博客里写过 SwiftUI 吗？"
}
```

响应：SSE 流（`Content-Type: text/event-stream`）
```
data: {"type":"delta","content":"有"}
data: {"type":"delta","content":"的"}
data: {"type":"delta","content":"，"}
...
data: {"type":"done","usage":{"round":1,"max_rounds":5}}
data: [DONE]
```

处理流程：
1. IP 限频检查（10 次/IP/小时，内存存储）
2. 输入校验（max 200 字符，基础敏感词过滤）
3. 从 Supabase 查询该 visitor_id 的历史消息，构建 messages 数组
4. 调用 OpenClaw `POST /v1/chat/completions`（stream: true, user: visitor_id）
5. 透传 SSE delta 到前端
6. 流结束后，将本轮 user message + assistant response 写入 Supabase
7. 轮次超过 5 轮返回 `{"type":"limit_reached"}`

**GET /api/chat/history?visitor_id=xxx**

响应：
```json
{
  "messages": [
    {"role": "user", "content": "...", "created_at": "..."},
    {"role": "assistant", "content": "...", "created_at": "..."}
  ],
  "round": 3,
  "max_rounds": 5
}
```

### OpenClaw 配置

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true }
      }
    },
    auth: {
      mode: "token",
      token: "ENV:OPENCLAW_TOKEN"
    }
  }
}
```

Agent system prompt 要点：
- 你是 Airing 的博客 AI 助手
- 基于 /app/blog/ 下的博客文件回答问题
- 回答简洁，中文为主
- 适当引用具体文章标题和链接
- 不回答与博客内容无关的问题

### Supabase 数据库

```sql
-- 访客表
CREATE TABLE chat_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT UNIQUE NOT NULL,
  ip TEXT,
  user_agent TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visitors_visitor_id ON chat_visitors(visitor_id);

-- 聊天记录表
CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES chat_visitors(visitor_id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_visitor_id ON chat_messages(visitor_id, created_at);

-- 限频表（可选，也可用内存）
CREATE TABLE chat_rate_limits (
  ip TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_ip ON chat_rate_limits(ip, requested_at);
```

RLS 策略：中间服务使用 service_role key 连接，绕过 RLS。前端不直接访问 Supabase。

## 安全措施

| 层级 | 措施 |
|------|------|
| 网络 | OpenClaw 端口仅容器内部可达，对外只暴露中间服务 |
| 鉴权 | OpenClaw token 在中间服务注入，前端不可见 |
| 限频 | IP 维度 10 次/小时（中间服务内存 Map） |
| 输入 | 最大 200 字符，基础 XSS/注入过滤 |
| 输出 | Agent max_tokens 500，前端对 HTML 转义 |
| 会话 | 5 轮/会话上限 |
| 隔离 | Docker 容器隔离，agent 工具只能操作容器内文件 |

## 技术栈

| 组件 | 技术 |
|------|------|
| 容器 | OrbStack + Docker |
| 中间服务 | Node.js（原生 http 或 fastify） |
| AI 网关 | OpenClaw Gateway |
| 数据库 | Supabase PostgreSQL |
| 公网暴露 | LocalCan |
| 前端 | 原生 JS，SSE，localStorage |

## 实施步骤

1. Supabase 创建表（chat_visitors, chat_messages）
2. Docker 镜像构建（OpenClaw + 中间服务 + 博客文件）
3. 中间服务开发（/api/chat + /api/chat/history）
4. OpenClaw agent 配置（system prompt + Chat Completions 启用）
5. LocalCan 配置公网域名
6. 前端 intro card 聊天 UI 开发
7. 联调 + 移动端适配

## 成本

| 项目 | 月费 |
|------|------|
| OrbStack | $0 |
| OpenClaw | $0 |
| Supabase Free Tier | $0 |
| LocalCan | 已有 |
| LLM 推理 | ~$0 |
| **合计** | **~$0/月** |
