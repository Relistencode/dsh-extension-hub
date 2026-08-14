# dsh-extension-hub

一站式管理 **DeepSeek Harness（DSH）** 的 **Skills** 与 **MCP 服务器**：自带零依赖 CLI，并提供嵌在 **DSH Web 设置页** 的持久化管理界面。

包含三层：

1. **持久层**（`lib/*.mjs`）— 无第三方依赖，只做"受管区域"文本编辑，绝不破坏你手写的内容；
2. **CLI**（`cli.mjs`）— 命令行管理技能/MCP，支持从 **Claude Code** 与 **OpenAI Codex** 检索并导入；
3. **持久化 UI 插件**（`lib/host.js` + `lib/client.js`）— 双端 Cordis 插件，把全部功能嵌进 **DSH Web 设置页**（"扩展管理"分区），支持项目级目标文件夹选择。

## 功能

| 功能 | CLI | 设置页 UI |
|---|---|---|
| 列出技能 / MCP（含启用状态、范围） | ✅ | ✅ |
| 新建 / 编辑 / 删除技能 | ✅ | ✅（表单 + Markdown 正文） |
| 启用 / 禁用技能、MCP | ✅ | ✅ |
| 新建 / 编辑 / 删除 MCP（stdio / streamable-http） | ✅ | ✅ |
| 从 Claude / Codex 检索并导入技能与 MCP | ✅ | ✅ |
| 项目级安装（选择目标文件夹） | ✅（`folder` 命令） | ✅（DSH 目录选择器） |

**内置技能只读**：列表会一并显示 DSH 部署自带的技能（shipped presets，如 `cordis` 预设自带的技能）与用户预设目录中的技能，标记为"内置/预设"且不可编辑/删除/切换 —— 它们属于 deployment 或预设层；如需覆盖，在用户或项目目录新建同名技能即可。

**界面语言**：设置页分区完整支持 **zh / en 双语**，跟随 DSH Web 的语言切换实时更新。

## CLI

```bash
node cli.mjs <command> [...]

# 查看
node cli.mjs list [--skills|--mcp|--all] [--json]

# 从 Claude / Codex 检索与导入
node cli.mjs discover <claude|codex> [--skills|--mcp|--all] [--json]
node cli.mjs import <claude|codex> (--skills|--mcp) [--scope project|global] [--names a,b] [--dry-run] [--json]

# 技能 CRUD
node cli.mjs get skill <name> [--scope project|global] [--json]
node cli.mjs create skill <name> [--description S] [--when-to-use S] [--license S] \
                  [--user-invocable true|false] [--body S] [--body-file PATH] [--scope project|global] [--json]
node cli.mjs edit skill <name> [--new-name S] [--description S] [--when-to-use S] [--license S] \
                  [--user-invocable true|false] [--body S] [--body-file PATH] [--scope project|global] [--json]
node cli.mjs enable  skill <name> [--scope project|global] [--json]
node cli.mjs disable skill <name> [--scope project|global] [--json]
node cli.mjs remove  skill <name> [--scope project|global] [--json]

# MCP CRUD
node cli.mjs create mcp <serverName> [--transport stdio|streamable-http] [--command CMD] \
                  [--args a,b] [--env k=v,...] [--url U] [--headers k=v,...] [--scope project|global] [--json]
node cli.mjs edit mcp <name|id> [同上参数] [--scope project|global] [--json]
node cli.mjs enable  mcp <name> [--scope project|global] [--json]
node cli.mjs disable mcp <name> [--scope project|global] [--json]
node cli.mjs remove  mcp <name> [--scope project|global] [--json]

# 项目级目标文件夹记忆
node cli.mjs folder <path> [--json]
node cli.mjs state [--json]
```

所有命令支持 `--json`（结构化输出，供 UI / 脚本消费）。

## 设置页 UI（DSH Web）

插件在设置页注册一个 **"扩展管理"** 分区：顶部有抬头（"管理插件、技能和 MCP"），下方两个页签：

- **技能**：列表（范围徽章、启用开关、编辑、删除）+ 新建（表单：名称/描述/whenToUse/许可证/user-invocable + Markdown 正文）
- **MCP 服务器**：列表（transport 徽章、启用开关、编辑、删除）+ 新建（stdio：命令/参数/环境变量；streamable-http：URL/请求头）

每个页签右上角都有 **"从 Claude/Codex 导入…"** 按钮，弹出导入窗口（类型固定为该页的 skills 或 mcp）：选来源 → 检索 → 勾选 → 选择范围（项目/全局）→ 导入。

**项目级目标文件夹**："选择文件夹…"按钮调用宿主目录选择器（native 对话框或内嵌目录浏览器，取决于部署），选择结果记入 `~/.dsh/extension-hub/state.json`，重启后仍然记得。

### 安装（在你自己的 DSH 上）

```bash
# 1. 把本包作为依赖装进 web profile
cd ~/.dsh/profiles/web
pnpm add dsh-extension-hub            # 从 npm registry
# 或：pnpm add <本仓库路径>            # 本地 / git checkout

# 2. 在宿主补丁里挂插件行（dsh 重启后生效）
#    编辑 ~/.dsh/profiles/web/cordis.patch.yml 追加：
#    - insert:
#        - id: extension-hub
#          name: dsh-extension-hub

# 3. 重启 dsh web
```

> **开发模式（本仓库即源码）**：`pnpm add file:...` 会以 junction 链接到仓库目录。ESM 从物理路径解析依赖，因此需要在仓库内提供依赖解析：
> ```bash
> mklink /J node_modules\@deepseek-ai <你的 DSH profiles>\node_modules\@deepseek-ai
> ```
> 从 npm registry 安装的正式包不需要这一步（依赖会随包安装）。

### 工作原理

- 宿主侧 `lib/host.js` 是一个 `TypertRemoteService` 网关（wire 命名空间 `extensionHub`）；浏览器侧挂载自己的 Remote contribution，通过挂载后的命名空间服务调用（不走编译期固定的 `connection.api` 静态面）。
- 浏览器包在 `package.json` 里声明 `dsh.client.platform: "web"`，DSH 的 client-modules 系统在启动时扫描并注入 boot manifest，通过 `/plugins/dsh-extension-hub/client.js` 路由动态服务 —— **无需重建 web bundle**。
- 所有真实读写都在宿主进程内完成（不受会话文件沙箱限制），与 CLI 共用同一套 `lib/` 代码。

## 数据来源（检索范围）

| 来源 | Skills | MCP |
|---|---|---|
| **Claude** | `<repo>/.claude/skills/*/SKILL.md`、`~/.claude/skills/*/SKILL.md` | `<repo>/.mcp.json`、`~/.claude.json`、`~/.claude/.claude.json` |
| **Codex** | `<repo>/.codex/skills/*/SKILL.md`、`~/.codex/skills/*/SKILL.md` | `~/.codex/config.toml`、`<repo>/.codex/config.toml` |

转换时：Claude/Codex 的 `stdio` 服务器 → DSH `transport: stdio`（`command`/`args`/`env`）；`http`/`sse` → `transport: streamable-http`（`url`/`headers`）。Skill 的 `name`/`description`/`whenToUse` 保留，`license`/`allowed-tools` 折入 `metadata`。

## 安装位置（DSH 持久化落点）

### Skills

- **项目级** `--scope project` → `<目标文件夹>/.dsh/skills/<name>/SKILL.md`
- **全局** `--scope global` → `~/.dsh/skills/<name>/SKILL.md`

启用/禁用通过改写 `SKILL.md` frontmatter 的 `disable-model-invocation` / `user-invocable` 实现；删除即移除文件。

### MCP

- **全局** → 在宿主补丁 `~/.dsh/profiles/<profile>/cordis.patch.yml` 的受管区域（`# >>> dsh-extension-hub` … `# <<< dsh-extension-hub`）追加/改写 `- insert: {id, name: '@deepseek-ai/dsh-mcp-client', config}` 行。
- **项目级** → 写清单 `<目标文件夹>/.dsh/mcp-servers.yaml`，并生成专用预设 `~/.dsh/.agent-presets/<slug>-mcp/agent.cordis.yml`（以 shipped `standard` 为基底）。在会话预设选择器里选该预设即可生效。

## 目录结构

```
dsh-extension-hub/
  package.json        # 插件包元数据（dsh.client 声明、bin、exports）
  cli.mjs             # CLI 入口
  lib/
    paths.mjs         # DSH home / patch / presets / skill roots 解析
    yaml.mjs          # YAML 子集解析
    toml.mjs          # TOML 子集解析（Codex config.toml）
    emit.mjs          # 最小 YAML 输出
    region.mjs        # 受管区域文本编辑
    discover.mjs      # Claude / Codex 检索
    convert.mjs       # Claude/Codex -> DSH 格式转换
    install.mjs       # 写盘（skills / patch / project preset）
    list.mjs          # 列出 DSH skills + MCP
    skills.mjs        # 技能创建/读取/更新（frontmatter + body）
    mcp.mjs           # MCP 行 upsert / get / remove / toggle
    state.mjs         # 管理器状态（记住项目文件夹等）
    host.js           # 插件宿主端：extensionHub Remote 网关
    client.js         # 插件浏览器端：设置页"扩展管理"分区 UI
```

## 已知边界

- YAML/TOML 解析器是自带的**子集**实现，覆盖 DSH composition 与 Codex `config.toml` 的实际形态；遇到未覆盖写法会跳过或报错，不会静默破坏文件。
- Skill 发现与 DSH `dsh-skill-filesystem` 一致：只识别 `<root>/<name>/SKILL.md` 与 `<root>/<name>.md`，`name` 必须 kebab-case。
- 项目级 MCP 依赖"生成预设 + 手动选预设"机制；本工具不会替你在会话间自动切换预设。
- 项目级 MCP 的启用/禁用开关作用于生成的预设（即"这个项目选了这个预设时是否加载该服务器"），清单文件始终保留全部记录。
- 全局 MCP 的删除/编辑只影响本管理器添加的行（受管区域内）；手写进 patch 的行不受影响。

## 发布

发布到 npm 前请确认：

1. `package.json` 的 `name`（`dsh-extension-hub`）在 registry 上仍可用；
2. `node_modules/` 已被 `.gitignore` 排除（开发用 junction，不入库）；
3. `npm publish` 前在干净 profile 上用 `dsh plugin --profile web add dsh-extension-hub` 从 registry 安装验证一次。

## 许可证

MIT
