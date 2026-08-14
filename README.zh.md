# dsh-extension-hub

一站式管理 DeepSeek Harness（DSH）的 Skills 与 MCP 服务器。

技能管理 · MCP 服务器 · 技能导入

一个服务化的 DSH 扩展中心：零依赖的持久层与 CLI，加上嵌进 DSH Web 设置页的持久化管理界面——新建 / 编辑 / 启用 / 停用技能与 MCP 服务器、从 Claude Code 与 OpenAI Codex 一键导入。插件管理与插件市场已在规划中。

🌏 中文 · [English](README.md)

## 快速开始

**环境要求**：已装好 DSH（`dsh web` 能正常运行），Node.js ≥ 22，pnpm ≥ 10。

macOS / Linux（Windows 装了 Git Bash 或 WSL 也可）：

```bash
cd ~/.dsh/profiles/web
pnpm add dsh-extension-hub
grep -q "name: dsh-extension-hub" cordis.patch.yml || cat >> cordis.patch.yml <<'EOF'

- insert:
    - id: extension-hub
      name: dsh-extension-hub
EOF
```

Windows（PowerShell 5.1+ / pwsh）：

```powershell
cd "$env:USERPROFILE\.dsh\profiles\web"
pnpm add dsh-extension-hub
if (-not (Select-String -Path cordis.patch.yml -Pattern 'name: dsh-extension-hub' -Quiet)) {
  Add-Content -Path cordis.patch.yml -Value "`n- insert:`n    - id: extension-hub`n      name: dsh-extension-hub"
}
```

重启 `dsh web`，然后打开 **设置 → 扩展管理**。

安装一次即可，中英双语、检查更新等能力随版本更新。

## 主要功能

| 功能 | CLI | 设置页 UI |
|---|---|---|
| 列出技能 / MCP（含启用状态、范围） | ✅ | ✅ |
| 新建 / 编辑 / 删除技能 | ✅ | ✅（表单 + Markdown 正文） |
| 启用 / 禁用技能、MCP | ✅ | ✅ |
| 新建 / 编辑 / 删除 MCP（stdio / streamable-http） | ✅ | ✅ |
| 从 Claude / Codex 导入技能与 MCP | ✅ | ✅ |
| 项目级安装（选择目标文件夹） | ✅（`folder` 命令） | ✅（DSH 目录选择器） |

**内置技能只读**：列表会一并显示 DSH 部署自带的技能（shipped presets，如 `cordis` 预设自带的技能）与用户预设目录中的技能，标记为"内置/预设"且不可编辑/删除/切换 —— 它们属于 deployment 或预设层；如需覆盖，在用户或项目目录新建同名技能即可。

## 最近更新

<details>
<summary>最近更新（点击展开）</summary>

- **2026-08** — 抬头新增"检查更新"按钮：对比本地版本与 npm registry 最新版。
- **2026-08** — 分区更名为 **扩展管理** 并加抬头（"管理插件、技能和 MCP"）；导入从独立页签并入技能 / MCP 服务器页。
- **2026-08** — 完整中英双语（83 个文案键）、项目级文件夹选择、内置技能只读层。
- 首个版本 — CLI + 持久化设置页 UI + 零依赖持久层。

</details>

## 工作原理

- 宿主侧 `lib/host.js` 是一个 `TypertRemoteService` 网关（wire 命名空间 `extensionHub`）；浏览器侧挂载自己的 Remote contribution，通过挂载后的命名空间服务调用。
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

## 支持平台

DSH 本身支持 Windows、macOS 与 Linux；本插件无平台特殊性 —— CLI 在任意 Node.js 环境可用，设置页 UI 跟随 DSH Web 宿主。

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

## 已知限制

- YAML/TOML 解析器是自带的**子集**实现，覆盖 DSH composition 与 Codex `config.toml` 的实际形态；遇到未覆盖写法会跳过或报错，不会静默破坏文件。
- Skill 发现与 DSH `dsh-skill-filesystem` 一致：只识别 `<root>/<name>/SKILL.md` 与 `<root>/<name>.md`，`name` 必须 kebab-case。
- 项目级 MCP 依赖"生成预设 + 手动选预设"机制；本工具不会替你在会话间自动切换预设。
- 项目级 MCP 的启用/禁用开关作用于生成的预设（即"这个项目选了这个预设时是否加载该服务器"），清单文件始终保留全部记录。
- 全局 MCP 的删除/编辑只影响本管理器添加的行（受管区域内）；手写进 patch 的行不受影响。

## 许可证

MIT
