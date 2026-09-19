"""Rich HTML chapter bodies for DeepSeek Harness (DSH) immersive article."""
from __future__ import annotations

from _html_helpers import (
    cmp,
    formula,
    h3,
    h4,
    join,
    keynums,
    ladder,
    note,
    p,
    pull,
    sp,
    src,
)
from doc_map import doc_ref
from visuals import (
    station_track,
    viz_22_stations_panorama,
    viz_cordis_layers,
    viz_event_domains,
    viz_harness_compare,
    viz_plugin_spectrum,
    viz_session_log,
    viz_turn_step,
)

PROMPT_ZH = "读取 README.md，用一句话告诉我这个项目做什么"
PROMPT_EN = "read README.md and tell me what this project does in one sentence"


def event_table(events: list[tuple[str, str, str]]) -> str:
    inner = ['<div class="event-flow">']
    for etype, zh, en in events:
        inner.append(
            f'      <div class="ef-row"><div class="ef-type">{etype}</div>'
            f'<div><span class="lang-zh-only">{zh}</span><span class="lang-en-only">{en}</span></div></div>'
        )
    inner.append("    </div>")
    return f"""    <figure>
      <div class="figbox">{chr(10).join(inner)}
      </div>
      <figcaption><span class="figid">EVT</span><span class="lang-zh-only">SessionEvent 流 · 主线 prompt</span><span class="lang-en-only">SessionEvent stream · through-line prompt</span></figcaption>
    </figure>"""


def core_ctx_table() -> str:
    return cmp(["ctx 键", "Package", "职责 / Role"], [
        ["ctx.sessions", "packages/core/session", "append-only SessionEvent log"],
        ["ctx.systemPrompt", "packages/core/system-prompt", "prompt section + tool schema assembly"],
        ["ctx.tools", "packages/core/tools", "scoped registry + guarded pipeline"],
        ["ctx.agents", "packages/core/agent", "Agent registry + agent/* events"],
        ["ctx.agentLoop", "packages/core/agent-loop", "ReactLoopAgent driver"],
        ["ctx.llm", "packages/llm/llm", "adapter registry + llm/stream waterfall"],
    ])


def build_all_chapters() -> dict[str, str]:
    return {
        "c1": chapter_c1(),
        "c2": chapter_c2(),
        "c3": chapter_c3(),
        "c4": chapter_c4(),
        "c5": chapter_c5(),
        "c6": chapter_c6(),
        "c7": chapter_c7(),
        "c8": chapter_c8(),
        "c9": chapter_c9(),
        "c10": chapter_c10(),
        "c11": chapter_c11(),
        "c12": chapter_c12(),
        "c13": chapter_c13(),
        "c14": chapter_c14(),
        "c15": chapter_c15(),
        "c16": chapter_c16(),
        "c17": chapter_c17(),
        "c18": chapter_c18(),
        "c19": chapter_c19(),
        "c20": chapter_c20(),
        "c21": chapter_c21(),
        "c22": chapter_c22(),
        "c23": chapter_c23(),
        "c24": chapter_c24(),
        "c25": chapter_c25(),
        "c26": chapter_c26(),
    }


def chapter_c1() -> str:
    return join(
        p(
            f"DeepSeek Harness（DSH）不是又一个 ChatGPT 套壳——它是 DeepSeek 开源的 <strong>Cordis 插件 harness</strong>。主线 prompt <code>{PROMPT_ZH}</code> 在 DSH 里不会「直接发给模型」：它先进入 <code>ctx.agents</code> 的 inbox，被 <code>ReactLoopAgent</code> 认领，写成 <code>user/message</code> SessionEvent，再经 <code>deriveMessages()</code> 投影成 LLM 请求。",
            f"DeepSeek Harness (DSH) is not another ChatGPT wrapper — it is DeepSeek's open <strong>Cordis plugin harness</strong>. The through-line prompt <code>{PROMPT_EN}</code> never goes straight to the model: it enters <code>ctx.agents</code> inbox, is claimed by <code>ReactLoopAgent</code>, logged as <code>user/message</code> SessionEvent, then projected via <code>deriveMessages()</code> into an LLM request.",
        ),
        h3("Harness 不是 Product", "Harness is not a product"),
        p(
            "Claude Code、Cursor 把 agent 循环焊进密封二进制：你能用，但很难逐事件 trace。Pi 把循环写进 TypeScript，但故意省略 MCP 与子 agent。DSH 的赌注是：<strong>一切都是插件</strong>——包括 agent loop 本身——同时保留 MCP、compaction、fork/resume、Agent Teams。",
            "Claude Code and Cursor weld the agent loop into sealed binaries: usable, but hard to trace event-by-event. Pi writes the loop in TypeScript but intentionally omits MCP and sub-agents. DSH bets that <strong>everything is a plugin</strong> — including the agent loop itself — while keeping MCP, compaction, fork/resume, and Agent Teams.",
        ),
        sp([
            ("产品", "Product", "卖体验闭环：安装 → 第一次 commit 零配置", "Sells closed-loop UX: install → first commit with zero config"),
            ("Harness", "Harness", "卖可观测编排：每一站都有源码、测试、dump-config", "Sells observable orchestration: every station has source, tests, dump-config"),
            ("DSH 差异", "DSH difference", "无 privileged core；改行为 = 挂插件或写 patch", "No privileged core; change behavior = mount plugin or write patch"),
            ("主线", "Through-line", "同一句话走完整 turn/step + tool pipeline", "Same sentence walks full turn/step + tool pipeline"),
        ]),
        formula("架构公式", "ARCHITECTURE", [
            '<span class="term">Product</span> = UX × Integrations × Policy',
            '<span class="term-cu">DSH</span> = Cordis × SessionEvent × ReactLoopAgent × Seams',
        ], "DSH 选择可组合 + 可回放", "DSH chooses composability + replayability"),
        cmp(["", "Claude Code", "Cursor", "DSH"], [
            ["内核", "密封 CLI", "密封 IDE", "Cordis 插件树"],
            ["会话", "专有云", "专有", "SessionEvent log"],
            ["扩展", "MCP", "VS Code", "Bundle + patch + npm 插件"],
            ["子 agent", "内置", "内置", "packages/subagent/*"],
            ["trace", "黑盒", "黑盒", "dump-config + session log"],
        ]),
        h3("为什么开源 harness 仍然重要", "Why an open harness still matters"),
        p(
            "官方 <code>docs/architecture.md</code> 第一句就点明：改 <code>packages/</code> 前先读 Cordis primer。DSH 把「模型可见即已记录」（Model-visible means logged）写成运行时 invariant——这意味着你 trace 主线 prompt 时，<strong>日志就是真相源</strong>，不是调试输出。",
            "Official <code>docs/architecture.md</code> opens with: read the Cordis primer before changing <code>packages/</code>. DSH encodes «Model-visible means logged» as a runtime invariant — when tracing the through-line prompt, <strong>the log is the source of truth</strong>, not debug output.",
        ),
        src("arch", "docs/architecture.md", [
            '<span class="src-comment">/** There is no privileged core to patch */</span>',
            '<span class="src-kw">Every part of the product is a plugin</span>, including the model adapter,',
            'the tool registry, the session log, and the agent loop itself.',
        ]),
        note("DSH 解决的是「想理解 agent 内部机制、还要能改」的开发者；Claude Code/Cursor 解决的是「想马上写代码」的开发者。", "DSH serves developers who want to understand and modify agent internals; Claude Code/Cursor serve developers who want to code immediately.", copper=True),
        pull("产品卖的是答案。<br>DSH 卖的是<strong>能 dump 出下一层配置</strong>的显微镜。", "Products sell answers.<br>DSH sells the microscope that can <strong>dump the next layer of config</strong>."),
        doc_ref("architecture"),
        doc_ref("cordis-primer"),
        viz_plugin_spectrum(),
    )


def chapter_c2() -> str:
    return join(
        p(
            f"按下回车发送 <code>{PROMPT_ZH}</code> 之后，Web UI（:3080）或 headless CLI 不会立刻调用 DeepSeek API——消息先进入 agent inbox，驱动器发出 <code>turn/start</code>，经过 <code>agent/pre-step</code> waterfall，在 <code>step/start</code> 后落成 <code>user/message</code>，然后才是 <code>llm/stream</code>、<code>assistant/chunk*</code>、<code>tool/call*</code>，最后 <code>turn/end</code>。",
            f"After Enter on <code>{PROMPT_EN}</code>, the Web UI (:3080) or headless CLI does not immediately call the DeepSeek API — the message enters agent inbox, the driver emits <code>turn/start</code>, passes <code>agent/pre-step</code> waterfall, lands as <code>user/message</code> after <code>step/start</code>, then <code>llm/stream</code>, <code>assistant/chunk*</code>, <code>tool/call*</code>, and finally <code>turn/end</code>.",
        ),
        h3("22 站全景地图", "22-station panorama map"),
        p(
            "下面两图把一条用户消息从 CLI/profile 解析到 compaction 检查的<strong>完整工序</strong>摊开。持住这张地图，C03–C26 每章只解释相邻两站之间的过渡，细节才不会丢。",
            "The two diagrams below lay out the <strong>full path</strong> of one user message from CLI/profile parse to compaction check. Hold this map: chapters C03–C26 each explain one transition between adjacent stations.",
        ),
        viz_22_stations_panorama(),
        station_track(),
        h3("主线事件序（简化）", "Through-line event order (simplified)"),
        event_table([
            ("turn/start", "新 turn 打开 · claim inbox 批次", "New turn opens · claim inbox batch"),
            ("agent/pre-step", "waterfall：reject 或 enter(messages)", "waterfall: reject or enter(messages)"),
            ("step/start", "一步 model 请求 + 工具批次开始", "One model request + tool batch begins"),
            ("user/message", "主线 prompt 写入 SessionEvent log", "Through-line prompt written to SessionEvent log"),
            ("llm/stream", "DeepSeek adapter 流式返回", "DeepSeek adapter streams back"),
            ("assistant/chunk*", "流式 token · UI 订阅 session/event", "Streaming tokens · UI subscribes session/event"),
            ("tool/call", "模型选择 read(README.md)", "Model chooses read(README.md)"),
            ("tool/result", "工具结果 · 进入 deriveMessages 投影", "Tool result · enters deriveMessages projection"),
            ("turn/end", "无更多 step 欠账 · agent idle", "No more steps owed · agent idle"),
        ]),
        h3("Turn 与 Step 的嵌套关系", "Turn and step nesting"),
        p(
            "官方 <code>agent-lifecycle.md</code> 定义：<strong>step</strong> = 一次 model 请求 + 其工具调用；<strong>turn</strong> = 零个或多个 step。主线 prompt 通常产生 <strong>两个 step</strong>（第一次 toolUse read，第二次 stop 回答），包在同一个 turn 里。",
            "Official <code>agent-lifecycle.md</code> defines: a <strong>step</strong> is one model request plus its tool calls; a <strong>turn</strong> is zero or more steps. The through-line prompt usually yields <strong>two steps</strong> (first toolUse read, second stop answer) inside one turn.",
        ),
        ladder([
            ("Turn 1", "turn/start → step 1 → read tool → step/end"),
            ("Step 2", "step/start → deriveMessages → llm/stream → assistant stop"),
            ("Turn close", "turn/end → agent/status idle"),
        ]),
        doc_ref("agent-lifecycle"),
        note("C02 是望远镜；C09–C13 是显微镜。", "C02 is the telescope; C09–C13 are the microscope.", copper=True),
    )


def chapter_c3() -> str:
    return join(
        p(
            "Cordis 是 vendored 在 <code>vendor/</code> 的插件框架：每个能力是一个 <code>Service</code>，通过 <code>ctx.&lt;key&gt;</code> 暴露，通过 <code>inject</code> 声明依赖，通过 <code>ctx.on()</code> / <code>ctx.effect()</code> 注册可逆副作用。DSH 没有「核心二进制」——连 agent loop 也是 <code>@deepseek-ai/dsh-agent-loop</code> 插件。",
            "Cordis is the vendored plugin framework under <code>vendor/</code>: each capability is a <code>Service</code> exposed via <code>ctx.&lt;key&gt;</code>, dependencies via <code>inject</code>, reversible side effects via <code>ctx.on()</code> / <code>ctx.effect()</code>. DSH has no «core binary» — even the agent loop is the <code>@deepseek-ai/dsh-agent-loop</code> plugin.",
        ),
        h3("Context · Plugin · Mount", "Context · Plugin · Mount"),
        p(
            "Loader 读取 <code>cordis.yml</code> / patch 行，按服务可用性激活插件——<strong>行顺序无加载语义</strong>。插件 mount 时 claim <code>ctx.sessions</code> 等键；unmount 时 effect  unwind。其他插件通过 key 查找服务，而非 import 具体实现。",
            "Loader reads <code>cordis.yml</code> / patch rows and activates plugins by service availability — <strong>row order has no load semantics</strong>. On mount a plugin claims keys like <code>ctx.sessions</code>; on unmount effects unwind. Other plugins find services by key, not by importing concrete implementations.",
        ),
        cmp(["Cordis 范式", "DSH 例子", "主线 touchpoint"], [
            ["Service", "ctx.tools", "read 工具注册"],
            ["inject", "agent-loop → session, llm", "ReactLoopAgent 启动"],
            ["waterfall", "agent/pre-step", "compaction · skill 目录注入"],
            ["effect", "systemPrompt section", "AGENTS.md 栈"],
            ["emit", "session/event", "Web UI 渲染"],
        ]),
        h3("Waterfall 与 short-circuit", "Waterfall and short-circuit"),
        p(
            "<code>ctx.waterfall</code> 是 around-middleware：listener 收到 <code>(payload, next)</code>，调用 <code>next()</code> 继续链，不调用则 short-circuit。<code>agent/pre-step</code> 的返回值<strong>权威</strong>——可以 reject 整个 step 或 rewrite enter(messages)。",
            "<code>ctx.waterfall</code> is around-middleware: a listener receives <code>(payload, next)</code>, calls <code>next()</code> to continue the chain, or short-circuits without it. The <code>agent/pre-step</code> return is <strong>authoritative</strong> — it can reject the whole step or rewrite enter(messages).",
        ),
        src("cordis", "docs/cordis-primer.md", [
            '<span class="src-kw">A plugin</span> waits until injected services exist —',
            'load order is expressed through <span class="src-str">inject</span>, not manual boot sequencing.',
        ]),
        viz_cordis_layers(),
        doc_ref("cordis-primer"),
    )


def chapter_c4() -> str:
    return join(
        p(
            "运行中的 <code>dsh</code> 是一棵按序叠加的插件树：<strong>Profile</strong>（命名组合，存于 <code>$DSH_HOME/profiles/&lt;name&gt;</code>）列出 bundles + 用户 <code>cordis.patch.yml</code>；<strong>Bundle</strong>（如 <code>@deepseek-ai/dsh-base</code>）是 Cordis 配置行 + 代码的发行格式。",
            "A running <code>dsh</code> is a plugin tree stacked in order: a <strong>Profile</strong> (named composition under <code>$DSH_HOME/profiles/&lt;name&gt;</code>) lists bundles plus the user's <code>cordis.patch.yml</code>; a <strong>Bundle</strong> (e.g. <code>@deepseek-ai/dsh-base</code>) is the distribution format for Cordis config rows and the code they mount.",
        ),
        h3("三层叠加顺序", "Three-layer stack order"),
        ladder([
            ("bundles[]", "dsh-base → dsh-web-app（profile 声明顺序）"),
            ("profile patch", "profiles/web/cordis.patch.yml"),
            ("home patch", "$DSH_HOME/cordis.patch.yml"),
            ("--patch", "CLI 一次性 overlay"),
        ]),
        p(
            "Patch 按 <code>id</code>  targeting：<strong>整行替换 config</strong>，不是 deep-merge。要看机器实际 boot 的树，运行 <code>dsh --profile web --dump-config</code>——输出与 <code>boot()</code> 挂载的树一致（<code>packages/boot/app-boot</code> 的 <code>renderConfigDump</code>）。",
            "Patches target by <code>id</code>: they <strong>replace the whole row config</strong>, not deep-merge. To see the tree your machine actually boots, run <code>dsh --profile web --dump-config</code> — output matches what <code>boot()</code> mounts (<code>renderConfigDump</code> in <code>packages/boot/app-boot</code>).",
        ),
        h3("官方三个 Bundle", "Three official bundles"),
        cmp(["Bundle", "Package", "Adds"], [
            ["dsh-base", "packages/bundle/base", "模型 · 工具 · 会话 · 沙箱 · 凭据"],
            ["dsh-web-app", "packages/bundle/web-app", "浏览器 UI · :3080 Host"],
            ["dsh-headless", "packages/bundle/headless", "一次性 runner · 无 HTTP"],
        ]),
        src("dump", "apps/cli/src/bin.ts", [
            '<span class="src-comment">// dsh --profile web --dump-config</span>',
            '<span class="src-fn">renderConfigDump</span>(binName, configPath, layers, warn)',
        ]),
        sp([
            ("web", "web profile", "首次使用自动从模板初始化", "auto-init from template on first use"),
            ("headless", "headless", "单会话 · 打印最终回答 · exit", "one session · print final answer · exit"),
            ("plugin", "dsh plugin", "pnpm 管理 profile 外树插件", "pnpm manages out-of-tree profile plugins"),
        ]),
        doc_ref("architecture"),
    )


def chapter_c5() -> str:
    return join(
        p(
            "<code>@deepseek-ai/dsh-base</code> 的 <code>cordis.patch.yml</code> 在空 profile 根上 insert 所有基础插件行——每个 profile 的 <code>dsh.profile.bundles</code> 第一层。文档把<strong>六个 ctx 脊柱服务</strong>列为理解 turn 流的最小集合。",
            "<code>@deepseek-ai/dsh-base</code> <code>cordis.patch.yml</code> inserts every base plugin row over the empty profile root — the first layer of every profile's <code>dsh.profile.bundles</code>. Docs list <strong>six ctx spine services</strong> as the minimal set for understanding turn flow.",
        ),
        h3("六层 ctx 脊柱", "Six ctx spine layers"),
        core_ctx_table(),
        viz_cordis_layers(),
        h3("dsh-base 还包含什么", "What else dsh-base includes"),
        p(
            "除六脊柱外，base patch 还 insert 沙箱（<code>bash-sandbox</code> / <code>pwsh-sandbox</code> 平台门控）、审批（<code>user-approval</code>）、settings/credentials、telemetry、spawn/fork subagent providers 等。Windows 与 POSIX 通过 <code>disabled: !!js process.platform === 'win32'</code> 在同一 patch 文件里互斥挂载 shell 栈。",
            "Beyond the six spine services, the base patch also inserts sandbox (<code>bash-sandbox</code> / <code>pwsh-sandbox</code> platform gating), approval (<code>user-approval</code>), settings/credentials, telemetry, spawn/fork subagent providers, etc. Windows and POSIX mutually exclude shell stacks in one patch file via <code>disabled: !!js process.platform === 'win32'</code>.",
        ),
        src("base", "packages/bundle/base/cordis.patch.yml", [
            '- id: session',
            '  name: \'@deepseek-ai/dsh-session\'',
            '- id: agent-loop',
            '  name: \'@deepseek-ai/dsh-agent-loop\'',
        ]),
        formula("依赖方向", "DEPENDENCY", [
            '<span class="term">agent-loop</span> → agents · sessions · llm · tools',
            '<span class="term-cu">systemPrompt</span> ← context plugins (AGENTS.md, skills)',
        ], "上层组装下层，通过 inject 而非 import", "Upper layers compose lower via inject, not import"),
        keynums([
            ("219+", "workspace 包", "packages", "官方 monorepo 插件数量级", "order-of-magnitude official monorepo plugins"),
            ("6", "ctx 脊柱", "ctx spine", "session · prompt · tools · agents · loop · llm", "session · prompt · tools · agents · loop · llm"),
            ("0", "privileged core", "privileged core", "vendor/Cordis 也可被 patch 替换", "vendor/Cordis can also be patched"),
        ]),
        doc_ref("capability-seams"),
    )


def chapter_c6() -> str:
    return join(
        p(
            "你在 shell 输入 <code>dsh web</code>（<code>--profile web</code> 别名），启动链从 <code>apps/cli/src/args.ts</code> 解析 launcher flags，<code>src/bin.ts</code> 加载对应 runner，<code>packages/boot/app-boot</code> 的 <code>boot()</code> 创建 Cordis root、compose profile layers、mount include 树，Host 绑定 loopback :3080，浏览器加载 Web surface。",
            "You type <code>dsh web</code> (alias of <code>--profile web</code>); the boot chain parses launcher flags in <code>apps/cli/src/args.ts</code>, <code>src/bin.ts</code> loads the runner, <code>boot()</code> in <code>packages/boot/app-boot</code> creates the Cordis root, composes profile layers, mounts the include tree, Host binds loopback :3080, browser loads the Web surface.",
        ),
        h3("CLI → Profile → :3080", "CLI → Profile → :3080"),
        ladder([
            ("apps/cli", "dsh web · --profile web"),
            ("app-boot", "loadProfile · composeEntries · boot()"),
            ("dsh-base + dsh-web-app", "Cordis plugin tree"),
            ("packages/host", "HTTP Host · static dist"),
            ("packages/web", "React client · session/event SSE"),
        ]),
        src("cli", "apps/cli/README.md", [
            '| <code>dsh web</code> | Alias of <code>--profile web</code> |',
            'The invoking directory is the default workspace root.',
        ]),
        h3("Launcher 与 App 参数分界", "Launcher vs app argument boundary"),
        p(
            "Launcher 只解析自己的 flags；第一个无法识别的 token 起属于 profile 注入的 app 插件（如 <code>--port 8080</code> 给 web app）。这意味着 <code>dsh --profile web --help</code> 显示的是 Web UI 帮助，不是 launcher 帮助。",
            "The launcher parses only its own flags; from the first unrecognized token onward belongs to the profile's injected app plugin (e.g. <code>--port 8080</code> for the web app). So <code>dsh --profile web --help</code> shows Web UI help, not launcher help.",
        ),
        cmp(["阶段", "模块", "失败行为"], [
            ["parse", "apps/cli/src/args.ts", "exit nonzero"],
            ["compose", "app-boot/loadProfile", "profile 缺失 → 模板初始化或 fail loud"],
            ["mount", "app-boot/boot", "partial ctx dispose + labelled stderr"],
            ["serve", "packages/host", "Web surface 未加载则不创建 tray"],
        ]),
        note("冷启动时用户尚未输入主线 prompt，但 Cordis 树已就绪、:3080 已在听。", "On cold boot the user has not typed the through-line prompt yet, but the Cordis tree is ready and :3080 is listening.", copper=True),
    )


def chapter_c7() -> str:
    return join(
        p(
            "<code>ctx.sessions</code>（<code>packages/core/session</code>）维护 append-only <code>SessionEvent</code> log；<code>ctx.agents</code>（<code>packages/core/agent</code>）维护 live <code>Agent</code> registry。主线 prompt 通过 <code>agent.followup(content)</code> 进入 inbox，由 <code>ReactLoopAgent</code>（<code>packages/core/agent-loop/src/agent.ts</code>）驱动。",
            "<code>ctx.sessions</code> (<code>packages/core/session</code>) maintains the append-only <code>SessionEvent</code> log; <code>ctx.agents</code> (<code>packages/core/agent</code>) maintains the live <code>Agent</code> registry. The through-line prompt enters via <code>agent.followup(content)</code> into inbox, driven by <code>ReactLoopAgent</code> (<code>packages/core/agent-loop/src/agent.ts</code>).",
        ),
        h3("Session 与 Agent 的分工", "Session vs Agent split"),
        cmp(["对象", "持久?", "主线时刻"], [
            ["Session", "✓ log + persistence", "user/message · tool/result 落盘"],
            ["Agent", "△ runtime only", "inbox claim · turn/step 状态机"],
            ["Inbox", "✗", "followup 排队 · next-step vs later"],
            ["Driver", "✗", "ReactLoopAgent 认领 prepared session"],
        ]),
        src("agent", "packages/core/agent-loop/src/agent.ts", [
            '<span class="src-kw">export class</span> <span class="src-cls">ReactLoopAgent</span> <span class="src-kw">implements</span> <span class="src-cls">Agent</span> {',
            '  <span class="src-kw">constructor</span>(loopCtx, id, options, <span class="src-arg">session</span>: <span class="src-cls">Session</span>)',
            '  <span class="src-comment">/** Drives one session through turn and step boundaries. */</span>',
        ]),
        h3("一个 prepared session 只能被一个 driver 认领", "One prepared session, one driver"),
        p(
            "架构文档强调：lifecycle owner 通过 <code>ctx.agents</code> 创建 agent，而不是直接 new <code>ReactLoopAgent</code>。包导出刻意不提供 <code>./src/*</code> 逃逸 hatch——可观测行为全部经由 session events + <code>agent/*</code> 分类体系。",
            "Architecture docs stress: lifecycle owners create agents through <code>ctx.agents</code>, not by directly constructing <code>ReactLoopAgent</code>. Package exports deliberately expose no <code>./src/*</code> escape hatch — all observable behavior goes through session events + the <code>agent/*</code> taxonomy.",
        ),
        event_table([
            ("agent/inbox/inserted", "followup 入队", "followup queued"),
            ("agent/inbox/claimed", "claim 批次绑定 turn", "claimed batch bound to turn"),
            ("agent/status", "running ↔ idle", "running ↔ idle"),
            ("session/created", "新会话 · persistence 订阅", "new session · persistence subscribes"),
        ]),
        doc_ref("agent-lifecycle"),
    )


def chapter_c8() -> str:
    return join(
        p(
            "模型看到的 system 内容不是裸仓库规则——<code>ctx.systemPrompt</code>（<code>packages/core/system-prompt</code>）在每次 step 前通过 <code>system-prompt/assemble</code> waterfall 把 prompt section 与 tool schema 拼成最终前缀。AGENTS.md 栈、skill 目录、plan mode 提示都以 section 形式注入。",
            "The system content the model sees is not bare repo rules — <code>ctx.systemPrompt</code> (<code>packages/core/system-prompt</code>) assembles prompt sections and tool schemas via the <code>system-prompt/assemble</code> waterfall before each step. AGENTS.md stacks, skill catalogs, and plan-mode hints inject as sections.",
        ),
        h3("Prompt section 叠加", "Prompt section stacking"),
        ladder([
            ("harness:identity", "DSH 身份 · 不可用户覆盖"),
            ("harness:source", "可选 · checkout 路径（dev boot）"),
            ("persona / AGENTS.md", "packages/context/agent-instructions"),
            ("skills catalog", "packages/skill/tool-skill @ pre-step"),
            ("tool schemas", "ctx.tools 注册 · 动态生成"),
        ]),
        src("sp", "packages/core/system-prompt/README.md", [
            '<span class="src-comment">// system-prompt/assemble waterfall</span>',
            'Sections register via <span class="src-fn">ctx.effect()</span> and unwind on plugin unload.',
        ]),
        h3("主线 prompt 时的模型输入长什么样", "What model input looks like at through-line prompt"),
        p(
            "简化：<code>[assembled system sections + tool schemas] + deriveMessages() 投影的历史 + 本轮 user/message</code>。<code>agent/request</code> waterfall 允许最后一英里修改 messages / model / tools，然后才进入 <code>llm/stream</code>。",
            "Simplified: <code>[assembled system sections + tool schemas] + deriveMessages() projected history + this step's user/message</code>. The <code>agent/request</code> waterfall allows last-mile edits to messages / model / tools before <code>llm/stream</code>.",
        ),
        sp([
            ("section", "section", "有序注册 · effect 卸载", "ordered registration · effect unwinds on unload"),
            ("KV cache", "KV cache", "identity/source 靠近头部 · 少抖动", "identity/source near head · less churn"),
            ("web Models 页", "web Models page", "写 settings.yaml · 热重载 adapter", "writes settings.yaml · hot-reloads adapter"),
        ]),
        doc_ref("architecture"),
    )


def chapter_c9() -> str:
    return join(
        p(
            "DSH 的心脏是 append-only <strong>SessionEvent log</strong>（<code>packages/core/session</code>）。任何进入模型请求的内容必须能从事务 log 重建——官方 invariant：<strong>Model-visible means logged</strong>，运行时 assert。",
            "DSH's heart is the append-only <strong>SessionEvent log</strong> (<code>packages/core/session</code>). Anything that enters a model request must be reconstructable from the log — official invariant: <strong>Model-visible means logged</strong>, runtime assert.",
        ),
        h3("Log 是唯一真相源", "Log is the single source of truth"),
        p(
            "<code>session/title</code>、telemetry 噪声等事件可以写入 log 但<strong>不进入</strong> <code>deriveMessages()</code> 投影——surface 是 sole derivation path。fork/resume 重放同一 log 序列，投影 deterministic（见 <code>packages/core/session/tests/properties.spec.ts</code>）。",
            "Events like <code>session/title</code> and telemetry noise may append to the log but do <strong>not</strong> enter the <code>deriveMessages()</code> projection — the surface is the sole derivation path. Fork/resume replay the same log sequence; projection is deterministic (see <code>packages/core/session/tests/properties.spec.ts</code>).",
        ),
        viz_session_log(),
        src("inv", "docs/architecture.md", [
            '<span class="src-str">Model-visible means logged.</span>',
            'Extend <span class="src-cls">SessionEventMap</span> and render from the log.',
        ]),
        h3("session/event 广播", "session/event broadcast"),
        p(
            "每次 append 触发 <code>session/event</code> emit——Web client、ACP、telemetry、compaction 都订阅此总线。UI 渲染<strong>只</strong>应消费 session 域事件做 replay；<code>agent/*</code> 是 live 协调 API。",
            "Each append emits <code>session/event</code> — Web client, ACP, telemetry, compaction all subscribe. UI rendering should <strong>only</strong> consume session-domain events for replay; <code>agent/*</code> is the live coordination API.",
        ),
        cmp(["事件类型", "进入 deriveMessages?", "例子"], [
            ["user/message", "✓", "主线 prompt"],
            ["assistant/chunk", "△", "流式 · 合成 assistant/message"],
            ["tool/result", "✓", "read README 内容"],
            ["session/title", "✗", "侧边栏标题"],
        ]),
        pull("JSONL 思维：Pi 把 transcript 当树。<br>DSH 把 log 当<strong>事件溯源带</strong>。", "JSONL mindset: Pi treats transcript as a tree.<br>DSH treats the log as an <strong>event-sourcing tape</strong>."),
        doc_ref("architecture"),
    )


def chapter_c10() -> str:
    return join(
        p(
            "<code>ReactLoopAgent</code> 实现 turn/step 双环：<strong>turn</strong> 管理 inbox claim 与 <code>turn/end</code>；<strong>step</strong> 承载一次 <code>llm/stream</code> + 关联 tool batch。主线 prompt 通常在一个 turn 内跑两个 step。",
            "<code>ReactLoopAgent</code> implements turn/step twin loops: the <strong>turn</strong> manages inbox claim and <code>turn/end</code>; each <strong>step</strong> holds one <code>llm/stream</code> plus its tool batch. The through-line prompt usually runs two steps within one turn.",
        ),
        h3("外环 Turn · 内环 Step", "Outer turn · inner step"),
        viz_turn_step(),
        src("loop", "packages/core/agent-loop/src/agent.ts", [
            '<span class="src-comment">// phase: idle | running turn N step M</span>',
            '<span class="src-kw">private</span> phase: Phase',
            '<span class="src-kw">private readonly</span> dispatch: AgentEventDispatch',
        ]),
        h3("何时开下一个 step", "When the next step opens"),
        p(
            "当前 step 在 <code>step/end</code> 后，若 tool batch 仍欠模型一轮、或 next-step inbox 有新输入，驱动器 claim 下一批并再次走 <code>agent/pre-step</code>。若 <code>agent/pre-step</code> reject，claimed batch 仍被移除但 turn 不消耗 step——这是 steering 与 compaction 的挂钩点。",
            "After <code>step/end</code>, if the tool batch still owes the model another round or next-step inbox has new input, the driver claims the next batch and runs <code>agent/pre-step</code> again. If <code>agent/pre-step</code> rejects, the claimed batch is still removed but the turn spends no step — the hook point for steering and compaction.",
        ),
        event_table([
            ("turn/start", "打开 turn · 分配 turn id", "open turn · assign turn id"),
            ("step/start", "打开 step · 准备 deriveMessages", "open step · prepare deriveMessages"),
            ("step/end", "一步完成 · 检查 continuation", "step complete · check continuation"),
            ("turn/end", "turn 关闭 · 无欠账", "turn closes · nothing owed"),
        ]),
        doc_ref("agent-lifecycle"),
        pull("外环是 inbox 耐心。<br>内环是 model+tool 纪律。", "Outer loop is inbox patience.<br>Inner loop is model+tool discipline."),
    )


def chapter_c11() -> str:
    return join(
        p(
            "每个 step 开始前，<code>agent/pre-step</code> waterfall（<code>packages/core/agent-loop</code> dispatch，listeners 遍布 compaction、skill、plan-mode、subagent 等）接收 <code>{ agent, turn, ... }</code> 与 <code>next</code>。返回值 <strong>reject</strong> 或 <strong>enter(messages)</strong> 权威。",
            "Before each step, the <code>agent/pre-step</code> waterfall (<code>packages/core/agent-loop</code> dispatch; listeners across compaction, skill, plan-mode, subagent, etc.) receives <code>{ agent, turn, ... }</code> and <code>next</code>. The return <strong>reject</strong> or <strong>enter(messages)</strong> is authoritative.",
        ),
        h3("Waterfall 监听者矩阵（节选）", "Waterfall listener matrix (excerpt)"),
        cmp(["Listener 包", "pre-step 行为", "主线相关"], [
            ["compaction-basic", "token 压力 · 摘要", "长会话"],
            ["tool-skill", "skill 目录 system-reminder", "可选"],
            ["plan-mode", "plan 工具门控", "—"],
            ["session-checkpoint-policy", "checkpoint 边界", "持久性"],
            ["subagent-in-process-driver", "子 agent 上下文", "C25"],
        ]),
        h3("Case study：reject vs enter", "Case study: reject vs enter"),
        p(
            "Compaction 在 pre-step 检测到 overflow 时可能 reject 当前 enter 提案，先跑摘要再开新 turn。Skill 插件在 enter 上追加 user-role <code>&lt;system-reminder&gt;</code> 目录——这些消息若进入模型，必须先有对应 <code>user/message</code> SessionEvent（invariant）。",
            "Compaction may reject the current enter proposal at pre-step when detecting overflow, summarize first, then open a fresh turn. The skill plugin appends user-role <code>&lt;system-reminder&gt;</code> catalog to enter — if these reach the model, matching <code>user/message</code> SessionEvents must exist first (invariant).",
        ),
        src("pre", "packages/core/agent/src/runtime-types.ts", [
            '<span class="src-str">agent/pre-step</span> · mode: <span class="src-str">waterfall</span>',
            'Listeners: compaction-basic, tool-skill, plan-mode, ...',
        ]),
        doc_ref("event-producer-consumer"),
    )


def chapter_c12() -> str:
    return join(
        p(
            "模型在 <code>assistant/message</code> 里返回 tool-call block 后，驱动器写 <code>tool/call</code> SessionEvent，然后走 <code>tools/pre-execute</code> → monotonic guards → <code>tools/execute</code> → <code>tools/post-execute</code> → <code>tool/result</code>。详见 <code>docs/tool-execution-pipeline.md</code>。",
            "After the model returns a tool-call block in <code>assistant/message</code>, the driver logs <code>tool/call</code> SessionEvent, then runs <code>tools/pre-execute</code> → monotonic guards → <code>tools/execute</code> → <code>tools/post-execute</code> → <code>tool/result</code>. See <code>docs/tool-execution-pipeline.md</code>.",
        ),
        h3("三段 waterfall", "Three waterfalls"),
        ladder([
            ("tools/pre-execute", "hooks · permission · sandbox · deny/ask"),
            ("tools/execute", "timeout · retry · 实际 execute()"),
            ("tools/post-execute", "accept · block · replace · add context"),
        ]),
        src("pipe", "packages/core/tools/README.md", [
            '<span class="src-fn">ctx.tools</span> scoped registry',
            'Tool schemas are <span class="src-kw">generated at boot</span> from mounted plugins.',
        ]),
        h3("read README 的完整路径", "Full path of read README"),
        cmp(["阶段", "模块", "主线"], [
            ["tool/call", "agent-loop → session", "read(path=README.md)"],
            ["pre-execute", "user-approval · sandbox", "可能 ask"],
            ["execute", "packages/fs/tool-fs", "fs read · observation policy"],
            ["tool/result", "session append", "进入 deriveMessages"],
        ]),
        p(
            "Tool catalog 在 boot 时由<strong>已挂载插件动态生成</strong>——「tool schema 不是静态可知的」。这也是 DSH 与 sealed product 的差异：换 profile patch 可能换整个工具面。",
            "The tool catalog is <strong>generated dynamically at boot</strong> from mounted plugins — «a tool schema is not statically knowable». This differs from sealed products: swapping a profile patch can swap the entire tool surface.",
        ),
        doc_ref("tool-execution-pipeline"),
    )


def chapter_c13() -> str:
    return join(
        p(
            "DSH 事件分三域（<code>docs/architecture.md#events</code>）：<strong>session</strong>（ durable replay）、<strong>agent</strong>（live 协调）、<strong>capability</strong>（策略 seam，如 <code>tools/*</code>、<code>fs/*</code>）。选错域是最常见的插件 bug。",
            "DSH events split into three domains (<code>docs/architecture.md#events</code>): <strong>session</strong> (durable replay), <strong>agent</strong> (live coordination), <strong>capability</strong> (policy seams like <code>tools/*</code>, <code>fs/*</code>). Picking the wrong domain is the most common plugin bug.",
        ),
        h3("三域对照", "Three-domain comparison"),
        viz_event_domains(),
        cmp(["域", "持久?", "典型事件", "消费者"], [
            ["session/*", "✓", "user/message · tool/result", "Web UI · persistence"],
            ["agent/*", "✗", "pre-step · inbox/claimed", "SDK · subagent driver"],
            ["capability/*", "△", "fs/write-intent · tools/result", "policy · telemetry"],
        ]),
        h3("主线一轮的域 crossing", "Domain crossing for one through-line turn"),
        p(
            "用户输入：SDK → <code>agent/inbox/inserted</code>（agent）→ claim → <code>user/message</code>（session）→ UI 经 <code>session/event</code> 渲染。工具：model → <code>tool/call</code>（session）→ <code>tools/pre-execute</code>（capability）→ <code>tool/result</code>（session）。",
            "User input: SDK → <code>agent/inbox/inserted</code> (agent) → claim → <code>user/message</code> (session) → UI renders via <code>session/event</code>. Tools: model → <code>tool/call</code> (session) → <code>tools/pre-execute</code> (capability) → <code>tool/result</code> (session).",
        ),
        doc_ref("event-producer-consumer"),
    )


def chapter_c14() -> str:
    return join(
        p(
            "<code>ctx.llm</code>（<code>packages/llm/llm</code>）是模型适配器 seam：DeepSeek 官方 adapter、pi-ai bridge、replay adapter 都注册为 provider。<code>llm/stream</code> waterfall 包裹实际 HTTP/SSE；agent-loop 只依赖统一 StreamChunk 词汇。",
            "<code>ctx.llm</code> (<code>packages/llm/llm</code>) is the model adapter seam: DeepSeek official adapter, pi-ai bridge, replay adapter register as providers. The <code>llm/stream</code> waterfall wraps actual HTTP/SSE; agent-loop depends only on unified StreamChunk vocabulary.",
        ),
        h3("Adapter 注册与 settings 热重载", "Adapter registration and settings hot-reload"),
        p(
            "<code>dsh-base</code> insert <code>dsh-settings-file</code>：用户 <code>$DSH_HOME/settings.yaml</code> 的 <code>llm-deepseek:</code> section 可在运行时 override adapter entry，Web Models 页写入同一文件。",
            "<code>dsh-base</code> inserts <code>dsh-settings-file</code>: the user's <code>llm-deepseek:</code> section in <code>$DSH_HOME/settings.yaml</code> can override adapter entries at runtime; the Web Models page writes the same file.",
        ),
        src("llm", "packages/llm/llm/src/index.ts", [
            '<span class="src-str">llm/stream</span> · mode: <span class="src-str">waterfall</span>',
            'Listeners: agent-loop, llm-replay, session-checkpoint-policy',
        ]),
        cmp(["Provider 包", "用途", "测试"], [
            ["llm-deepseek", "生产 DeepSeek API", "—"],
            ["llm-pi-ai", "pi-ai 桥接", "—"],
            ["llm-replay", "离线 replay", "packages/test-support"],
        ]),
        sp([
            ("agent/request", "agent/request", "最后一英里改 messages/model", "last-mile edit messages/model"),
            ("llm-retry", "llm-retry", "agent/request-error 恢复", "agent/request-error recovery"),
            ("token-meter", "token-meter", "usage 计量 · compaction 输入", "usage metering · compaction input"),
        ]),
        doc_ref("architecture"),
    )


def chapter_c15() -> str:
    return join(
        p(
            "Provider 流式返回的每个 delta 被驱动器写成 <code>assistant/chunk</code> SessionEvent；UI 经 <code>session/event</code> 增量渲染聊天气泡。流结束后写 <code>assistant/message</code> 定稿（含 usage、<code>sourceEventSeqs</code> 指向 chunk 序列）。",
            "Each delta from the provider stream is logged by the driver as <code>assistant/chunk</code> SessionEvent; the UI incrementally renders chat bubbles via <code>session/event</code>. After the stream ends, <code>assistant/message</code> finalizes (with usage, <code>sourceEventSeqs</code> pointing to the chunk sequence).",
        ),
        h3("Chunk vs Message", "Chunk vs Message"),
        cmp(["artifact", "持久?", "deriveMessages", "UI"], [
            ["assistant/chunk", "✓", "合成 message", "流式 token"],
            ["assistant/message", "✓", "✓", "定稿气泡"],
            ["empty content", "✓ log", "✗ surface", "max-tokens 等"],
        ]),
        h3("主线第二次 stream", "Second stream on through-line"),
        p(
            "read 工具返回后，下一 step 的 <code>llm/stream</code> 将 README 内容纳入 deriveMessages 历史，模型生成一句话项目描述——第二个 <code>assistant/chunk*</code> 序列，最终 <code>assistant/message</code> stop。",
            "After the read tool returns, the next step's <code>llm/stream</code> includes README content in deriveMessages history; the model generates a one-sentence project description — a second <code>assistant/chunk*</code> sequence, ending with <code>assistant/message</code> stop.",
        ),
        src("chunk", "docs/agent-lifecycle.md", [
            '<code>assistant/message</code> records every successful provider call,',
            'including content-less and <span class="src-str">max-tokens</span> finishes.',
        ]),
    )


def chapter_c16() -> str:
    return join(
        p(
            "<code>session.deriveMessages()</code>（<code>packages/core/session/src/index.ts</code>）把 SessionEvent log <strong>投影</strong>成 LLM <code>Message[]</code>——这是 agent-loop 在 <code>agent/request</code> 前调用的唯一历史面。Compaction 替换的是 surface generation，不是 log 本身。",
            "<code>session.deriveMessages()</code> (<code>packages/core/session/src/index.ts</code>) <strong>projects</strong> the SessionEvent log into LLM <code>Message[]</code> — the sole history surface agent-loop calls before <code>agent/request</code>. Compaction replaces surface generation, not the log itself.",
        ),
        h3("投影规则（直觉）", "Projection rules (intuition)"),
        p(
            "user/message → user role；assistant/message + tool/result 配对 → assistant/tool_result blocks；log-only 事件（title、telemetry）跳过。Fork 会话投影与 fork 点之前父会话一致（<code>session.spec.ts</code> 覆盖）。",
            "user/message → user role; assistant/message paired with tool/result → assistant/tool_result blocks; log-only events (title, telemetry) skipped. Forked sessions project identically to parent before fork point (<code>session.spec.ts</code> coverage).",
        ),
        src("derive", "packages/core/session/src/index.ts", [
            '<span class="src-fn">deriveMessages</span>(): <span class="src-cls">Message</span>[] {',
            '  <span class="src-comment">// sole derivation path from append-only log</span>',
        ]),
        formula("投影", "PROJECTION", [
            '<span class="term">SessionEvent[]</span> — canonical log',
            '<span class="term-cu">deriveMessages()</span> → Message[]',
            '<span class="term">llm/stream</span> → provider wire format',
        ], "主线 prompt 在 log 与 projection 各出现一次", "Through-line prompt appears once in log and once in projection"),
        doc_ref("architecture"),
    )


def chapter_c17() -> str:
    return join(
        p(
            "Web client（<code>packages/web</code> + <code>packages/client</code>）订阅 <code>session/event</code> replay 流，把 <code>user/message</code>、<code>assistant/chunk</code>、<code>tool/call</code>、<code>tool/result</code> 渲染为聊天气泡与 tool 卡片。Host（<code>packages/host</code>）提供同源静态资源与 API 代理。",
            "The Web client (<code>packages/web</code> + <code>packages/client</code>) subscribes to the <code>session/event</code> replay stream, rendering <code>user/message</code>, <code>assistant/chunk</code>, <code>tool/call</code>, <code>tool/result</code> as chat bubbles and tool cards. Host (<code>packages/host</code>) serves same-origin static assets and API proxy.",
        ),
        h3("session/event 驱动渲染", "session/event-driven rendering"),
        cmp(["SessionEvent", "UI 组件", "流式?"], [
            ["user/message", "User bubble", "✗"],
            ["assistant/chunk", "Assistant bubble delta", "✓"],
            ["tool/call", "Pending tool card", "✗"],
            ["tool/result", "Completed tool card", "✗"],
        ]),
        h3("为何 UI 不直接听 agent/*", "Why UI does not listen to agent/* directly"),
        p(
            "SDK 文档明确：需要可回放 transcript 的消费方应使用 <code>session/event</code>；<code>agent/*</code> 用于 queue/status、prompt 拦截、steering。Web UI 刷新后必须从 log replay 重建，而非重建 agent 内存态。",
            "SDK docs are explicit: consumers needing replayable transcript should use <code>session/event</code>; <code>agent/*</code> is for queue/status, prompt interception, steering. After a Web UI refresh, rebuild from log replay, not from agent memory state.",
        ),
        src("web", "packages/web/README.md", [
            'Default profile <span class="src-str">web</span> · loopback <span class="src-str">:3080</span>',
            'Session list + event stream rendering',
        ]),
    )


def chapter_c18() -> str:
    return join(
        p(
            "Web surface 的 chat 节点与 settings 卡片是独立前端包（<code>packages/web</code>）里的 React 组件：输入框提交 → API → <code>agent.followup</code>；设置页写入 <code>settings.yaml</code> 与 credential store，触发 <code>settings/updated</code> 与 adapter 热重载。",
            "Chat nodes and settings cards on the Web surface are React components in <code>packages/web</code>: input submit → API → <code>agent.followup</code>; settings pages write <code>settings.yaml</code> and credential store, firing <code>settings/updated</code> and adapter hot-reload.",
        ),
        h3("Chat 提交路径", "Chat submit path"),
        ladder([
            ("Browser input", "主线 prompt 文本"),
            ("Host API", "packages/host · same-origin"),
            ("agent.followup", "inbox inserted"),
            ("session/event", "UI optimistic + replay"),
        ]),
        h3("Settings 卡片触达的 backend", "Backend touched by settings cards"),
        cmp(["Settings UI", "写入", "Cordis 响应"], [
            ["Models", "settings.yaml llm-*", "llm/adapters-updated"],
            ["Credentials", ".credentials.yaml", "credentials/record-updated"],
            ["Permissions", "approval preset", "user-approval"],
            ["Profile plugins", "dsh plugin add", "HMR recomposes tree"],
        ]),
        sp([
            (":3080", ":3080", "默认 loopback · 可 --port", "default loopback · --port overridable"),
            ("headless", "headless", "无 UI · stdout 最终回答", "no UI · stdout final answer"),
            ("ACP", "ACP", "packages/acp · IDE 集成", "packages/acp · IDE integration"),
        ]),
    )


def chapter_c19() -> str:
    return join(
        p(
            "官方 monorepo 有 200+ workspace 包（<code>packages/README.md</code>），社区可通过 <code>dsh plugin --profile &lt;name&gt; add &lt;pkg&gt;</code> 把 npm/git 包加入 profile。包 manifest 声明 <code>dsh.bundle.patch</code> 时自动进入 bundle 层栈。",
            "The official monorepo has 200+ workspace packages (<code>packages/README.md</code>); the community adds npm/git packages via <code>dsh plugin --profile &lt;name&gt; add &lt;pkg&gt;</code>. When a package manifest declares <code>dsh.bundle.patch</code>, it joins the bundle layer stack automatically.",
        ),
        h3("插件形态", "Plugin shapes"),
        cmp(["形态", "例子", "扩展点"], [
            ["core plugin", "dsh-session", "claim ctx.sessions"],
            ["tool plugin", "tool-bash · tool-fs", "ctx.tools.register"],
            ["capability", "dsh-sandbox-local", "ctx.sandbox seam"],
            ["bundle", "dsh-web-app", "cordis.patch.yml insert"],
            ["MCP", "packages/mcp/*", "外部工具协议"],
        ]),
        viz_plugin_spectrum(),
        h3("发布自己的插件", "Publishing your own plugin"),
        p(
            "<code>docs/user/develop/basic/publish.md</code>：manifest 加 <code>dsh.bundle</code> 或作为 plain dependency；用户可在 profile <code>cordis.patch.yml</code> 按 id 覆盖你的行而无需改包。",
            "<code>docs/user/develop/basic/publish.md</code>: add <code>dsh.bundle</code> to manifest or ship as plain dependency; users can override your rows by id in profile <code>cordis.patch.yml</code> without touching your package.",
        ),
        src("pub", "docs/user/develop/basic/publish.md", [
            'Users can override your rows in profile <code>cordis.patch.yml</code>',
            'without touching your package.',
        ]),
    )


def chapter_c20() -> str:
    return join(
        p(
            "Capability seams 把「能做什么」从 loop 里拆出来：<code>ctx.fs</code>（<code>packages/fs/fs</code>）、<code>ctx.shell</code>（bash/pwsh 栈）、<code>ctx.sandbox</code>（策略 + 平台 runner）。换 seam 实现 = 换 patch 行，无需 fork agent-loop。",
            "Capability seams separate «what can be done» from the loop: <code>ctx.fs</code> (<code>packages/fs/fs</code>), <code>ctx.shell</code> (bash/pwsh stacks), <code>ctx.sandbox</code> (policy + platform runners). Swap seam implementation = swap patch row, no agent-loop fork needed.",
        ),
        h3("fs · shell · sandbox 三角", "fs · shell · sandbox triangle"),
        cmp(["Seam", "默认实现", "policy 事件"], [
            ["ctx.fs", "fs-sandbox + tool-fs", "fs/write-intent · fs/observed"],
            ["ctx.shell", "tool-bash / tool-pwsh", "sandbox approval"],
            ["ctx.sandbox", "dsh-sandbox-local / windows-acl", "danger-full-access 等 preset"],
        ]),
        h3("read README 经过哪些 seam", "Which seams read README passes through"),
        p(
            "主线 read 走 <code>tool-fs</code> → <code>fs/read</code> capability → <code>fs-observation-policy</code> 可能要求先 observe 再 write。bash 工具走 shell + sandbox approval，与 read 并行安全策略不同。",
            "Through-line read goes <code>tool-fs</code> → <code>fs/read</code> capability → <code>fs-observation-policy</code> may require observe-before-write. Bash tools go through shell + sandbox approval — parallel safety policy differs from read.",
        ),
        src("seams", "docs/capability-seams.md", [
            'A service can be a core spine service, a swappable capability seam,',
            'or a bundle/composition point.',
        ]),
        doc_ref("capability-seams"),
    )


def chapter_c21() -> str:
    return join(
        p(
            "Customization 发生在 patch 层，不是 fork monorepo：<code>profiles/&lt;name&gt;/cordis.patch.yml</code> 按 id 覆盖 bundle 行；<code>$DSH_HOME/cordis.patch.yml</code> 机器级；<code>--patch</code> 一次性。HMR（<code>cordis-plugin-hmr</code>）可在 dev 时热重载 patch。",
            "Customization happens at the patch layer, not by forking the monorepo: <code>profiles/&lt;name&gt;/cordis.patch.yml</code> overrides bundle rows by id; <code>$DSH_HOME/cordis.patch.yml</code> is machine-wide; <code>--patch</code> is one-shot. HMR (<code>cordis-plugin-hmr</code>) can hot-reload patches in dev.",
        ),
        h3("Patch 纪律", "Patch discipline"),
        p(
            "覆盖一行必须<strong>重述整行 config</strong>——不是 deep-merge。例如 Windows 恢复 bash 栈：必须同时 disable pwsh 行并 re-enable bash 行，否则 duplicate service 注册 fail loud。",
            "Overriding a row must <strong>restate the entire row config</strong> — no deep-merge. E.g. restoring bash stack on Windows: disable pwsh rows AND re-enable bash rows, otherwise duplicate service registration fails loud.",
        ),
        cmp(["层", "路径", "典型用途"], [
            ["bundle", "packages/bundle/*/cordis.patch.yml", "官方能力组合"],
            ["profile", "$DSH_HOME/profiles/web/cordis.patch.yml", "用户 profile 定制"],
            ["home", "$DSH_HOME/cordis.patch.yml", "机器级 override"],
            ["CLI", "--patch file.yml", "CI 一次性"],
        ]),
        src("watch", "packages/boot/app-boot/README.md", [
            '<span class="src-fn">watchUserPatches</span>(ctx, options)',
            'Rejected patch leaves last good tree running.',
        ]),
        doc_ref("architecture"),
    )


def chapter_c22() -> str:
    return join(
        p(
            "Session fork/resume（<code>packages/session/session-persistence*</code>、subagent fork tools）从某一 log 点创建分支会话，子会话 append 独立事件链。Resume 重放 persistence 存储的 log，<code>deriveMessages()</code> 确定性重建模型历史。",
            "Session fork/resume (<code>packages/session/session-persistence*</code>, subagent fork tools) creates branch sessions from a log point; child sessions append independent event chains. Resume replays persisted log; <code>deriveMessages()</code> deterministically rebuilds model history.",
        ),
        h3("Fork 语义", "Fork semantics"),
        p(
            "Fork 复制 log 前缀而非 agent 内存；子 agent（<code>packages/subagent/subagent</code>）可用 in-process driver 或独立 profile。父会话可 park 等待子 agent report——全程仍通过 session/agent 事件可观测。",
            "Fork copies log prefix, not agent memory; child agents (<code>packages/subagent/subagent</code>) may use in-process driver or separate profile. Parent can park awaiting child report — still observable via session/agent events throughout.",
        ),
        cmp(["操作", "API/工具", "log 效果"], [
            ["fork session", "subagent_fork tool", "新 session id · 共享前缀"],
            ["resume", "headless --resume", "重放 JSONL/SQLite"],
            ["checkpoint", "session-checkpoint-policy", "副作用前强制 persist"],
        ]),
        src("persist", "packages/session/session-persistence-jsonl/README.md", [
            'Append-only event log on disk',
            '<span class="src-fn">deriveMessages()</span> identical after replay',
        ]),
    )


def chapter_c23() -> str:
    return join(
        p(
            "<code>dsh-compaction-basic</code>（<code>packages/compaction/compaction-basic</code>）在 <code>agent/pre-step</code> 检测 token 压力，在 <code>agent/request-error</code> 处理 canonical overflow。策略：<strong>log 完整保留</strong>，替换 surface generation（摘要 + tool-result pruning）。",
            "<code>dsh-compaction-basic</code> (<code>packages/compaction/compaction-basic</code>) detects token pressure at <code>agent/pre-step</code>, handles canonical overflow at <code>agent/request-error</code>. Policy: <strong>log stays complete</strong>, replace surface generation (summary + tool-result pruning).",
        ),
        h3("Compaction 触发链", "Compaction trigger chain"),
        ladder([
            ("token-meter", "计量 deriveMessages token"),
            ("agent/pre-step", "pressure · 可选 pruning"),
            ("LLM overflow", "agent/request-error"),
            ("summary LLM call", "新 surface generation"),
            ("fresh retry turn", "仅当 surface 前进"),
        ]),
        p(
            "Recovery 发生在 failed step 与 failed turn 之间：若 pruning/summary 未 advance surface generation，原始 request error 仍权威——避免 silent loss。",
            "Recovery happens between failed step and failed turn: if pruning/summary does not advance surface generation, the original request error remains authoritative — avoiding silent loss.",
        ),
        src("compact", "packages/compaction/compaction-basic/README.md", [
            'Uses <span class="src-str">agent/pre-step</span> for pressure before derivation',
            'and <span class="src-str">agent/request-error</span> for overflow recovery.',
        ]),
        doc_ref("agent-lifecycle"),
    )


def chapter_c24() -> str:
    return join(
        p(
            "四条路线对比：Claude Code（密封 CLI + MCP）、Cursor（密封 IDE）、Pi（minimal harness + JSONL）、DSH（Cordis 全插件 + SessionEvent + MCP/subagent/compaction）。主线 prompt 在 DSH 可经 <code>--dump-config</code> + session log 完整 trace。",
            "Four routes compared: Claude Code (sealed CLI + MCP), Cursor (sealed IDE), Pi (minimal harness + JSONL), DSH (full Cordis plugins + SessionEvent + MCP/subagent/compaction). The through-line prompt is fully traceable in DSH via <code>--dump-config</code> + session log.",
        ),
        h3("设计取舍表", "Design trade-off table"),
        cmp(["维度", "Claude Code", "Cursor", "Pi", "DSH"], [
            ["目标用户", "开箱 CLI", "IDE 用户", "读源码", "改 harness"],
            ["内核", "密封", "密封", "agent-loop.ts", "Cordis 插件树"],
            ["会话", "专有", "专有", "JSONL 树", "SessionEvent log"],
            ["MCP", "✓", "△", "✗", "✓ packages/mcp"],
            ["子 agent", "✓", "✓", "✗", "✓ packages/subagent"],
            ["compaction", "黑盒", "黑盒", "✓", "✓ plugin"],
            ["trace 主线", "✗", "✗", "✓ verbose", "✓ dump-config + log"],
        ]),
        viz_harness_compare(),
        h3("怎么选", "How to choose"),
        p(
            "不是「哪个更好」——是「你要闭包体验还是开卷考试」。DSH 牺牲「零配置直觉」，换取任意层 patch、官方 200+ 插件组合、以及与 DeepSeek 模型栈的一等集成。",
            "Not «which is better» — «do you want closed-loop UX or open-book exam». DSH sacrifices «zero-config intuition» for patch-any-layer, 200+ official plugin combinations, and first-class DeepSeek model stack integration.",
        ),
        note("Pi 与 DSH 都开源可读；Pi 极简，DSH 全栈可组合。", "Pi and DSH are both open and readable; Pi is minimal, DSH is fully composable.", copper=True),
    )


def chapter_c25() -> str:
    return join(
        p(
            "<code>packages/subagent/subagent</code> 提供 spawn/fork/send_message/interrupt/report 工具；<code>tool-agent-team</code> 扩展 Agent Teams。MCP（<code>packages/mcp/*</code>）把外部工具协议接入 <code>ctx.tools</code>。子 agent 不是黑盒线程——而是独立 session + driver，事件仍走 session/agent 域。",
            "<code>packages/subagent/subagent</code> provides spawn/fork/send_message/interrupt/report tools; <code>tool-agent-team</code> extends Agent Teams. MCP (<code>packages/mcp/*</code>) attaches external tool protocols to <code>ctx.tools</code>. Sub-agents are not black-box threads — separate session + driver, events still use session/agent domains.",
        ),
        h3("Subagent 控制面", "Subagent control plane"),
        cmp(["工具", "作用", "观测"], [
            ["subagent", "spawn 子 agent", "agent/created · subagent/end"],
            ["subagent_fork", "fork session 分支", "新 session/created"],
            ["send_message", "向子 agent 发消息", "agent/inbox/inserted"],
            ["report", "子 agent 回报父 agent", "tool/result"],
        ]),
        h3("Agent Teams", "Agent Teams"),
        p(
            "Teams 在 <code>agent/created</code> 时注册成员关系，协调多 agent inbox 与 DM。主线 prompt 通常走单 agent；Teams 用于并行 research、 Ralph 循环（<code>packages/workflow</code>）等高级场景。",
            "Teams register membership at <code>agent/created</code>, coordinating multi-agent inbox and DMs. The through-line prompt usually runs single-agent; Teams serve parallel research, Ralph loops (<code>packages/workflow</code>), etc.",
        ),
        src("sub", "packages/subagent/subagent/README.md", [
            'Child sessions are first-class <span class="src-cls">Session</span> objects',
            'with their own <span class="src-cls">ReactLoopAgent</span> driver.',
        ]),
        sp([
            ("in-process", "in-process driver", "同 Cordis 树 · 低开销", "same Cordis tree · low overhead"),
            ("Codex/CC bundle", "product provider bundles", "可选 hook bridge", "optional hook bridge bundles"),
            ("Python SDK", "Python SDK", "JSON-RPC 驱 Node runtime", "JSON-RPC drives Node runtime"),
        ]),
    )


def chapter_c26() -> str:
    return join(
        p(
            "自己 trace 主线 prompt 的三件套：<code>dsh --profile web --dump-config</code> 看 boot 树、浏览器/WebSocket 看 <code>session/event</code> 流、打开 persistence 存储的 session log 文件对照 <code>deriveMessages()</code>。",
            "Trace the through-line yourself with three tools: <code>dsh --profile web --dump-config</code> for the boot tree, browser/WebSocket for the <code>session/event</code> stream, and the persisted session log file compared against <code>deriveMessages()</code>.",
        ),
        h3("推荐 trace 顺序", "Recommended trace order"),
        ladder([
            ("dsh --profile web --dump-config", "确认插件树含 agent-loop · tool-fs"),
            ("发送主线 prompt", "观察 turn/start → user/message → tool/call"),
            ("session log 文件", "packages/session/session-persistence-jsonl"),
            ("deriveMessages 对照", "packages/core/session/tests/session.spec.ts"),
        ]),
        h3("推荐阅读顺序", "Suggested reading order"),
        p(
            "1. <code>docs/architecture.md</code> turn flow → 2. <code>packages/core/agent-loop/src/agent.ts</code> ReactLoopAgent → 3. 本文 C02 22 站 → 4. <code>docs/agent-lifecycle.md</code> 序列图。",
            "1. <code>docs/architecture.md</code> turn flow → 2. <code>packages/core/agent-loop/src/agent.ts</code> ReactLoopAgent → 3. this article C02 22 stations → 4. <code>docs/agent-lifecycle.md</code> sequence diagram.",
        ),
        src("trace", "apps/cli/README.md", [
            '$ dsh --profile web --dump-config',
            '$ dsh web  <span class="src-comment"># :3080 · 发送主线 prompt</span>',
        ]),
        pull(
            "读完之后，用一句话回答：<br>「读取 README.md，用一句话告诉我这个项目做什么」——<br>在 DSH 里，这句话究竟触发了什么？",
            "After reading, answer in one sentence:<br>«read README.md and tell me what this project does in one sentence» —<br>what exactly does that line trigger in DSH?",
        ),
        note(
            "答案应能指出：followup → turn/start → agent/pre-step → user/message → deriveMessages → llm/stream ×2 → tool-fs read → assistant/message stop → session/event → UI。",
            "Answer should cite: followup → turn/start → agent/pre-step → user/message → deriveMessages → llm/stream ×2 → tool-fs read → assistant/message stop → session/event → UI.",
        ),
        doc_ref("architecture"),
        doc_ref("agent-lifecycle"),
    )
