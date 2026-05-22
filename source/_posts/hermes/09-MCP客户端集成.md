# 九、MCP 客户端集成（待验证）

## 9.1 为什么需要 MCP？

Hermes 内置工具固定在代码里，难以动态扩展。MCP 提供了标准化的工具发现协议——任何实现了 MCP 服务端的程序（文件系统操作、数据库查询、GitHub API 等）都可以即插即用，无需修改 Hermes 源码。

---

## 9.2 从配置到工具调用的完整流程

*[嵌入图表]*

## 9.3 两种传输模式

### stdio 模式（本地子进程）

```yaml
# ~/.hermes/config.yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    env:
      SOME_TOKEN: "abc"    # 只传这个，不泄漏主进程的其他 env
    timeout: 120           # 工具调用超时（秒）
    connect_timeout: 60    # 连接建立超时
```

**安全设计**：子进程只继承白名单环境变量（`PATH`、`HOME` 等），避免泄漏 `OPENAI_API_KEY` 等敏感变量。

### HTTP 模式（远程服务器）

```yaml
mcp_servers:
  remote_api:
    url: "https://my-mcp-server.example.com/mcp"
    headers:
      Authorization: "Bearer sk-..."
    timeout: 180
```

---

## 9.4 线程安全架构

```
主线程（同步，AIAgent 工具调用）
    │
    │  registry.dispatch("filesystem__read_file", args)
    │           │
    │           ▼  run_coroutine_threadsafe(coro, _mcp_loop)
    ├─────────────────────────────────────────────────────
    │           │  后台 MCP 专属线程（daemon）
    │           │  _mcp_loop (asyncio EventLoop，长驻)
    │           │
    │           ├── Server Task: filesystem  ── 长驻 asyncio Task
    │           │     └── 保持 stdio 子进程 stdin/stdout 连接
    │           │     └── session.call_tool("read_file", args) → 结果
    │           │
    │           └── Server Task: github      ── 长驻 asyncio Task
    │                 └── 保持 HTTP 持久连接
    │
    ◀─────────────── Future.result()（同步等待）
```

**关键约束**：anyio 要求连接的关闭必须在打开它的同一个 Task 内完成，因此每个 MCP 服务器都维护一个长驻 asyncio Task，不能跨 Task 调用。

---

## 9.5 工具命名规范

```python
# 工具在 registry 中的注册名格式：{server_name}__{tool_name}
"filesystem__read_file"   # filesystem 服务器的 read_file 工具
"github__create_pr"       # github 服务器的 create_pr 工具
"remote_api__analyze"     # 远程服务器的 analyze 工具

# toolset 格式：mcp_{server_name}
# 允许按服务器粒度启用/禁用
```

---

## 9.6 自动重连机制

服务器崩溃或网络断开后，Hermes 自动指数退避重连：

```python
# tools/mcp_tool.py
_MAX_RECONNECT_RETRIES = 5
_MAX_BACKOFF_SECONDS = 60

for attempt in range(1, _MAX_RECONNECT_RETRIES + 1):
    delay = min(2 ** attempt, _MAX_BACKOFF_SECONDS)
    # attempt=1: 2s, 2: 4s, 3: 8s, 4: 16s, 5: 32s（上限 60s）
    await asyncio.sleep(delay)
    # 重建连接、重新注册工具...
```

---

## 9.7 动态工具发现（tools/list_changed）

MCP 1.x 支持服务器主动通知工具列表变化，Hermes 监听并自动更新：

```
服务器发出 notifications/tools/list_changed
    │
    ▼ Hermes MCP 后台线程
    ├── registry.deregister("{server_name}__*")  # 批量清理旧工具
    ├── session.list_tools()                      # 获取新工具列表
    └── registry.register(每个新工具)              # 重新注册
```

---

## 9.8 Sampling：服务器发起 LLM 请求

高级特性：部分 MCP 服务器在工具执行中需要调用 LLM（如 AI 辅助分析服务器）。

```yaml
mcp_servers:
  analysis:
    command: "npx"
    args: ["-y", "analysis-server"]
    sampling:
      enabled: true
      model: "gemini-3-flash"    # 为 sampling 单独指定廉价模型
      max_tokens_cap: 4096
      max_rpm: 10                # 速率保护
      max_tool_rounds: 5         # 工具调用轮次上限
```

```
外部 MCP 服务器
    │ sampling/createMessage 请求（"我需要 LLM 分析这段代码"）
    ▼
Hermes SamplingHandler
    ├── 速率检查（max_rpm）
    ├── 调用 sampling.model（非主模型，避免成本失控）
    └── 返回 LLM 结果给服务器，服务器继续工具执行
```

---

## 9.9 错误信息脱敏

工具调用失败时，返回给 LLM 的错误信息会自动脱敏：

```python
# 脱敏前：
"Connection failed: Authorization: Bearer ghp_abc123xyz..."
# 脱敏后：
"Connection failed: Authorization: [REDACTED]"
```
