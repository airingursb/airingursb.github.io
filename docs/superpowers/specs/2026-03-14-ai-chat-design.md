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
- AI 回答逐字流式显示（SSE），流结束后用 marked + DOMPurify 渲染 Markdown（链接、代码、加粗等）
- 右下角显示轮次计数（x/5）
- 5 轮后输入框替换为提示文字："更多内容请访问我的博客 →"
- 颜色：用户 `you>` 用 `#4ade80`，AI `ai>` 用 `#7d8590`

### 错误处理

| 场景 | 前端表现 |
|------|---------|
| 网络断开 / SSE 连接失败 | 输入框下方显示 `⚠ 连接失败，请稍后再试`，可重新发送 |
| 限频（429） | 显示 `⚠ 请求太频繁，请 X 分钟后再试` |
| 网关超时（Gateway 无响应） | 10 秒超时后显示 `⚠ AI 服务暂时不可用` |
| 轮次用完 | 输入框替换为 "今日对话次数已用完，24 小时后重置" |
| Token 无效 | 清除 localStorage，重新调 /api/chat/init |

### 会话机制

**访客身份：**
- 首次访问时，前端调 `POST /api/chat/init` 获取 `visitor_token`（服务端生成 visitor_id + HMAC 签名）
- `visitor_token` 存 `localStorage`，后续所有请求携带此 token
- 中间服务验证 HMAC 签名，防止伪造/猜测 visitor_id

**会话生命周期：**
- 每个 visitor_id 按 24 小时滚动窗口计算轮次（5 轮/24 小时）
- 超过 24 小时未活动的轮次自动过期，可重新对话
- 查询轮次时只计算 `created_at > NOW() - INTERVAL '24 hours'` 的消息

**会话恢复：**
- 页面加载时，用 visitor_token 请求中间服务获取最近 24 小时内的对话
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

**POST /api/chat/init**

首次访问时调用，获取签名 token。

响应：
```json
{
  "visitor_token": "visitor_id.hmac_signature"
}
```

服务端生成 UUID 作为 visitor_id，HMAC(visitor_id, server_secret) 作为签名，拼接返回。同时在 Supabase 创建 chat_visitors 记录。

---

**POST /api/chat**

请求：
```json
{
  "visitor_token": "visitor_id.hmac_signature",
  "message": "你博客里写过 SwiftUI 吗？"
}
```

请求头：`Content-Type: application/json`（强制校验）

响应：SSE 流（`Content-Type: text/event-stream`）
```
data: {"type":"delta","content":"有"}
data: {"type":"delta","content":"的"}
data: {"type":"delta","content":"，"}
...
data: {"type":"done","usage":{"round":1,"max_rounds":5}}
data: [DONE]
```

错误响应：
```json
{"type":"error","code":"RATE_LIMITED","message":"请稍后再试","retry_after":300}
{"type":"error","code":"INVALID_TOKEN","message":"无效的访客凭证"}
{"type":"error","code":"GATEWAY_ERROR","message":"AI 服务暂时不可用"}
{"type":"error","code":"LIMIT_REACHED","message":"今日对话次数已用完，24 小时后重置"}
```

处理流程：
1. 校验 Content-Type 为 application/json
2. 验证 visitor_token 的 HMAC 签名
3. IP 限频检查（10 次/IP/小时）
4. 输入校验（max 200 字符）
5. 从 Supabase 查询该 visitor_id 最近 24 小时的消息，检查轮次（≥5 则返回 LIMIT_REACHED）
6. 构建 messages 数组，调用 OpenClaw `POST /v1/chat/completions`（stream: true, user: visitor_id）
7. 透传 SSE delta 到前端
8. 流结束后，将本轮 user message + assistant response 写入 Supabase
9. 若 Supabase 写入失败，记录日志但不影响已完成的流式响应
10. 更新 chat_visitors 的 last_seen_at、ip、user_agent

**GET /api/chat/history**

请求头：`X-Visitor-Token: visitor_id.hmac_signature`

响应（返回最近 24 小时内的消息，最多 10 条）：
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

---

**CORS 配置**

中间服务配置 CORS 允许 LocalCan 公网域名和 localhost 开发地址：
- `Access-Control-Allow-Origin`: 配置白名单（公网域名 + localhost）
- `Access-Control-Allow-Methods`: GET, POST, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, X-Visitor-Token

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

-- 聊天记录按 24 小时窗口查询轮次
-- SELECT COUNT(*)/2 FROM chat_messages
--   WHERE visitor_id = $1 AND created_at > NOW() - INTERVAL '24 hours';
```

RLS 策略：中间服务使用 service_role key 连接，绕过 RLS。前端不直接访问 Supabase。

## 安全措施

| 层级 | 措施 |
|------|------|
| 网络 | OpenClaw 端口仅容器内部可达，对外只暴露中间服务 |
| 鉴权 | OpenClaw token 在中间服务注入，前端不可见 |
| 访客鉴权 | HMAC 签名 visitor_token，防伪造/枚举 |
| 限频 | IP 维度 10 次/小时（内存 Map，重启清零可接受） |
| 输入 | 最大 200 字符，Content-Type 强制校验 |
| 输出 | Agent max_tokens 500，前端用 marked + DOMPurify 渲染 Markdown |
| 会话 | 5 轮/24 小时滚动窗口 |
| CORS | 白名单限制允许的 Origin |
| 隔离 | Docker 容器隔离，agent 工具只能操作容器内文件 |

## 技术栈

| 组件 | 技术 |
|------|------|
| 容器 | OrbStack + Docker |
| 中间服务 | Node.js（原生 http 或 fastify） |
| AI 网关 | OpenClaw Gateway |
| 数据库 | Supabase PostgreSQL |
| 公网暴露 | LocalCan |
| 前端 | 原生 JS，SSE，localStorage，marked + DOMPurify |

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
