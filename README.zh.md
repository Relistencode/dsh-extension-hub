# dsh-extension-hub

> **v0.2.8 新功能** — **一键安装**：包新增组合补丁（bundle 层），`dsh plugin --profile web add dsh-extension-hub` 一条命令自动接线插件行，快速开始不再需要手动编辑 `cordis.patch.yml`。
>
> **v0.2.7 新功能** — **附加功能**区新增 [dsh-recall](https://github.com/Relistencode/dsh-recall)：对话历史回忆——字面/模糊/语义三层检索全部历史会话，完全本地离线，让 AI 再也不会忘记你说过的话。
>
> **v0.2.6 新功能** — 新增**精选目录**：社区精选 400+ 插件、11 个分类、双语描述，npm 秒装（带防抢注校验）；「发现更多」可搜索全部 GitHub dsh 插件。另有 [dsh-myrules](https://github.com/Relistencode/dsh-extension-hub/blob/main/packages/dsh-myrules/README.zh.md) —— 在设置页编辑此主机全局指令的姊妹插件；插件管理页新增**附加功能**区，可一键安装、停用、卸载附属功能，并随主插件一起检查更新。

一站式管理 DeepSeek Harness（DSH）的 Skills 与 MCP 服务器。

技能管理 · MCP 服务器 · 技能导入 · 插件管理 · 插件市场

一个服务化的 DSH 扩展中心：零依赖的持久层与 CLI，加上嵌进 DSH Web 设置页的持久化管理界面——新建 / 编辑 / 启用 / 停用技能与 MCP 服务器、从 Claude Code 与 OpenAI Codex 一键导入，以及完整的插件管理器（官方/第三方分组、启用 / 停用 / 卸载、检查与更新，外加**插件市场**：精选目录 + npm 秒装 + GitHub 发现）。

🌏 中文 · [English](README.md)

## 快速开始

**环境要求**：已装好 DSH（`dsh web` 能正常运行），Node.js ≥ 22，pnpm ≥ 10。

```sh
dsh plugin --profile web add dsh-extension-hub@0.2.13
```

一条命令即可：包自带组合补丁（bundle 层），插件行会自动接入你的 profile，无需手动编辑 `cordis.patch.yml`。重启 `dsh web`，然后打开 **设置 → 扩展管理**。

安装一次即可，之后可通过顶部「检查更新」按钮升级。

## 主要功能

| 功能 | CLI | 设置页 UI |
|---|---|---|
| 列出技能 / MCP（含启用状态、范围） | ✅ | ✅ |
| 新建 / 编辑 / 删除技能 | ✅ | ✅（表单 + Markdown 正文） |
| 启用 / 禁用技能、MCP | ✅ | ✅ |
| 新建 / 编辑 / 删除 MCP（stdio / streamable-http） | ✅ | ✅ |
| 从 Claude / Codex 等其他工具导入技能与 MCP | ✅ | ✅ |
| 项目级安装（选择目标文件夹） | ✅（`folder` 命令） | ✅（DSH 目录选择器） |
| 插件管理（官方/其他分组，启用/停用/卸载） | — | ✅ |
| 插件市场（精选目录 npm 安装 + GitHub 搜索） | — | ✅ |
| 检查并更新第三方插件 | — | ✅ |
| [dsh-myrules](https://github.com/Relistencode/dsh-extension-hub/blob/main/packages/dsh-myrules/README.zh.md) — 设置页编辑此主机全局指令（个性化页）；可在插件管理中搜索「dsh-myrules」停用/卸载 | — | ✅ |
| 附加功能管理（安装/停用/卸载附属功能，随主插件一起检查更新） | — | ✅ |

**内置技能只读**：列表会一并显示 DSH 部署自带的技能（shipped presets，如 `cordis` 预设自带的技能）与用户预设目录中的技能，标记为"内置/预设"且不可编辑/删除/切换 —— 它们属于 deployment 或预设层；如需覆盖，在用户或项目目录新建同名技能即可。

## 插件管理指南

**扩展管理**页自 v0.2.0 起内置完整插件管理器，共四个页签：**技能 / MCP 服务器 / 插件管理 / 插件市场**。

![插件预览](docs/screenshots/plugins-overview.png)

### 管理已安装的插件

**插件管理**页列出你 DSH 组合中的每一行插件，分成两个可折叠分组：

- **官方插件** — DeepSeek 官方出品的 `@deepseek-ai/*` 包（默认折叠）。可以停用但不能卸载；`cordis:include` 是组合配置加载器本身，标记为**核心**——不可停用或卸载。
- **其他插件** — 第三方与你自己安装的插件（比如本插件）。

点击插件查看详情：描述、来源、仓库链接、条目 ID 与模块名。详情里可以：

- **启用 / 停用** — 写入你的 profile `cordis.patch.yml`，重启 `dsh web` 后生效。停用前会警告：不清楚功能的插件可能带来未知的严重问题。
- **卸载**（仅非官方插件）— 从配置中移除该插件行，先警告、再二次确认"确认卸载？"。若插件是通过 GitHub 克隆安装的，其本地克隆目录会一并删除。

**其他插件**分组标题右侧有 **检查更新**：npm 包对比 registry、本地 git 克隆对比远端 HEAD。可更新的插件会在状态标签左侧出现绿色 **可更新** 按钮——点击拉取新版本（npm tarball 或 `git pull`），或用 **全部更新** 一键更新所有可更新插件。

![管理已安装的插件](docs/screenshots/manage-installed-plugins.png)

### 发现并安装新插件

**插件市场**页内有两个子视图：

- **精选目录**（默认）— 社区精选目录（[awesome-dsh-plugin](https://awesome-dsh-plugin.com/plugins.json)，每日刷新），11 个分类、双语描述、星数与排序（精选/最热/最新）。带 npm 映射的条目**从 npm 安装**（registry tarball，秒级完成，并校验包指向所选仓库以防名称抢占）；没有 npm 映射的条目回退为 GitHub 克隆。本地 24 小时缓存让该视图离线可用。
- **发现更多** — 搜索 GitHub 上打了 `dsh-plugin` 标签的仓库（可用关键字缩小范围）。每个结果展示星数，已安装的仓库会带"已安装"徽标。

点击条目进入详情页——描述、星数、分类（精选）、安装方式与仓库链接——然后点 **安装**。Extension Hub 会：

1. **优先走 npm registry**（插件发布到 npm 时）：下载 tarball 到 profile 的 `node_modules`，全程不依赖 pnpm（无需符号链接/权限），并注册 bundle 行。此类插件由 Extension Hub 自行管理——之后请继续用其「检查更新」保持最新；依赖已写入 profile 清单，后续 `dsh plugin` / pnpm 重装不会丢失。
2. 否则**浅克隆**仓库到 `~/.dsh/extension-hub/plugins/<仓库名>`，并校验它带有可用的 `package.json` 入口。克隆安装仅支持**零依赖**插件：带 npm 运行时依赖的包会被拒绝（克隆没有依赖安装步骤），依赖 bundle 补丁（`dsh.bundle.patch`）的包会给出警告（克隆无法应用它）。另请注意：monorepo 根仓库（例如 dsh-myrules 的仓库就是本仓库）克隆后得到的是根包而非目标插件——这类插件请走 npm 或附加功能安装。
3. 在 profile `cordis.patch.yml` 注册插件（托管 insert 块）并自检写入。

重启 `dsh web` 后，插件出现在**其他插件**分组里，可以停用、卸载（GitHub 克隆安装的会同时删除克隆目录），并用 **检查更新** 保持最新（npm 包对比 registry，本地 git 克隆通过 `git pull` 更新）。

![发现并安装新插件](docs/screenshots/discover-install-plugins.png)

> 安装意味着运行第三方代码。请只安装你信任的仓库，并先看仓库自己的 README 安装说明——打了 `dsh-plugin` 标签的仓库也可能是技能、MCP 服务器，或需要自定义安装方式。

## 最近更新

<details>
<summary>最近更新（点击展开）</summary>

- **2026-08** — v0.2.13：**修复（issue #2）** — `hostPatchPath()` 不再自动探测 profiles 目录（扫描可能先命中 headless,导致 MCP 列表读写错位的组合配置）；扩展管理固定绑定 **web** profile,显式指定 profile 仍受支持。
- **2026-08** — v0.2.12：**审查修复** — MCP 导入发现遵循 Claude/Codex 优先级（项目 `.mcp.json` > 项目 `.claude.json` > 用户配置；Codex 项目 > 全局）,不再反向覆盖;MCP 列表展示 Home 层行（`$DSH_HOME/cordis.patch.yml`，只读，带徽标）;组合配置与状态写入改为原子写（临时文件+rename，带锁重试）,崩溃不会损坏 `cordis.patch.yml`;克隆安装拒绝消息区分"无 package.json"与"缺少构建产物"（git 安装取源码非产物）;README 注明 npm 安装的插件由 Extension Hub 管理,后续 `dsh plugin`/pnpm 不会丢失。
- **2026-08** — v0.2.11：文档 —— 快速开始安装命令更新到当前版本（此前发布的包内 README 仍带着 v0.2.8 的命令）。
- **2026-08** — v0.2.10：**Windows GitHub 克隆安装崩溃完整修复** — 克隆插件行注册 `file://` URL 并指向克隆目录的**入口文件**(0.2.9 指向克隆目录,Node ESM 仍以 `ERR_UNSUPPORTED_DIR_IMPORT` 拒绝并导致 `dsh web` 崩溃);克隆安装同时拒绝带 npm 运行时依赖的包(克隆无依赖安装步骤),并对依赖 bundle 补丁(克隆无法应用)的包给出警告。若需手动修复损坏行,编辑 `cordis.patch.yml`,把该行 `name` 指向入口文件,如 `name: file:///C:/Users/you/.dsh/extension-hub/plugins/foo/lib/index.js`。
- **2026-08** — v0.2.9：Windows GitHub 克隆安装修复(第一次)— 克隆行从原始盘符路径改为 `file://` 模块名;已被 v0.2.10 取代(入口文件 URL)。
- **2026-08** — v0.2.8：**一键安装** —— 包新增组合补丁（`cordis.patch.yml`），`dsh plugin --profile web add dsh-extension-hub` 一条命令自动把插件行接入 profile；快速开始不再需要手动编辑 `cordis.patch.yml`。
- **2026-08** — v0.2.7：**附加功能**区新增 [dsh-recall](https://github.com/Relistencode/dsh-recall)——对话历史回忆（字面/模糊/语义三层检索全部历史会话，完全本地离线）；可在附加功能区一键安装/停用/卸载，并随主插件一起检查更新。
- **2026-08** — v0.2.6：插件管理页新增**附加功能**管理区——不离开页面即可安装/停用/启用/卸载附属功能（dsh-myrules）；头部**检查更新**改为主插件与已装附加功能一起检查、一键全部更新；附加功能区支持折叠；功能 i18n 键与 id 对齐；两个 README 新增「集成与合作」邀请段落。
- **2026-08** — v0.2.5：新增姊妹插件 **dsh-myrules**（`packages/dsh-myrules`）——设置页新增**个性化**页，编辑此主机全局指令（`$DSH_HOME/AGENTS.md`，注入所有会话，新会话立即生效）；插件管理器的主操作按钮改为主题反转配色，保存按钮变扁，新增百分比预算进度条；移除滚动备份机制。
- **2026-08** — v0.2.4：**插件市场 + 精选目录 + npm 安装路径** — 插件市场页新增**精选目录**视图（默认，awesome-dsh-plugin 社区目录，11 个分类、双语描述、精选/最热/最新排序、24 小时离线缓存），与**发现更多**（GitHub 搜索）并列；带 npm 映射的插件改为从 npm registry 以 tarball 安装（无需 pnpm，带防抢注的仓库校验），GitHub 克隆作为回退；设置页页签更名为**插件市场**；修复精选目录加载卡死（client 侧方法注册）；带引号的（`@scope`）行 id 在已安装判定与卸载中正确匹配；README 大改并更换截图。
- **2026-08** — v0.2.3：修复：补丁持久化语义——0.2.2 的平铺行写入对 patch 文件是错的（裸顶层 `- id:` 行会被当作 "override" 而静默失效；行必须包在 `- insert:` 里）。所有 patch 写入回退到托管 insert 块区域；profile patch 已重建为正确格式，重启后插件加载恢复正常。
- **2026-08** — v0.2.2：统一平铺行 patch 持久化（CLI 与 UI 写入同一 loader 兼容格式）；MCP 列表读取合并行（region 与平铺格式）；`@` 前缀名的标量引号修复；卸载会删除发现页安装的克隆目录。
- **2026-08** — v0.2.1：发现插件分页（"加载更多"，每页 30）、插件详情改为弹窗、真实的"已安装"标记（按配置行校验，而非仅看克隆目录）、安装写入自检、横向溢出修复。
- **2026-08** — v0.2.0：完整插件管理器——官方/第三方分组（按厂商 scope）、组合加载器核心保护、带确认的启用/停用/卸载、逐个插件检查与更新（npm registry + 本地 git 克隆，支持全部更新）、以及基于 GitHub 的**发现插件**页（一键克隆安装 `dsh-plugin` 仓库）。
- **2026-08** — v0.1.4：将 v0.1.3 更新说明同步进发布包（registry 同步发布）。
- **2026-08** — v0.1.3：新增严格 Typert 描述符（`./typert`），修复协议包重复加载布局下 `/api/extensionHub/*` 404 的问题；一键更新直接下载 npm tarball（不依赖 pnpm）。
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

## 已知限制

- YAML/TOML 解析器是自带的**子集**实现，覆盖 DSH composition 与 Codex `config.toml` 的实际形态；遇到未覆盖写法会跳过或报错，不会静默破坏文件。
- Skill 发现与 DSH `dsh-skill-filesystem` 一致：只识别 `<root>/<name>/SKILL.md` 与 `<root>/<name>.md`，`name` 必须 kebab-case。
- 项目级 MCP 依赖"生成预设 + 手动选预设"机制；本工具不会替你在会话间自动切换预设。
- 项目级 MCP 的启用/禁用开关作用于生成的预设（即"这个项目选了这个预设时是否加载该服务器"），清单文件始终保留全部记录。
- 全局 MCP 的删除/编辑只影响本管理器添加的行（受管区域内）；手写进 patch 的行不受影响。
- 精选目录是社区注册表的快照：加载时刷新并带 24 小时本地缓存，最多可能滞后一天。需要在安装时执行构建步骤的插件会回退为 GitHub 克隆安装，不走 npm tarball 路径。

## 集成与合作

DSH 扩展中心可以集成大部分插件，方便用户在一个地方管理、更新所有相关功能。如果您有意向，也非常欢迎将您的插件一起集成进来，共同完善 DSH 的插件生态——集成后，您的插件会出现在插件管理页的「附加功能」区，用户可以直接安装、停用、卸载，并随主插件一起检查更新。

期待您的加入，感谢您对 DSH 社区的开源贡献！

有合适的插件、功能或建议，欢迎提交 Issue 或直接联系：
[提交 Issue](https://github.com/Relistencode/dsh-extension-hub/issues) · Relistencode <1405650786@qq.com>

## 致谢

本项目的完善建立在 DSH 社区的开源成果之上，特此感谢：

- **[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)** —— 社区精选插件注册表，**精选目录**视图的数据源（每日刷新的 `plugins.json`、双语描述、npm 映射）。
- **[dsh-market](https://github.com/dsh-market/dsh-market)** —— DSH 内置插件市场，示范了 npm 优先安装与 registry-对-仓库的防抢注校验。
- **[dsh-plugins-store](https://github.com/ZASENJC/dsh-plugins-store)** —— 静态插件市场，其目录/验证思路启发了发现页数据源设计。
- **[dshfind](https://github.com/hikariming/dshfind)** —— DSH 学习站与插件浏览器，其评分/分级展示启发了质量信号的想法。

## 许可证

MIT
