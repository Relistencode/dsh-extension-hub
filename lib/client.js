// Browser half of the durable dsh-extension-hub plugin.
//
// This file is served verbatim by the host's client-modules bundle route
// (`/plugins/dsh-extension-hub/client.js`) and executed through the lazy CJS
// module table: the factory receives `require` and must register itself with
// `window.__ModuleLoader__.load`. Keep the require surface minimal — only
// `react` (a shell seed word) is used; the host API is reached through the
// mounted Remote namespace service, never through package imports.
//
// The plugin registers one section in the DSH Web settings page
// (`settings.section`, id `extension-hub`) with three tabs:
//   Skills — list / create / edit / delete / enable-disable DSH skills
//   MCP    — list / create / edit / delete / enable-disable MCP servers
//   Import — discover + import skills & MCP from Claude / Codex
// Project-scope operations target a folder the user picks with the host's
// directory picker (native dialog or in-app browse), remembered across reloads.
//
// Copy is fully localized through the DSH locale service: dictionaries are
// registered for zh and en, the slot shell injects `t` into section props
// (LocaleFace), and every subcomponent receives `t` explicitly. The brand
// name "Extension Hub" is locale-independent.
//
// NOTE: no bundler/transpiler runs on this file — it is plain ES2017-ish JS
// executed as a classic script. Every useState is explicitly destructured.
window.__ModuleLoader__.load({
	id: "dsh-extension-hub",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		var React = require("react");

		// ── styles ──────────────────────────────────────────────────────────────
		var CSS_ID = "dsh-extension-hub/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"" + CSS_ID + "\"]") === null) {
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-extension-hub";
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = [
				".skm-wrap{display:flex;flex-direction:column;gap:14px;min-height:0;color:var(--dsw-alias-label-primary,#1f2329);font-size:14px;line-height:22px}",
				".skm-tabs{display:flex;gap:6px;border-bottom:1px solid var(--dsw-alias-divider,#e5e6eb);padding-bottom:8px}",
				".skm-tab{cursor:pointer;border:none;background:none;font-family:inherit;font-size:14px;line-height:22px;color:var(--dsw-alias-label-secondary,#646a73);padding:6px 14px;border-radius:10px}",
				".skm-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}",
				".skm-tab.skm-active{color:var(--dsw-alias-label-primary,#1f2329);background:var(--dsw-alias-interactive-bg-active,rgba(0,0,0,.08));font-weight:500}",
				".skm-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
				".skm-spacer{flex:1}",
				".skm-btn{cursor:pointer;border:1px solid var(--dsw-alias-border,#d0d3d9);background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#1f2329);font-family:inherit;font-size:13px;line-height:20px;padding:5px 12px;border-radius:9px}",
				".skm-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}",
				".skm-btn.skm-primary{background:var(--dsw-alias-accent,#3370ff);border-color:var(--dsw-alias-accent,#3370ff);color:#fff}",
				".skm-btn.skm-danger{border-color:#d54941;color:#d54941}",
				".skm-btn.skm-danger:hover{background:rgba(213,73,65,.08)}",
				".skm-btn.skm-success{border-color:#12965b;color:#12965b;background:rgba(18,150,91,.08)}",
				".skm-btn.skm-success:hover{background:rgba(18,150,91,.16)}",
				".skm-btn:disabled{opacity:.5;cursor:default}",
				".skm-btn.skm-sm{padding:2px 8px;font-size:12px;border-radius:7px}",
				".skm-input,.skm-select,.skm-textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border,#d0d3d9);background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#1f2329);font-family:inherit;font-size:13px;line-height:20px;padding:5px 9px;border-radius:8px}",
				".skm-textarea{min-height:120px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:18px}",
				".skm-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}",
				".skm-field>label{font-size:12px;color:var(--dsw-alias-label-secondary,#646a73)}",
				".skm-row{display:flex;align-items:center;gap:8px}",
				".skm-list{display:flex;flex-direction:column;gap:4px;max-height:52vh;overflow-y:auto;overflow-x:hidden;padding-right:4px}",
				".skm-item{display:flex;align-items:center;gap:10px;border:1px solid var(--dsw-alias-border,#e5e6eb);border-radius:11px;padding:8px 12px;background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,.015))}",
				".skm-item-main{flex:1;min-width:0}",
				".skm-item-title{display:flex;align-items:center;gap:8px;font-weight:500}",
				".skm-item-desc{font-size:12px;color:var(--dsw-alias-label-secondary,#646a73);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
				".skm-badge{flex:none;font-size:11px;line-height:16px;padding:0 7px;border-radius:999px;background:var(--dsw-alias-interactive-bg-active,rgba(0,0,0,.07));color:var(--dsw-alias-label-secondary,#646a73);white-space:nowrap}",
				".skm-badge.skm-proj{background:rgba(51,112,255,.12);color:#3370ff}",
				".skm-switch{cursor:pointer;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border,#d0d3d9);background:none;font-family:inherit;font-size:12px;padding:3px 9px;border-radius:999px;color:var(--dsw-alias-label-secondary,#646a73)}",
				".skm-switch.skm-on{background:rgba(18,150,91,.12);color:#12965b;border-color:rgba(18,150,91,.4)}",
				".skm-banner{font-size:12px;line-height:18px;padding:6px 10px;border-radius:8px}",
				".skm-banner.skm-err{background:rgba(213,73,65,.1);color:#d54941}",
				".skm-banner.skm-ok{background:rgba(18,150,91,.1);color:#12965b}",
				".skm-folder{font-size:12px;color:var(--dsw-alias-label-secondary,#646a73);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04));padding:4px 10px;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
				".skm-modal{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}",
				".skm-modal-card{width:640px;max-width:calc(100vw - 48px);max-height:min(86vh,760px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-2,#fff);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);overflow:hidden}",
				".skm-modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;font-weight:600;font-size:15px;border-bottom:1px solid var(--dsw-alias-divider,#e5e6eb)}",
				".skm-modal-body{padding:16px 18px;overflow-y:auto;min-height:0;flex:1}",
				".skm-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--dsw-alias-divider,#e5e6eb)}",
				".skm-check{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer}",
				".skm-check:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}",
				".skm-dir{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;cursor:pointer;font-size:13px}",
				".skm-dir:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}",
				".skm-dir-crumb{display:inline-flex;gap:4px;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-secondary,#646a73);margin-bottom:6px}",
				".skm-dir-crumb button{color:var(--dsw-alias-accent,#3370ff);border:none;background:none;cursor:pointer;font-family:inherit;font-size:12px;padding:0}",
				".skm-hint{font-size:12px;color:var(--dsw-alias-label-tertiary,#8f959e)}",
				".skm-empty{font-size:13px;color:var(--dsw-alias-label-tertiary,#8f959e);text-align:center;padding:18px 0}",
				".skm-header{display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:2px}",
				".skm-header-main{display:flex;flex-direction:column;gap:2px;min-width:0}",
				".skm-header-title{font-size:18px;line-height:26px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2329)}",
				".skm-header-sub{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#646a73)}",
				".skm-header-side{flex:none;display:flex;align-items:center;gap:8px}",
				".skm-update-btn{font-size:11px;line-height:16px;padding:2px 8px;border-radius:7px}",
				".skm-group-head{display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;box-sizing:border-box;padding:4px 2px;border:none;background:none;font-family:inherit;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2329);width:100%;text-align:left}",
				".skm-group-head:hover{color:var(--dsw-alias-accent,#3370ff)}",
				".skm-group-arrow{display:inline-flex;transition:transform .15s;font-size:11px;color:var(--dsw-alias-label-secondary,#646a73)}",
				".skm-group-arrow.skm-open{transform:rotate(90deg)}",
				".skm-group-count{font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary,#8f959e);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));padding:0 7px;border-radius:999px;line-height:16px}",
				".skm-plugin-row{cursor:pointer;box-sizing:border-box;text-align:left;border:1px solid var(--dsw-alias-border,#e5e6eb);border-radius:10px;padding:6px 10px;background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,.015));font-family:inherit}",
				".skm-plugin-row:hover{border-color:var(--dsw-alias-accent,#3370ff)}",
				".skm-plugin-row.skm-selected{border-color:var(--dsw-alias-accent,#3370ff);background:rgba(51,112,255,.05)}",
				".skm-plugin-detail{display:flex;flex-direction:column;gap:5px;padding:8px 10px 2px;font-size:12px;color:var(--dsw-alias-label-secondary,#646a73)}",
				".skm-plugin-detail-row{display:flex;gap:8px;align-items:flex-start;min-width:0}",
				".skm-plugin-detail-row b{flex:none;min-width:64px;font-weight:500;color:var(--dsw-alias-label-tertiary,#8f959e)}",
				".skm-plugin-detail-row>span,.skm-plugin-detail-row>a{min-width:0;word-break:break-all}",
				".skm-plugin-detail .skm-desc{white-space:pre-wrap;word-break:break-word}",
				".skm-dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex:none}",
				".skm-dot.skm-on{background:#12965b}",
				".skm-dot.skm-off{background:#b9bec6}",
				".skm-dot.skm-err{background:#d54941}",
				".skm-plugin-name{display:block;font-weight:500;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;flex:0 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			].join("");
			document.head.appendChild(tag);
		}

		// ── dictionaries ────────────────────────────────────────────────────────
		var NS = "extensionHub";
		var zh = {
			"nav": "扩展管理",
			"header.title": "扩展管理",
			"header.subtitle": "管理插件、技能和 MCP",
			"tab.skills": "技能",
			"tab.mcp": "MCP 服务器",
			"import.from": "从 Claude/Codex 导入…",
			"import.title": "从 Claude/Codex 导入",
			"scope.createProject": "新建到项目",
			"scope.createGlobal": "新建到全局",
			"scope.importProject": "导入到项目",
			"scope.importGlobal": "导入到全局",
			"newSkill": "+ 新建技能",
			"newServer": "+ 新建服务器",
			"folder.label": "项目级目标文件夹:",
			"folder.unset": "未选择(默认使用宿主工作目录)",
			"folder.pick": "选择文件夹…",
			"folder.pickTitle": "选择项目文件夹",
			"folder.newSub": "新建子文件夹名称",
			"folder.new": "新建",
			"folder.select": "选此文件夹",
			"folder.empty": "空目录",
			"folder.pickFailed": "选择文件夹失败: ",
			"folder.unsupported": "当前宿主不支持目录选择",
			"badge.project": "项目",
			"badge.global": "全局",
			"badge.readonly": "内置/预设",
			"badge.manifest": "清单待生成",
			"badge.skill": "技能",
			"badge.mcp": "MCP",
			"switch.on": "已启用",
			"switch.off": "已禁用",
			"switch.disableHint": "点击禁用",
			"switch.enableHint": "点击启用",
			"edit": "编辑",
			"delete": "删除",
			"cancel": "取消",
			"save": "保存",
			"loading": "加载中…",
			"empty.skills": "暂无技能",
			"empty.mcp": "暂无 MCP 服务器",
			"descNone": "(无描述)",
			"notice.success": " 成功",
			"notice.failed": " 失败: ",
			"notice.saved": "保存成功",
			"confirm.deleteSkill": "删除技能 {name} ({scope})? 该操作会删除文件。",
			"confirm.deleteMcp": "删除 MCP 服务器 {name} ({scope})? {extra}",
			"confirm.mcpGlobalNote": "将从宿主 patch 移除(仅本管理器添加的行)。",
			"confirm.mcpProjectNote": "将从项目清单与预设中移除。",
			"form.skillTitleNew": "新建技能",
			"form.skillTitleEdit": "编辑技能 {name}",
			"form.mcpTitleNew": "新建 MCP 服务器",
			"form.mcpTitleEdit": "编辑 MCP 服务器 {name}",
			"form.name": "名称 (kebab-case)",
			"form.description": "描述",
			"form.whenToUse": "何时使用 (whenToUse)",
			"form.license": "许可证 (license)",
			"form.userInvocable": "允许用户手动调用 (user-invocable)",
			"form.body": "正文 (Markdown)",
			"form.bodyHint": "技能执行指令主体",
			"form.serverName": "服务器名称 (serverName)",
			"form.transport": "传输方式",
			"form.stdio": "stdio (本地进程)",
			"form.http": "streamable-http (远程 URL)",
			"form.url": "URL",
			"form.headers": "请求头",
			"form.headersHint": "每行一条, 格式: 名称: 值",
			"form.command": "启动命令",
			"form.args": "参数",
			"form.argsHint": "每行一个参数",
			"form.env": "环境变量",
			"form.envHint": "每行一条, 格式: 名称=值",
			"error.nameRequired": "技能名称不能为空",
			"error.serverNameRequired": "服务器名称不能为空",
			"error.unknown": "未知错误",
			"import.sourceClaude": "来源: Claude",
			"import.sourceCodex": "来源: Codex",
												"import.scan": "检索可导入项",
			"import.selected": "已选 {count} 项",
			"import.run": "导入所选",
			"import.empty": "没有可导入的项",
			"import.selectFirst": "请先勾选要导入的项",
			"import.failed": "导入失败: ",
			"readonlyHint": "来自 {source}，只读；可在用户或项目目录新建同名技能覆盖",
			"update.check": "检查更新",
			"update.available": "发现新版本 {latest}（当前 {current}）",
			"update.upToDate": "已是最新版本（{current}）",
			"update.notPublished": "插件尚未发布到 npm，无法检查更新",
			"update.fail": "检查更新失败: ",
			"update.run": "更新",
			"update.running": "更新中…",
			"update.done": "更新成功（{version}），重启 dsh web 后生效",
			"update.runFailed": "更新失败: ",
			"tab.plugins": "插件管理",
			"plugins.search": "搜索插件…",
			"plugins.official": "官方插件",
			"plugins.other": "其他插件",
			"plugins.empty": "没有匹配的插件",
			"plugins.loadFailed": "插件列表加载失败: ",
			"plugins.enabled": "已启用",
			"plugins.disabled": "已禁用",
			"plugins.failed": "加载失败",
			"plugins.loading": "加载中",
			"plugins.pending": "待加载",
			"plugins.unloading": "卸载中",
			"plugins.unknownPhase": "未知",
			"plugins.source": "来源",
			"plugins.source.official": "官方",
			"plugins.source.other": "第三方/自定义",
			"plugins.core": "核心",
			"plugins.coreHint": "系统核心组件，不可停用或卸载",
			"plugins.id": "条目 ID",
			"plugins.module": "模块",
			"plugins.descNone": "(无描述)",
			"plugins.collapse": "收起",
			"plugins.expand": "展开",
			"plugins.enable": "启用",
			"plugins.disable": "停用",
			"plugins.uninstall": "卸载",
			"plugins.repository": "仓库",
			"plugins.warn.disable": "不清楚插件功能的情况下，停用插件可能带来未知的严重问题！",
			"plugins.warn.uninstall": "不清楚插件功能的情况下，卸载插件可能带来未知的严重问题！",
			"plugins.confirmEnable": "确认启用插件 {name}？",
			"plugins.confirmUninstall": "确认卸载？",
			"plugins.confirmTitle": "操作确认",
			"plugins.uninstallNote": "卸载将从配置中移除该插件行，重启 dsh web 后生效。",
			"plugins.toggleNote": "停用/启用写入配置后需重启 dsh web 才生效。",
			"plugins.pendingRestart": "已写入配置，重启 dsh web 后生效。",
			"plugins.opFailed": "操作失败: ",
			"plugins.uninstallDenied": "内置插件无法卸载，只能停用。",
			"tab.discover": "发现插件",
			"tab.curated": "精选目录",
			"curated.hint": "社区精选插件目录（每日更新，人工维护）。想搜索全部 GitHub 插件？切换到「GitHub 搜索」。",
			"curated.loading": "加载中…",
			"curated.empty": "目录为空",
			"curated.failed": "目录加载失败: ",
			"curated.fromCache": "（离线缓存，可能不是最新）",
			"curated.all": "全部",
			"curated.orderFeatured": "精选",
			"curated.orderStars": "最热",
			"curated.orderNewest": "最新",
			"curated.installed": "已安装",
			"curated.npmBadge": "npm 秒装",
			"curated.total": "共 {n} 个插件",
			"curated.install": "安装",
			"curated.installTitle": "安装插件",
			"curated.installWarnNpm": "将从 npm 安装 {name} 并注册到 DSH 配置。该插件来自第三方，安装前请确认其来源可信。",
			"curated.installWarnGit": "将克隆 GitHub 仓库 {repo} 到本地并加入 DSH 配置。该插件来自第三方，安装前请确认其来源可信。",
			"curated.installNote": "安装后需重启 dsh web 才生效。",
			"curated.installing": "安装中…",
			"curated.stageFetch": "正在校验 npm 包…",
			"curated.stageInstall": "正在下载并安装…",
			"curated.installDone": "安装成功，重启 dsh web 后生效。",
			"curated.installFailed": "安装失败: ",
			"curated.fail.network": "安装失败：可能是网络原因，请检查网络后重试。",
			"curated.fail.invalid": "安装失败：包缺少有效的 dsh 插件结构（package.json/main），或包名不匹配。",
			"curated.fail.mismatch": "安装被拒绝：npm 包与所选仓库不匹配（可能存在名称抢占），已取消安装。",
			"curated.fail.exists": "该插件似乎已安装。",
			"curated.loadMore": "加载更多",
			"curated.search": "在目录中搜索…",
			"curated.detail.category": "分类",
			"curated.detail.source": "来源",
			"curated.detail.sourceCurated": "社区精选",
			"curated.detail.npm": "npm 包",
			"curated.detail.repo": "仓库",
			"curated.detail.mode": "安装方式",
			"curated.detail.modeNpm": "npm 安装（快速）",
			"curated.detail.modeGit": "GitHub 克隆",
			"curated.backToResults": "← 返回列表",
			"discover.search": "搜索 GitHub 上的 dsh 插件…",
			"discover.searchBtn": "搜索",
			"discover.loading": "搜索中…",
			"discover.empty": "没有找到相关插件",
			"discover.failed": "搜索失败: ",
			"discover.installed": "已安装",
			"discover.stars": "星数",
			"discover.language": "语言",
			"discover.updated": "更新时间",
			"discover.repository": "仓库",
			"discover.install": "安装",
			"discover.installTitle": "安装插件",
			"discover.installWarn": "将克隆 GitHub 仓库 {repo} 到本地并加入 DSH 配置。该插件来自第三方，安装前请确认其来源可信。",
			"discover.installNote": "安装后需重启 dsh web 才生效。",
			"discover.installing": "安装中…",
			"discover.installingClone": "正在克隆仓库…（可能需要几十秒）",
			"discover.installingVerify": "正在验证插件结构…",
			"discover.installDone": "安装成功，重启 dsh web 后生效。",
			"discover.installFailed": "安装失败: ",
			"discover.fail.network": "安装失败：可能是网络原因（无法连接 GitHub），请检查网络后重试。",
			"discover.fail.invalid": "安装失败：来源可能非 dsh 专用插件（技能/MCP），或常规安装方法，建议打开插件链接，了解插件安装详情。",
			"discover.backToResults": "← 返回列表",
			"discover.loadMore": "加载更多",
			"discover.back": "← 返回插件管理",
			"plugins.checkUpdates": "检查更新",
			"plugins.checking": "检查中…",
			"plugins.updateAll": "全部更新",
			"plugins.updateable": "可更新",
			"plugins.updating": "更新中…",
			"plugins.updateDone": "已更新 {name}，重启 dsh web 后生效",
			"plugins.updateFailed": "更新失败: ",
			"plugins.upToDate": "所有插件已是最新",
			"plugins.checkResult": "发现 {n} 个可更新插件",
			"plugins.checkFailed": "检查更新失败: ",
		};
		var en = {
			"nav": "Extension Management",
			"header.title": "Extension Management",
			"header.subtitle": "Manage plugins, skills and MCP",
			"tab.skills": "Skills",
			"tab.mcp": "MCP Servers",
			"import.from": "Import from Claude/Codex…",
			"import.title": "Import from Claude/Codex",
			"scope.createProject": "Create in Project",
			"scope.createGlobal": "Create Globally",
			"scope.importProject": "Import to Project",
			"scope.importGlobal": "Import Globally",
			"newSkill": "+ New Skill",
			"newServer": "+ New Server",
			"folder.label": "Project folder:",
			"folder.unset": "Not set (defaults to host working dir)",
			"folder.pick": "Choose Folder…",
			"folder.pickTitle": "Choose Project Folder",
			"folder.newSub": "New subfolder name",
			"folder.new": "New",
			"folder.select": "Select This Folder",
			"folder.empty": "Empty",
			"folder.pickFailed": "Folder pick failed: ",
			"folder.unsupported": "Directory picking is unavailable on this host",
			"badge.project": "Project",
			"badge.global": "Global",
			"badge.readonly": "Built-in/Preset",
			"badge.manifest": "Manifest pending",
			"badge.skill": "Skill",
			"badge.mcp": "MCP",
			"switch.on": "Enabled",
			"switch.off": "Disabled",
			"switch.disableHint": "Click to disable",
			"switch.enableHint": "Click to enable",
			"edit": "Edit",
			"delete": "Delete",
			"cancel": "Cancel",
			"save": "Save",
			"loading": "Loading…",
			"empty.skills": "No skills",
			"empty.mcp": "No MCP servers",
			"descNone": "(no description)",
			"notice.success": " succeeded",
			"notice.failed": " failed: ",
			"notice.saved": "Saved",
			"confirm.deleteSkill": "Delete skill {name} ({scope})? The file will be removed.",
			"confirm.deleteMcp": "Delete MCP server {name} ({scope})? {extra}",
			"confirm.mcpGlobalNote": "It will be removed from the host patch (manager-managed rows only).",
			"confirm.mcpProjectNote": "It will be removed from the project manifest and preset.",
			"form.skillTitleNew": "New Skill",
			"form.skillTitleEdit": "Edit Skill {name}",
			"form.mcpTitleNew": "New MCP Server",
			"form.mcpTitleEdit": "Edit MCP Server {name}",
			"form.name": "Name (kebab-case)",
			"form.description": "Description",
			"form.whenToUse": "When to use (whenToUse)",
			"form.license": "License",
			"form.userInvocable": "Allow manual invocation (user-invocable)",
			"form.body": "Body (Markdown)",
			"form.bodyHint": "Skill instructions",
			"form.serverName": "Server name (serverName)",
			"form.transport": "Transport",
			"form.stdio": "stdio (local process)",
			"form.http": "streamable-http (remote URL)",
			"form.url": "URL",
			"form.headers": "Headers",
			"form.headersHint": "One per line, format: Name: Value",
			"form.command": "Command",
			"form.args": "Arguments",
			"form.argsHint": "One argument per line",
			"form.env": "Environment variables",
			"form.envHint": "One per line, format: Name=Value",
			"error.nameRequired": "Skill name is required",
			"error.serverNameRequired": "Server name is required",
			"error.unknown": "Unknown error",
			"import.sourceClaude": "Source: Claude",
			"import.sourceCodex": "Source: Codex",
												"import.scan": "Scan importable items",
			"import.selected": "{count} selected",
			"import.run": "Import Selected",
			"import.empty": "Nothing importable",
			"import.selectFirst": "Select items first",
			"import.failed": "Import failed: ",
			"readonlyHint": "From {source}; read-only. Create a same-name skill in user/project dirs to override.",
			"update.check": "Check Updates",
			"update.available": "New version {latest} available (current: {current})",
			"update.upToDate": "Up to date ({current})",
			"update.notPublished": "Not published to npm yet — cannot check for updates",
			"update.fail": "Update check failed: ",
			"update.run": "Update",
			"update.running": "Updating…",
			"update.done": "Update complete ({version}) — restart dsh web to apply",
			"update.runFailed": "Update failed: ",
			"tab.plugins": "Plugins",
			"plugins.search": "Search plugins…",
			"plugins.official": "Official Plugins",
			"plugins.other": "Other Plugins",
			"plugins.empty": "No matching plugins",
			"plugins.loadFailed": "Failed to load plugins: ",
			"plugins.enabled": "Enabled",
			"plugins.disabled": "Disabled",
			"plugins.failed": "Failed",
			"plugins.loading": "Loading",
			"plugins.pending": "Pending",
			"plugins.unloading": "Unloading",
			"plugins.unknownPhase": "Unknown",
			"plugins.source": "Source",
			"plugins.source.official": "Official",
			"plugins.source.other": "Third-party / Custom",
			"plugins.core": "Core",
			"plugins.coreHint": "System core component — cannot be disabled or uninstalled",
			"plugins.id": "Entry ID",
			"plugins.module": "Module",
			"plugins.descNone": "(no description)",
			"plugins.collapse": "Collapse",
			"plugins.expand": "Expand",
			"plugins.enable": "Enable",
			"plugins.disable": "Disable",
			"plugins.uninstall": "Uninstall",
			"plugins.repository": "Repository",
			"plugins.warn.disable": "Disabling a plugin whose function you don't understand may cause serious unknown problems!",
			"plugins.warn.uninstall": "Uninstalling a plugin whose function you don't understand may cause serious unknown problems!",
			"plugins.confirmEnable": "Enable plugin {name}?",
			"plugins.confirmUninstall": "Confirm uninstall?",
			"plugins.confirmTitle": "Confirm Action",
			"plugins.uninstallNote": "Uninstalling removes the plugin row from the configuration; it takes effect after a dsh web restart.",
			"plugins.toggleNote": "Enable/disable is written to the configuration and takes effect after a dsh web restart.",
			"plugins.pendingRestart": "Written to configuration — restart dsh web to apply.",
			"plugins.opFailed": "Action failed: ",
			"plugins.uninstallDenied": "Built-in plugins cannot be uninstalled; disable them instead.",
			"tab.discover": "Discover",
			"tab.curated": "Curated",
			"curated.hint": "Community-curated plugin catalog (updated daily). Want to search every GitHub plugin? Switch to “GitHub Search”.",
			"curated.loading": "Loading…",
			"curated.empty": "The catalog is empty",
			"curated.failed": "Catalog load failed: ",
			"curated.fromCache": " (offline cache, may be stale)",
			"curated.all": "All",
			"curated.orderFeatured": "Featured",
			"curated.orderStars": "Top",
			"curated.orderNewest": "Newest",
			"curated.installed": "Installed",
			"curated.npmBadge": "npm install",
			"curated.total": "{n} plugins",
			"curated.install": "Install",
			"curated.installTitle": "Install Plugin",
			"curated.installWarnNpm": "This will install {name} from npm and register it in the DSH configuration. The plugin is third-party — verify its source is trustworthy before installing.",
			"curated.installWarnGit": "This will clone the GitHub repository {repo} locally and register it in the DSH configuration. The plugin is third-party — verify its source is trustworthy before installing.",
			"curated.installNote": "A dsh web restart is required for the install to take effect.",
			"curated.installing": "Installing…",
			"curated.stageFetch": "Verifying npm package…",
			"curated.stageInstall": "Downloading and installing…",
			"curated.installDone": "Install complete — restart dsh web to apply.",
			"curated.installFailed": "Install failed: ",
			"curated.fail.network": "Install failed: possible network issue. Check your connection and retry.",
			"curated.fail.invalid": "Install failed: the package lacks a valid dsh plugin structure (package.json/main), or the package name does not match.",
			"curated.fail.mismatch": "Install rejected: the npm package does not match the selected repository (possible name squatting).",
			"curated.fail.exists": "This plugin appears to be already installed.",
			"curated.loadMore": "Load more",
			"curated.search": "Search the catalog…",
			"curated.detail.category": "Category",
			"curated.detail.source": "Source",
			"curated.detail.sourceCurated": "Community curated",
			"curated.detail.npm": "npm package",
			"curated.detail.repo": "Repository",
			"curated.detail.mode": "Install method",
			"curated.detail.modeNpm": "npm (fast)",
			"curated.detail.modeGit": "GitHub clone",
			"curated.backToResults": "← Back to list",
			"discover.search": "Search dsh plugins on GitHub…",
			"discover.searchBtn": "Search",
			"discover.loading": "Searching…",
			"discover.empty": "No plugins found",
			"discover.failed": "Search failed: ",
			"discover.installed": "Installed",
			"discover.stars": "Stars",
			"discover.language": "Language",
			"discover.updated": "Updated",
			"discover.repository": "Repository",
			"discover.install": "Install",
			"discover.installTitle": "Install Plugin",
			"discover.installWarn": "This will clone the GitHub repository {repo} locally and register it in the DSH configuration. The plugin is third-party — verify its source is trustworthy before installing.",
			"discover.installNote": "A dsh web restart is required for the install to take effect.",
			"discover.installing": "Installing…",
			"discover.installingClone": "Cloning repository… (may take a few dozen seconds)",
			"discover.installingVerify": "Verifying plugin structure…",
			"discover.installDone": "Install complete — restart dsh web to apply.",
			"discover.installFailed": "Install failed: ",
			"discover.fail.network": "Install failed: possible network issue (cannot reach GitHub). Check your connection and retry.",
			"discover.fail.invalid": "Install failed: the source may not be a dsh plugin (skill/MCP), or it needs a custom install method. Open the repository link for install instructions.",
			"discover.backToResults": "← Back to results",
			"discover.loadMore": "Load more",
			"discover.back": "← Back to Plugins",
			"plugins.checkUpdates": "Check Updates",
			"plugins.checking": "Checking…",
			"plugins.updateAll": "Update All",
			"plugins.updateable": "Update Available",
			"plugins.updating": "Updating…",
			"plugins.updateDone": "Updated {name} — restart dsh web to apply",
			"plugins.updateFailed": "Update failed: ",
			"plugins.upToDate": "All plugins up to date",
			"plugins.checkResult": "{n} update(s) available",
			"plugins.checkFailed": "Update check failed: ",
		};

		// ── tiny DOM helpers ─────────────────────────────────────────────────────
		function h(type, props) {
			var children = Array.prototype.slice.call(arguments, 2);
			return React.createElement.apply(React, [type, props || null].concat(children));
		}
		function Btn(props) {
			var children = Array.prototype.slice.call(arguments, 1);
			var cls = "skm-btn" + (props.kind ? " skm-" + props.kind : "") + (props.sm ? " skm-sm" : "");
			var rest = {};
			for (var k in props) {
				if (k !== "kind" && k !== "sm" && k !== "children") rest[k] = props[k];
			}
			if (rest.className) cls = cls + " " + rest.className;
			rest.className = cls;
			rest.type = props.type || "button";
			return h.apply(null, ["button", rest].concat(children.length ? children : (props.children ? [props.children] : [])));
		}
		function Field(props) {
			return h("div", { className: "skm-field" }, h("label", null, props.label), props.children, props.hint ? h("div", { className: "skm-hint" }, props.hint) : null);
		}
		function Modal(props) {
			return h("div", { className: "skm-modal", onMouseDown: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
				h("div", { className: "skm-modal-card" },
					h("div", { className: "skm-modal-head" }, h("span", null, props.title),
						Btn({ sm: true, onClick: props.onClose }, "✕")),
					h("div", { className: "skm-modal-body" }, props.children),
					props.footer ? h("div", { className: "skm-modal-foot" }, props.footer) : null));
		}
		function Banner(props) {
			if (!props.text) return null;
			return h("div", { className: "skm-banner skm-" + (props.kind || "err") }, props.text);
		}
		function Badge(props) {
			var t = props.t;
			return h("span", { className: "skm-badge" + (props.scope === "project" ? " skm-proj" : "") },
				props.scope === "project" ? t("badge.project") : t("badge.global"));
		}
		function Switch(props) {
			var t = props.t;
			var on = !!props.on;
			return Btn({ sm: true, className: on ? "skm-switch skm-on" : "skm-switch", title: on ? t("switch.disableHint") : t("switch.enableHint"), onClick: props.onToggle },
				on ? t("switch.on") : t("switch.off"));
		}

		// ── host API seam ────────────────────────────────────────────────────────
		// The client Remote surface is descriptor-driven: the host gateway is
		// discovered on the host by reflection, but the browser half must mount an
		// explicit contribution (the same way dsh-api-remotes mounts its generated
		// descriptors). Strict codecs require `codec.schema.parse`; a passthrough
		// schema keeps every method a plain-JSON seam without a zod dependency.
		var REMOTE_METHODS = ["list", "getSkill", "createSkill", "updateSkill", "removeSkill", "toggleSkill", "getMcp", "upsertMcp", "removeMcp", "toggleMcp", "discover", "importItems", "projectInfo", "getState", "setState", "pickProjectFolder", "listDirectory", "createDirectory", "listPlugins", "setPluginEnabled", "removePlugin", "discoverPlugins", "curatedPlugins", "installPlugin", "checkPluginUpdates", "updatePluginItem", "checkUpdates", "updatePlugin"];
		function passthroughCodec(typeSymbol) {
			return { mode: "strict", typeSymbol: typeSymbol, schema: { parse: function (v) { return v; } } };
		}
		function makeRemoteContribution() {
			var descriptors = [];
			for (var i = 0; i < REMOTE_METHODS.length; i++) {
				descriptors.push({
					id: "dsh-extension-hub#extensionHub/" + REMOTE_METHODS[i],
					service: "extensionHub",
					namespace: "extensionHub",
					method: REMOTE_METHODS[i],
					invocation: { kind: "direct" },
					parameters: [{ name: "input", wire: "input", source: "json", codec: passthroughCodec("dsh-extension-hub/types#Input") }],
					result: passthroughCodec("dsh-extension-hub/types#Result"),
				});
			}
			return { package: "dsh-extension-hub", descriptors: descriptors };
		}
		var REMOTE_CONTRIBUTION = makeRemoteContribution();

		var ctxRef = null;
		var tRef = null;
		// The mounted RemoteNamespaceService for `extensionHub`, resolved in
		// apply() right after $mount. It is created by this plugin's own $mount,
		// so it can never be a static inject dependency (that would deadlock);
		// ctx.reflect.get reads the service store without the inject requirement.
		var apiRef = null;
		// Retry transport-level failures: right after a dsh web start the host's
		// typert claims table can be briefly empty (404 on /api/<ns>/<method>),
		// which the extension-hub host plugin actively forces to refresh. Retry
		// with growing intervals to ride past that startup window.
		var RETRY_DELAYS = [1500, 3000, 6000, 12000, 20000, 30000];
		async function callWithRetry(method, input, attempt) {
			try {
				var res = await apiRef[method](input || {});
				if (res && res.ok === false) {
					var err = new Error((res.error && res.error.message) || "RPC failed: " + method);
					throw err;
				}
				if (res && res.ok === true) return res.value;
				return res && res.result !== undefined ? res.result : res;
			} catch (error) {
				if (attempt < RETRY_DELAYS.length) {
					await new Promise(function (resolve) { setTimeout(resolve, RETRY_DELAYS[attempt]); });
					return callWithRetry(method, input, attempt + 1);
				}
				throw error;
			}
		}
		function call(method, input) {
			return callWithRetry(method, input, 0);
		}
		function errText(e) {
			if (!e) return (tRef || function (k) { return k; })("error.unknown");
			if (e && e.error && e.error.message) return e.error.message;
			return e.message || String(e);
		}

		// ── shared folder state ──────────────────────────────────────────────────
		function useFolder() {
			var state = React.useState(null);
			var folder = state[0];
			var setFolder = state[1];
			React.useEffect(function () {
				var alive = true;
				call("getState", {}).then(function (s) {
					if (alive && s && s.projectFolder) setFolder(s.projectFolder);
				}).catch(function () {});
				return function () { alive = false; };
			}, []);
			var saveFolder = React.useCallback(function (path) {
				setFolder(path);
				return call("setState", { patch: { projectFolder: path } }).catch(function () {});
			}, []);
			return { folder: folder, setFolder: setFolder, saveFolder: saveFolder };
		}

		// FolderBar: current project folder + host picker entry. Native capability
		// returns a path directly; browse opens an in-app directory browser.
		function FolderBar(props) {
			var t = props.t;
			var browsingState = React.useState(false);
			var browsing = browsingState[0];
			var setBrowsing = browsingState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var errorState = React.useState("");
			var error = errorState[0];
			var setError = errorState[1];
			var pick = function () {
				setBusy(true);
				setError("");
				call("pickProjectFolder", {}).then(function (res) {
					if (!res) return;
					if (res.capability === "native" && res.path) props.onPicked(res.path);
					else if (res.capability === "browse") setBrowsing(true);
					else if (res.capability === "none") setError(t("folder.unsupported"));
				}).catch(function (e) { setError(t("folder.pickFailed") + errText(e)); }).finally(function () { setBusy(false); });
			};
			return h("div", { className: "skm-toolbar" },
				h("span", { className: "skm-hint" }, t("folder.label")),
				props.folder ? h("span", { className: "skm-folder", title: props.folder }, props.folder)
					: h("span", { className: "skm-hint" }, t("folder.unset")),
				Btn({ sm: true, disabled: busy, onClick: pick }, t("folder.pick")),
				error ? h("span", { className: "skm-banner skm-err", style: { maxWidth: 420 } }, error) : null,
				browsing ? h(DirBrowser, {
					t: t,
					onPick: function (path) { setBrowsing(false); props.onPicked(path); },
					onClose: function () { setBrowsing(false); },
				}) : null);
		}

		function DirBrowser(props) {
			var t = props.t;
			var listingState = React.useState(null);
			var listing = listingState[0];
			var setListing = listingState[1];
			var pathState = React.useState(null);
			var path = pathState[0];
			var setPath = pathState[1];
			var errorState = React.useState("");
			var error = errorState[0];
			var setError = errorState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var newNameState = React.useState("");
			var newName = newNameState[0];
			var setNewName = newNameState[1];
			var load = React.useCallback(function (p) {
				setBusy(true);
				setError("");
				call("listDirectory", { path: p || null }).then(function (l) {
					setListing(l);
					setPath(l && l.path ? l.path : p);
				}).catch(function (e) {
					setError(errText(e));
				}).finally(function () { setBusy(false); });
			}, []);
			React.useEffect(function () { load(null); }, [load]);
			var mkdir = function () {
				var name = newName.trim();
				if (!name) return;
				setBusy(true);
				call("createDirectory", { path: path, name: name }).then(function () {
					setNewName("");
					load(path);
				}).catch(function (e) { setError(errText(e)); }).finally(function () { setBusy(false); });
			};
			var entries = (listing && listing.entries) || [];
			return h("div", { className: "skm-modal" },
				h("div", { className: "skm-modal-card" },
					h("div", { className: "skm-modal-head" }, h("span", null, t("folder.pickTitle")),
						Btn({ sm: true, onClick: props.onClose }, "✕")),
					h("div", { className: "skm-modal-body" },
						h(Banner, { text: error }),
						listing ? h("div", { className: "skm-dir-crumb" },
							(listing.crumbs || []).map(function (c) {
								return h("span", { key: c.path },
									h("button", { type: "button", onClick: function () { load(c.path); } }, c.name),
									" / ");
							})) : null,
						h("div", { className: "skm-list", style: { maxHeight: "40vh" } },
							entries.map(function (e) {
								return h("div", { key: e.path, className: "skm-dir", title: e.path, onClick: function () { load(e.path); } },
									h("span", null, "\u{1F4C1}"),
									h("span", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, e.name));
							}),
							entries.length === 0 ? h("div", { className: "skm-empty" }, busy ? t("loading") : t("folder.empty")) : null),
						h("div", { className: "skm-toolbar", style: { marginTop: 10 } },
							h("input", { className: "skm-input", style: { flex: 1 }, placeholder: t("folder.newSub"), value: newName, onChange: function (e) { setNewName(e.target.value); }, onKeyDown: function (e) { if (e.key === "Enter") mkdir(); } }),
							Btn({ sm: true, onClick: mkdir, disabled: busy }, t("folder.new"))),
						h("div", { className: "skm-toolbar", style: { marginTop: 12, justifyContent: "flex-end" } },
							Btn({ kind: "primary", disabled: busy || !path, onClick: function () { props.onPick(path); } }, t("folder.select"))))));
		}

		// ── Skills tab ───────────────────────────────────────────────────────────
		function SkillsTab(props) {
			var t = props.t;
			var scope = props.scope;
			var setScope = props.setScope;
			var folder = props.folder;
			var saveFolder = props.saveFolder;
			var dataState = React.useState(null);
			var data = dataState[0];
			var setData = dataState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var errorState = React.useState("");
			var error = errorState[0];
			var setError = errorState[1];
			var noticeState = React.useState("");
			var notice = noticeState[0];
			var setNotice = noticeState[1];
			var formState = React.useState(null);
			var form = formState[0];
			var setForm = formState[1];
			var importOpenState = React.useState(false);
			var importOpen = importOpenState[0];
			var setImportOpen = importOpenState[1];
			var refresh = React.useCallback(function () {
				setBusy(true);
				setError("");
				call("list", { kind: "skills" }).then(function (r) {
					setData(r.skills || []);
				}).catch(function (e) { setError(errText(e)); }).finally(function () { setBusy(false); });
			}, []);
			React.useEffect(function () { refresh(); }, [refresh]);
			var act = function (label, fn) {
				setBusy(true);
				setError("");
				setNotice("");
				fn().then(function () { setNotice(label + t("notice.success")); refresh(); })
					.catch(function (e) { setError(label + t("notice.failed") + errText(e)); })
					.finally(function () { setBusy(false); });
			};
			var rows = data || [];
			return h("div", { className: "skm-wrap" },
				h(Banner, { text: error }),
				h(Banner, { kind: "ok", text: notice }),
				h("div", { className: "skm-toolbar" },
					h("select", { className: "skm-select", style: { width: "auto" }, value: scope, onChange: function (e) { setScope(e.target.value); } },
						h("option", { value: "project" }, t("scope.createProject")),
						h("option", { value: "global" }, t("scope.createGlobal"))),
					scope === "project" ? h(FolderBar, { t: t, folder: folder, onPicked: saveFolder }) : null,
					h("div", { className: "skm-spacer" }),
					Btn({ disabled: busy, onClick: function () { setImportOpen(true); } }, t("import.from")),
					Btn({ kind: "primary", disabled: busy, onClick: function () { setForm({ mode: "create" }); } }, t("newSkill"))),
				h("div", { className: "skm-list" },
					rows.map(function (s) {
						return h("div", { key: s.scope + "/" + s.name, className: "skm-item" },
							h("div", { className: "skm-item-main" },
								h("div", { className: "skm-item-title" }, h("span", null, s.name), h(Badge, { t: t, scope: s.scope }),
									s.readOnly ? h("span", { className: "skm-badge", title: t("readonlyHint", { source: s.source }) }, t("badge.readonly")) : null),
								h("div", { className: "skm-item-desc" }, s.description || t("descNone"))),
							s.readOnly ? null : h(Switch, { t: t, on: s.enabled, onToggle: function () { act(t(s.enabled ? "switch.disableHint" : "switch.enableHint"), function () { return call("toggleSkill", { name: s.name, disabled: s.enabled, scope: s.scope }); }); } }),
							s.readOnly ? null : Btn({ sm: true, onClick: function () {
								call("getSkill", { name: s.name, scope: s.scope }).then(function (full) {
									setForm({ mode: "edit", skill: full || s });
								}).catch(function (e) { setError(errText(e)); });
							} }, t("edit")),
							s.readOnly ? null : Btn({ sm: true, kind: "danger", onClick: function () {
								if (window.confirm(t("confirm.deleteSkill", { name: s.name, scope: s.scope }))) act(t("delete"), function () { return call("removeSkill", { name: s.name, scope: s.scope }); });
							} }, t("delete")));
					}),
					rows.length === 0 ? h("div", { className: "skm-empty" }, busy ? t("loading") : t("empty.skills")) : null),
				form ? h(SkillForm, {
					t: t,
					skill: form.mode === "edit" ? form.skill : null,
					scope: scope,
					folder: folder,
					onClose: function () { setForm(null); },
					onSaved: function () { setForm(null); setNotice(t("notice.saved")); refresh(); },
				}) : null,
				importOpen ? h(Modal, {
					title: t("import.title"),
					onClose: function () { setImportOpen(false); },
				}, h(ImportPanel, {
					t: t,
					kind: "skills",
					scope: scope,
					setScope: setScope,
					folder: folder,
					saveFolder: saveFolder,
				})) : null);
		}

		function SkillForm(props) {
			var t = props.t;
			var editing = !!props.skill;
			var initial = props.skill || {};
			var nameState = React.useState(initial.name || "");
			var name = nameState[0];
			var setName = nameState[1];
			var descriptionState = React.useState(initial.description || "");
			var description = descriptionState[0];
			var setDescription = descriptionState[1];
			var whenToUseState = React.useState(initial.whenToUse || "");
			var whenToUse = whenToUseState[0];
			var setWhenToUse = whenToUseState[1];
			var licenseState = React.useState(initial.license || "");
			var license = licenseState[0];
			var setLicense = licenseState[1];
			var userInvocableState = React.useState(initial.userInvocable !== false);
			var userInvocable = userInvocableState[0];
			var setUserInvocable = userInvocableState[1];
			var bodyState = React.useState(initial.body || "");
			var body = bodyState[0];
			var setBody = bodyState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var errorState = React.useState("");
			var error = errorState[0];
			var setError = errorState[1];
			var save = function () {
				var trimmed = name.trim();
				if (!trimmed) { setError(t("error.nameRequired")); return; }
				setBusy(true);
				setError("");
				var input = {
					scope: props.scope,
					folder: props.folder || undefined,
					name: trimmed,
					description: description,
					whenToUse: whenToUse,
					license: license,
					userInvocable: userInvocable,
					body: body,
				};
				var p = editing
					? call("updateSkill", Object.assign({ newName: trimmed !== initial.name ? trimmed : undefined }, input))
					: call("createSkill", input);
				p.then(function () { props.onSaved(); })
					.catch(function (e) { setError(errText(e)); setBusy(false); });
			};
			return h(Modal, {
				title: editing ? t("form.skillTitleEdit", { name: initial.name }) : t("form.skillTitleNew"),
				onClose: props.onClose,
				footer: [
					Btn({ onClick: props.onClose }, t("cancel")),
					Btn({ kind: "primary", disabled: busy, onClick: save }, t("save")),
				],
			},
				h(Banner, { text: error }),
				h(Field, { label: t("form.name") },
					h("input", { className: "skm-input", value: name, onChange: function (e) { setName(e.target.value); } })),
				h(Field, { label: t("form.description") },
					h("input", { className: "skm-input", value: description, onChange: function (e) { setDescription(e.target.value); } })),
				h(Field, { label: t("form.whenToUse") },
					h("input", { className: "skm-input", value: whenToUse, onChange: function (e) { setWhenToUse(e.target.value); } })),
				h(Field, { label: t("form.license") },
					h("input", { className: "skm-input", value: license, onChange: function (e) { setLicense(e.target.value); } })),
				h("div", { className: "skm-row", style: { marginBottom: 10 } },
					h("input", { id: "skm-user-invocable", type: "checkbox", checked: userInvocable, onChange: function (e) { setUserInvocable(e.target.checked); } }),
					h("label", { htmlFor: "skm-user-invocable", style: { fontSize: 13 } }, t("form.userInvocable"))),
				h(Field, { label: t("form.body"), hint: t("form.bodyHint") },
					h("textarea", { className: "skm-textarea", value: body, onChange: function (e) { setBody(e.target.value); } })));
		}

		// ── MCP tab ──────────────────────────────────────────────────────────────
		function McpTab(props) {
			var t = props.t;
			var scope = props.scope;
			var setScope = props.setScope;
			var folder = props.folder;
			var saveFolder = props.saveFolder;
			var dataState = React.useState(null);
			var data = dataState[0];
			var setData = dataState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var errorState = React.useState("");
			var error = errorState[0];
			var setError = errorState[1];
			var noticeState = React.useState("");
			var notice = noticeState[0];
			var setNotice = noticeState[1];
			var formState = React.useState(null);
			var form = formState[0];
			var setForm = formState[1];
			var importOpenState = React.useState(false);
			var importOpen = importOpenState[0];
			var setImportOpen = importOpenState[1];
			var refresh = React.useCallback(function () {
				setBusy(true);
				setError("");
				call("list", { kind: "mcp" }).then(function (r) {
					setData(r.mcp || []);
				}).catch(function (e) { setError(errText(e)); }).finally(function () { setBusy(false); });
			}, []);
			React.useEffect(function () { refresh(); }, [refresh]);
			var act = function (label, fn) {
				setBusy(true);
				setError("");
				setNotice("");
				fn().then(function () { setNotice(label + t("notice.success")); refresh(); })
					.catch(function (e) { setError(label + t("notice.failed") + errText(e)); })
					.finally(function () { setBusy(false); });
			};
			var rows = data || [];
			var projFolder = function () { return folder || undefined; };
			return h("div", { className: "skm-wrap" },
				h(Banner, { text: error }),
				h(Banner, { kind: "ok", text: notice }),
				h("div", { className: "skm-toolbar" },
					h("select", { className: "skm-select", style: { width: "auto" }, value: scope, onChange: function (e) { setScope(e.target.value); } },
						h("option", { value: "project" }, t("scope.createProject")),
						h("option", { value: "global" }, t("scope.createGlobal"))),
					scope === "project" ? h(FolderBar, { t: t, folder: folder, onPicked: saveFolder }) : null,
					h("div", { className: "skm-spacer" }),
					Btn({ disabled: busy, onClick: function () { setImportOpen(true); } }, t("import.from")),
					Btn({ kind: "primary", disabled: busy, onClick: function () { setForm({ mode: "create" }); } }, t("newServer"))),
				h("div", { className: "skm-list" },
					rows.map(function (m) {
						return h("div", { key: m.scope + "/" + m.id, className: "skm-item" },
							h("div", { className: "skm-item-main" },
								h("div", { className: "skm-item-title" }, h("span", null, m.serverName || m.id), h(Badge, { t: t, scope: m.scope }),
									h("span", { className: "skm-badge" }, m.transport === "streamable-http" ? "HTTP" : "stdio"),
									m.source === "manifest" ? h("span", { className: "skm-badge" }, t("badge.manifest")) : null),
								h("div", { className: "skm-item-desc" }, m.id)),
							h(Switch, { t: t, on: m.enabled, onToggle: function () { act(t(m.enabled ? "switch.disableHint" : "switch.enableHint"), function () { return call("toggleMcp", { id: m.id, disabled: m.enabled, scope: m.scope, folder: m.scope === "project" ? projFolder() : undefined }); }); } }),
							Btn({ sm: true, onClick: function () {
								call("getMcp", { id: m.id, scope: m.scope, folder: m.scope === "project" ? projFolder() : undefined }).then(function (full) {
									setForm({ mode: "edit", mcp: full || m });
								}).catch(function (e) { setError(errText(e)); });
							} }, t("edit")),
							Btn({ sm: true, kind: "danger", onClick: function () {
								var extra = m.scope === "global" ? t("confirm.mcpGlobalNote") : t("confirm.mcpProjectNote");
								if (window.confirm(t("confirm.deleteMcp", { name: m.serverName || m.id, scope: m.scope, extra: extra }))) act(t("delete"), function () { return call("removeMcp", { id: m.id, scope: m.scope, folder: m.scope === "project" ? projFolder() : undefined }); });
							} }, t("delete")));
					}),
					rows.length === 0 ? h("div", { className: "skm-empty" }, busy ? t("loading") : t("empty.mcp")) : null),
				form ? h(McpForm, {
					t: t,
					mcp: form.mode === "edit" ? form.mcp : null,
					scope: scope,
					folder: folder,
					onClose: function () { setForm(null); },
					onSaved: function () { setForm(null); setNotice(t("notice.saved")); refresh(); },
				}) : null,
				importOpen ? h(Modal, {
					title: t("import.title"),
					onClose: function () { setImportOpen(false); },
				}, h(ImportPanel, {
					t: t,
					kind: "mcp",
					scope: scope,
					setScope: setScope,
					folder: folder,
					saveFolder: saveFolder,
				})) : null);
		}

		function McpForm(props) {
			var t = props.t;
			var editing = !!props.mcp;
			var initial = props.mcp || {};
			var cfg = initial.config || {};
			var serverNameState = React.useState(cfg.serverName || "");
			var serverName = serverNameState[0];
			var setServerName = serverNameState[1];
			var transportState = React.useState(cfg.transport === "streamable-http" ? "streamable-http" : "stdio");
			var transport = transportState[0];
			var setTransport = transportState[1];
			var commandState = React.useState(cfg.command || "");
			var command = commandState[0];
			var setCommand = commandState[1];
			var argsState = React.useState(Array.isArray(cfg.args) ? cfg.args.join("\n") : "");
			var args = argsState[0];
			var setArgs = argsState[1];
			var envState = React.useState(Object.keys(cfg.env || {}).length ? Object.keys(cfg.env).map(function (k) { return k + "=" + cfg.env[k]; }).join("\n") : "");
			var env = envState[0];
			var setEnv = envState[1];
			var urlState = React.useState(cfg.url || "");
			var url = urlState[0];
			var setUrl = urlState[1];
			var headersState = React.useState(Object.keys(cfg.headers || {}).length ? Object.keys(cfg.headers).map(function (k) { return k + ": " + cfg.headers[k]; }).join("\n") : "");
			var headers = headersState[0];
			var setHeaders = headersState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var errorState = React.useState("");
			var error = errorState[0];
			var setError = errorState[1];
			var parseLines = function (text) {
				return text.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
			};
			var parsePairs = function (text, sep) {
				var out = {};
				for (var i = 0; i < parseLines(text).length; i++) {
					var line = parseLines(text)[i];
					var idx = line.indexOf(sep);
					if (idx === -1) continue;
					out[line.slice(0, idx).trim()] = line.slice(idx + sep.length).trim();
				}
				return out;
			};
			var save = function () {
				if (!serverName.trim() && !editing) { setError(t("error.serverNameRequired")); return; }
				setBusy(true);
				setError("");
				var input = {
					scope: props.scope,
					folder: props.folder || undefined,
					id: editing ? initial.id : undefined,
					serverName: serverName.trim() || undefined,
					transport: transport,
				};
				if (transport === "streamable-http") {
					input.url = url.trim();
					var hp = parsePairs(headers, ":");
					if (Object.keys(hp).length) input.headers = hp;
				} else {
					input.command = command.trim();
					var al = parseLines(args);
					if (al.length) input.args = al;
					var ep = parsePairs(env, "=");
					if (Object.keys(ep).length) input.env = ep;
				}
				call("upsertMcp", input)
					.then(function () { props.onSaved(); })
					.catch(function (e) { setError(errText(e)); setBusy(false); });
			};
			return h(Modal, {
				title: editing ? t("form.mcpTitleEdit", { name: initial.serverName || initial.id }) : t("form.mcpTitleNew"),
				onClose: props.onClose,
				footer: [
					Btn({ onClick: props.onClose }, t("cancel")),
					Btn({ kind: "primary", disabled: busy, onClick: save }, t("save")),
				],
			},
				h(Banner, { text: error }),
				h(Field, { label: t("form.serverName") },
					h("input", { className: "skm-input", value: serverName, onChange: function (e) { setServerName(e.target.value); } })),
				h(Field, { label: t("form.transport") },
					h("select", { className: "skm-select", value: transport, onChange: function (e) { setTransport(e.target.value); } },
						h("option", { value: "stdio" }, t("form.stdio")),
						h("option", { value: "streamable-http" }, t("form.http")))),
				transport === "streamable-http" ? [
					h(Field, { key: "url", label: t("form.url") },
						h("input", { className: "skm-input", value: url, placeholder: "https://…", onChange: function (e) { setUrl(e.target.value); } })),
					h(Field, { key: "headers", label: t("form.headers"), hint: t("form.headersHint") },
						h("textarea", { className: "skm-textarea", style: { minHeight: 70 }, value: headers, onChange: function (e) { setHeaders(e.target.value); } })),
				] : [
					h(Field, { key: "command", label: t("form.command") },
						h("input", { className: "skm-input", value: command, placeholder: "npx", onChange: function (e) { setCommand(e.target.value); } })),
					h(Field, { key: "args", label: t("form.args"), hint: t("form.argsHint") },
						h("textarea", { className: "skm-textarea", style: { minHeight: 70 }, value: args, onChange: function (e) { setArgs(e.target.value); } })),
					h(Field, { key: "env", label: t("form.env"), hint: t("form.envHint") },
						h("textarea", { className: "skm-textarea", style: { minHeight: 70 }, value: env, onChange: function (e) { setEnv(e.target.value); } })),
				]);
		}

		// ── Plugins tab ─────────────────────────────────────────────────────────
		// Enumerates every Loader plugin entry (listPlugins), splits them into
		// official vs other, filters by the search box, and shows a per-plugin
		// detail block on click. Groups collapse; the official group starts
		// collapsed, the other group starts open.
		function phaseLabel(t, phase) {
			if (!phase) return t("plugins.unknownPhase");
			if (phase === "active") return t("plugins.enabled");
			if (phase === "failed") return t("plugins.failed");
			if (phase === "loading") return t("plugins.loading");
			if (phase === "pending") return t("plugins.pending");
			if (phase === "unloading") return t("plugins.unloading");
			return t("plugins.unknownPhase");
		}
		function dotClass(phase, enabled) {
			if (phase === "failed") return "skm-dot skm-err";
			if (enabled && phase === "active") return "skm-dot skm-on";
			return "skm-dot skm-off";
		}
		function PluginsTab(props) {
			var t = props.t;
			var listState = React.useState(null);
			var plugins = listState[0];
			var setPlugins = listState[1];
			var errorState = React.useState("");
			var error = errorState[0];
			var setError = errorState[1];
			var searchState = React.useState("");
			var search = searchState[0];
			var setSearch = searchState[1];
			var collapsedState = React.useState({ official: true, other: false });
			var collapsed = collapsedState[0];
			var setCollapsed = collapsedState[1];
			var selectedState = React.useState(null);
			var selected = selectedState[0];
			var setSelected = selectedState[1];
			var actionState = React.useState(null);
			var action = actionState[0];
			var setAction = actionState[1];
			var confirmState = React.useState(null);
			var confirm = confirmState[0];
			var setConfirm = confirmState[1];
			var opState = React.useState(null);
			var opMsg = opState[0];
			var setOpMsg = opState[1];
			var updatesState = React.useState({});
			var updates = updatesState[0];
			var setUpdates = updatesState[1];
			var checkingState = React.useState(false);
			var checking = checkingState[0];
			var setChecking = checkingState[1];
			var updatingState = React.useState(null);
			var updating = updatingState[0];
			var setUpdating = updatingState[1];
			var reload = function () {
				call("listPlugins", {}).then(function (r) {
					if (r && Array.isArray(r.plugins)) setPlugins(r.plugins);
				}).catch(function () {});
			};
			var runCheck = function () {
				setChecking(true);
				setOpMsg(null);
				call("checkPluginUpdates", {}).then(function (r) {
					var map = {};
					var count = 0;
					if (r && Array.isArray(r.plugins)) {
						for (var i = 0; i < r.plugins.length; i++) {
							map[r.plugins[i].name] = r.plugins[i];
							if (r.plugins[i].updateable) count++;
						}
					}
					setUpdates(map);
					if (count > 0) setOpMsg({ kind: "ok", text: t("plugins.checkResult", { n: String(count) }) });
					else setOpMsg({ kind: "ok", text: t("plugins.upToDate") });
				}).catch(function (e) {
					setOpMsg({ kind: "err", text: t("plugins.checkFailed") + errText(e) });
				}).finally(function () { setChecking(false); });
			};
			var runUpdate = function (name) {
				setUpdating(name);
				setOpMsg(null);
				call("updatePluginItem", { name: name }).then(function (r) {
					if (r && r.ok === false) {
						setOpMsg({ kind: "err", text: t("plugins.updateFailed") + (r.message || "") });
					} else if (r && r.ok === true) {
						setOpMsg({ kind: "ok", text: t("plugins.updateDone", { name: name }) });
						var next = Object.assign({}, updates);
						delete next[name];
						setUpdates(next);
					} else {
						setOpMsg({ kind: "err", text: t("plugins.updateFailed") });
					}
				}).catch(function (e) {
					setOpMsg({ kind: "err", text: t("plugins.updateFailed") + errText(e) });
				}).finally(function () { setUpdating(null); });
			};
			var runUpdateAll = function () {
				var names = Object.keys(updates).filter(function (n) { return updates[n].updateable; });
				var chain = Promise.resolve();
				names.forEach(function (name) {
					chain = chain.then(function () {
						return new Promise(function (resolve) {
							setUpdating(name);
							call("updatePluginItem", { name: name }).then(function (r) {
								if (r && r.ok === true) {
									var next = Object.assign({}, updates);
									delete next[name];
									setUpdates(next);
								}
							}).catch(function () {}).finally(function () {
								setUpdating(null);
								resolve();
							});
						});
					});
				});
				chain.then(function () {
					setOpMsg({ kind: "ok", text: t("plugins.pendingRestart") });
				});
			};
			var executeAction = function (type, plugin) {
				var id = String(plugin.entryId).replace(/^include:/, "");
				var req = type === "uninstall"
					? call("removePlugin", { id: id })
					: call("setPluginEnabled", { id: id, enabled: type === "enable" });
				req.then(function (r) {
					setAction(null);
					setConfirm(null);
					if (r && r.ok === false) {
						setOpMsg({ kind: "err", text: (r.message || t("plugins.opFailed")) });
					} else if (r && r.ok === true) {
						setOpMsg({ kind: "ok", text: t("plugins.pendingRestart") });
						reload();
					} else {
						setOpMsg({ kind: "err", text: t("plugins.opFailed") });
					}
				}).catch(function (e) {
					setAction(null);
					setConfirm(null);
					setOpMsg({ kind: "err", text: t("plugins.opFailed") + errText(e) });
				});
			};
			React.useEffect(function () {
				var alive = true;
				call("listPlugins", {}).then(function (r) {
					if (alive && r && Array.isArray(r.plugins)) setPlugins(r.plugins);
					else if (alive) setError(t("plugins.loadFailed") + "bad payload");
				}).catch(function (e) {
					if (alive) setError(t("plugins.loadFailed") + errText(e));
				});
				return function () { alive = false; };
			}, []);
			var q = search.trim().toLowerCase();
			var filtered = plugins ? plugins.filter(function (p) {
				if (!q) return true;
				return (String(p.name || "").toLowerCase().indexOf(q) >= 0) ||
					(String(p.description || "").toLowerCase().indexOf(q) >= 0) ||
					(String(p.entryId || "").toLowerCase().indexOf(q) >= 0);
			}) : [];
			var official = filtered.filter(function (p) { return p.official; });
			var other = filtered.filter(function (p) { return !p.official; });
			function renderGroup(key, label, items, openDefault, showUpdates) {
				var isOpen = collapsed[key] === undefined ? openDefault : !collapsed[key];
				return h("div", { key: key, style: { display: "flex", flexDirection: "column", gap: 6 } },
					h("div", { className: "skm-group-head", style: { cursor: "default" } },
						h("span", { style: { display: "inline-flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, cursor: "pointer" }, onClick: function () {
							var next = {};
							for (var k in collapsed) next[k] = collapsed[k];
							next[key] = !next[key];
							setCollapsed(next);
						} },
							h("span", { className: "skm-group-arrow" + (isOpen ? " skm-open" : "") }, "▶"),
							h("span", null, label),
							h("span", { className: "skm-group-count" }, String(items.length))),
						showUpdates ? h("div", { className: "skm-row", style: { gap: 6 } },
							Btn({ sm: true, disabled: checking || updating !== null, onClick: function () { runCheck(); } }, checking ? t("plugins.checking") : t("plugins.checkUpdates")),
							Object.keys(updates).some(function (n) { return updates[n].updateable; })
								? Btn({ sm: true, kind: "success", disabled: updating !== null, onClick: function () { runUpdateAll(); } }, t("plugins.updateAll"))
								: null) : null),
					isOpen ? h("div", { className: "skm-list" },
						items.map(function (p) {
							var isSelected = selected === p.entryId;
							var phase = p.enabled ? phaseLabel(t, p.phase) : t("plugins.disabled");
							var upd = showUpdates && updates[p.name] && updates[p.name].updateable ? updates[p.name] : null;
							return h("div", { key: p.entryId, className: "skm-plugin-row" + (isSelected ? " skm-selected" : ""), onClick: function () { setSelected(isSelected ? null : p.entryId); } },
								h("div", { className: "skm-row" },
									h("span", { className: dotClass(p.phase, p.enabled) }),
									h("span", { className: "skm-plugin-name" }, p.name || p.entryId),
									p.core ? h("span", { className: "skm-badge", style: { color: "#b4541c", background: "rgba(180,84,28,.1)" } }, t("plugins.core")) : null,
									upd ? h("span", { style: { display: "inline-flex", flex: "none" } },
										Btn({ sm: true, kind: "success", disabled: updating !== null, onClick: function (e) { e.stopPropagation(); runUpdate(p.name); } },
											updating === p.name ? t("plugins.updating") : t("plugins.updateable"))) : null,
									h("span", { className: "skm-badge" }, phase)),
								isSelected ? h("div", { className: "skm-plugin-detail" },
									p.description ? h("div", { className: "skm-plugin-detail-row" },
										h("b", null, t("form.description")),
										h("span", { className: "skm-desc" }, p.description)) : null,
									h("div", { className: "skm-plugin-detail-row" },
										h("b", null, t("plugins.source")),
										h("span", null, p.official ? t("plugins.source.official") : t("plugins.source.other"))),
									p.repository ? h("div", { className: "skm-plugin-detail-row" },
										h("b", null, t("plugins.repository")),
										h("a", { href: p.repository, target: "_blank", rel: "noopener noreferrer", style: { color: "var(--dsw-alias-accent,#3370ff)" } }, p.repository)) : null,
									h("div", { className: "skm-plugin-detail-row" },
										h("b", null, t("plugins.id")),
										h("span", null, p.entryId)),
									h("div", { className: "skm-plugin-detail-row" },
										h("b", null, t("plugins.module")),
										h("span", null, p.name || "")),
									upd ? h("div", { className: "skm-plugin-detail-row" },
										h("b", null, t("plugins.updateable")),
										h("span", null, upd.kind === "git" ? (upd.current + " → " + upd.latest) : (upd.current + " → " + upd.latest))) : null,
									h("div", { className: "skm-row", style: { marginTop: 4, gap: 8 } },
										p.core ? h("span", { className: "skm-hint" }, t("plugins.coreHint"))
											: [
												p.enabled
													? Btn({ sm: true, onClick: function (e) { e.stopPropagation(); setAction({ type: "disable", plugin: p }); } }, t("plugins.disable"))
													: Btn({ sm: true, kind: "success", onClick: function (e) { e.stopPropagation(); setAction({ type: "enable", plugin: p }); } }, t("plugins.enable")),
												p.official ? null
													: Btn({ sm: true, kind: "danger", onClick: function (e) { e.stopPropagation(); setAction({ type: "uninstall", plugin: p }); } }, t("plugins.uninstall")),
											])) : null);
						})) : null);
			}
			return h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
				h("input", { className: "skm-input", placeholder: t("plugins.search"), value: search, onChange: function (e) { setSearch(e.target.value); } }),
				error ? h(Banner, { text: error }) : null,
				opMsg ? h(Banner, { kind: opMsg.kind, text: opMsg.text }) : null,
				plugins === null ? h("div", { className: "skm-empty" }, t("loading")) :
					filtered.length === 0 ? h("div", { className: "skm-empty" }, t("plugins.empty")) :
					h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
						renderGroup("official", t("plugins.official"), official, false, false),
						renderGroup("other", t("plugins.other"), other, true, true)),
				action ? h(Modal, { title: t("plugins.confirmTitle"), onClose: function () { setAction(null); } },
					h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
						action.type === "enable"
							? h("div", null, t("plugins.confirmEnable", { name: action.plugin.name || "" }))
							: h("div", null, action.type === "uninstall" ? t("plugins.warn.uninstall") : t("plugins.warn.disable")),
						h("div", { className: "skm-hint" }, action.type === "uninstall" ? t("plugins.uninstallNote") : t("plugins.toggleNote")),
						h("div", { className: "skm-row", style: { justifyContent: "flex-end", gap: 8 } },
							Btn({ onClick: function () { setAction(null); } }, t("cancel")),
							Btn({ kind: action.type === "uninstall" ? "danger" : "primary", onClick: function () {
								if (action.type === "uninstall") {
									setConfirm(action);
									setAction(null);
								} else {
									executeAction(action.type, action.plugin);
								}
							} }, action.type === "uninstall" ? t("plugins.uninstall") : (action.type === "enable" ? t("plugins.enable") : t("plugins.disable")))))) : null,
				confirm ? h(Modal, { title: t("plugins.confirmUninstall"), onClose: function () { setConfirm(null); } },
					h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
						h("div", null, t("plugins.confirmUninstall")),
						h("div", { className: "skm-hint" }, confirm.plugin.name || ""),
						h("div", { className: "skm-row", style: { justifyContent: "flex-end", gap: 8 } },
							Btn({ onClick: function () { setConfirm(null); } }, t("cancel")),
							Btn({ kind: "danger", onClick: function () { executeAction("uninstall", confirm.plugin); } }, t("plugins.uninstall"))))) : null);
		}

		// ── Discover tab (curated catalog + GitHub search sub-views) ─────────────
		function DiscoverTab(props) {
			var t = props.t;
			var viewState = React.useState("curated");
			var view = viewState[0];
			var setView = viewState[1];
			return h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
				h("div", { className: "skm-row", style: { gap: 6 } },
					h("button", { type: "button", className: "skm-tab" + (view === "curated" ? " skm-active" : ""), onClick: function () { setView("curated"); } }, t("tab.curated")),
					h("button", { type: "button", className: "skm-tab" + (view === "search" ? " skm-active" : ""), onClick: function () { setView("search"); } }, t("tab.discover"))),
				view === "curated" ? h(CuratedTab, { t: t }) : h(DiscoverSearchTab, { t: t }));
		}

		// GitHub dsh-plugin search + install (sub-view of Discover).
		function DiscoverSearchTab(props) {
			var t = props.t;
			var queryState = React.useState("");
			var query = queryState[0];
			var setQuery = queryState[1];
			var reposState = React.useState(null);
			var repos = reposState[0];
			var setRepos = reposState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var errorState = React.useState("");
			var error = errorState[0];
			var setError = errorState[1];
			var detailState = React.useState(null);
			var detail = detailState[0];
			var setDetail = detailState[1];
			var confirmState = React.useState(null);
			var confirm = confirmState[0];
			var setConfirm = confirmState[1];
			var installingState = React.useState(false);
			var installing = installingState[0];
			var setInstalling = installingState[1];
			var stageState = React.useState("clone");
			var stage = stageState[0];
			var setStage = stageState[1];
			var msgState = React.useState(null);
			var msg = msgState[0];
			var setMsg = msgState[1];
			var pageState = React.useState(1);
			var page = pageState[0];
			var setPage = pageState[1];
			var hasMoreState = React.useState(false);
			var hasMore = hasMoreState[0];
			var setHasMore = hasMoreState[1];
			var load = function (q, pageNum) {
				var p = pageNum || 1;
				setBusy(true);
				setError("");
				if (p === 1) setRepos(null);
				call("discoverPlugins", { query: q || "", page: p }).then(function (r) {
					if (r && r.ok === false) {
						setError(t("discover.failed") + (r.message || ""));
						if (p === 1) setRepos([]);
					} else if (r && Array.isArray(r.repos)) {
						setRepos(p === 1 ? r.repos : (repos || []).concat(r.repos));
						setPage(p);
						setHasMore(!!r.hasMore);
					} else {
						setError(t("discover.failed") + "bad payload");
						if (p === 1) setRepos([]);
					}
				}).catch(function (e) {
					setError(t("discover.failed") + errText(e));
					if (p === 1) setRepos([]);
				}).finally(function () { setBusy(false); });
			};
			React.useEffect(function () {
				load("", 1);
			}, []);
			var runInstall = function (repo) {
				setInstalling(true);
				setStage("clone");
				// Move to the verify stage after a few seconds so the user can
				// tell cloning is still progressing.
				var timer = setTimeout(function () { setStage("verify"); }, 4000);
				call("installPlugin", { repo: repo.fullName }).then(function (r) {
					clearTimeout(timer);
					setConfirm(null);
					setInstalling(false);
					if (r && r.ok === false) {
						if (r.code === "network") setMsg({ kind: "err", text: t("discover.fail.network") });
						else if (r.code === "invalid") setMsg({ kind: "err", text: t("discover.fail.invalid") });
						else setMsg({ kind: "err", text: t("discover.installFailed") + (r.message || "") });
					} else if (r && r.ok === true) {
						setMsg({ kind: "ok", text: t("discover.installDone") });
						var updated = repos.map(function (x) { return x.fullName === repo.fullName ? Object.assign({}, x, { installed: true }) : x; });
						setRepos(updated);
						if (detail) setDetail(Object.assign({}, detail, { installed: true }));
					} else {
						setMsg({ kind: "err", text: t("discover.installFailed") });
					}
				}).catch(function (e) {
					clearTimeout(timer);
					setConfirm(null);
					setInstalling(false);
					setMsg({ kind: "err", text: t("discover.installFailed") + errText(e) });
				});
			};
			var search = function () {
				load(query.trim(), 1);
			};
			return h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
				h("div", { className: "skm-row", style: { gap: 8 } },
					h("input", { className: "skm-input", style: { flex: 1 }, placeholder: t("discover.search"), value: query, onChange: function (e) { setQuery(e.target.value); }, onKeyDown: function (e) { if (e.key === "Enter") search(); } }),
					Btn({ disabled: busy, onClick: search }, t("discover.searchBtn"))),
				error ? h(Banner, { text: error }) : null,
				msg ? h(Banner, { kind: msg.kind, text: msg.text }) : null,
				repos === null ? h("div", { className: "skm-empty" }, t("discover.loading")) :
					repos.length === 0 ? h("div", { className: "skm-empty" }, t("discover.empty")) :
					h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
						h("div", { className: "skm-list" },
							repos.map(function (x) {
								return h("div", { key: x.id, className: "skm-plugin-row", onClick: function () { setDetail(x); } },
									h("div", { className: "skm-row" },
										h("span", { className: "skm-plugin-name" }, x.fullName),
										h("span", { className: "skm-badge" }, "⭐ " + String(x.stars || 0)),
										x.installed ? h("span", { className: "skm-badge", style: { color: "#12965b", background: "rgba(18,150,91,.1)" } }, t("discover.installed")) : null),
									x.description ? h("div", { className: "skm-item-desc" }, x.description) : null);
							})),
						hasMore ? h("div", { style: { display: "flex", justifyContent: "center" } },
							Btn({ disabled: busy, onClick: function () { load(query.trim(), page + 1); } }, busy ? t("discover.loading") : t("discover.loadMore"))) : null),
				detail ? h(Modal, { title: detail.fullName, onClose: function () { setDetail(null); } },
					h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
						detail.description ? h("div", { className: "skm-desc" }, detail.description) : null,
						h("div", { className: "skm-plugin-detail", style: { padding: 0 } },
							h("div", { className: "skm-plugin-detail-row" },
								h("b", null, t("discover.stars")),
								h("span", null, "⭐ " + String(detail.stars || 0))),
							detail.language ? h("div", { className: "skm-plugin-detail-row" },
								h("b", null, t("discover.language")),
								h("span", null, detail.language)) : null,
							detail.updatedAt ? h("div", { className: "skm-plugin-detail-row" },
								h("b", null, t("discover.updated")),
								h("span", null, String(detail.updatedAt).slice(0, 10))) : null,
							detail.htmlUrl ? h("div", { className: "skm-plugin-detail-row" },
								h("b", null, t("discover.repository")),
								h("a", { href: detail.htmlUrl, target: "_blank", rel: "noopener noreferrer", style: { color: "var(--dsw-alias-accent,#3370ff)" } }, detail.htmlUrl)) : null),
						h("div", { className: "skm-row", style: { gap: 8 } },
							detail.installed
								? h("span", { className: "skm-badge", style: { color: "#12965b", background: "rgba(18,150,91,.1)" } }, t("discover.installed"))
								: Btn({ kind: "primary", onClick: function () { setConfirm(detail); } }, t("discover.install"))))) : null,
				confirm ? h(Modal, { title: t("discover.installTitle"), onClose: installing ? null : function () { setConfirm(null); } },
					h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
						installing
							? h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
								h("div", null, stage === "clone" ? t("discover.installingClone") : t("discover.installingVerify")),
								h("div", { className: "skm-hint" }, t("discover.installNote")))
							: [
								h("div", null, t("discover.installWarn", { repo: confirm.fullName })),
								h("div", { className: "skm-hint" }, t("discover.installNote")),
								h("div", { className: "skm-row", style: { justifyContent: "flex-end", gap: 8 } },
									Btn({ onClick: function () { setConfirm(null); } }, t("cancel")),
									Btn({ kind: "primary", onClick: function () { runInstall(confirm); } }, t("discover.install"))),
							])) : null);
		}

		// ── Curated store tab (community catalog + npm/git install) ─────────────
		function CuratedTab(props) {
			var t = props.t;
			var lang = "en";
			try {
				var snap = ctxRef && ctxRef.locale ? ctxRef.locale.getSnapshot() : null;
				if (snap && String(snap.active || "").toLowerCase().indexOf("zh") === 0) lang = "zh";
			} catch (e) { /* keep en */ }
			var catsState = React.useState(null);
			var cats = catsState[0];
			var setCats = catsState[1];
			var itemsState = React.useState(null);
			var items = itemsState[0];
			var setItems = itemsState[1];
			var totalState = React.useState(0);
			var total = totalState[0];
			var setTotal = totalState[1];
			var fromCacheState = React.useState(false);
			var fromCache = fromCacheState[0];
			var setFromCache = fromCacheState[1];
			var catState = React.useState("all");
			var cat = catState[0];
			var setCat = catState[1];
			var orderState = React.useState("featured");
			var order = orderState[0];
			var setOrder = orderState[1];
			var queryState = React.useState("");
			var query = queryState[0];
			var setQuery = queryState[1];
			var pageState = React.useState(1);
			var page = pageState[0];
			var setPage = pageState[1];
			var hasMoreState = React.useState(false);
			var hasMore = hasMoreState[0];
			var setHasMore = hasMoreState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var errorState = React.useState("");
			var error = errorState[0];
			var setError = errorState[1];
			var msgState = React.useState(null);
			var msg = msgState[0];
			var setMsg = msgState[1];
			var detailState = React.useState(null);
			var detail = detailState[0];
			var setDetail = detailState[1];
			var confirmState = React.useState(null);
			var confirm = confirmState[0];
			var setConfirm = confirmState[1];
			var installingState = React.useState(false);
			var installing = installingState[0];
			var setInstalling = installingState[1];
			var stageState = React.useState("fetch");
			var stage = stageState[0];
			var setStage = stageState[1];
			var load = function (pageNum, opts) {
				var p = pageNum || 1;
				setBusy(true);
				setError("");
				if (p === 1) setItems(null);
				call("curatedPlugins", {
					category: opts && opts.category !== undefined ? opts.category : cat,
					order: opts && opts.order !== undefined ? opts.order : order,
					query: (opts && opts.query !== undefined ? opts.query : query).trim(),
					page: p,
				}).then(function (r) {
					if (r && r.ok === false) {
						setError(t("curated.failed") + (r.message || ""));
						if (p === 1) setItems([]);
					} else if (r && Array.isArray(r.plugins)) {
						if (r.categories) setCats(r.categories);
						if (typeof r.total === "number") setTotal(r.total);
						setFromCache(!!r.fromCache);
						setItems(p === 1 ? r.plugins : (items || []).concat(r.plugins));
						setPage(p);
						setHasMore(!!r.hasMore);
					} else {
						setError(t("curated.failed") + "bad payload");
						if (p === 1) setItems([]);
					}
				}).catch(function (e) {
					setError(t("curated.failed") + errText(e));
					if (p === 1) setItems([]);
				}).finally(function () { setBusy(false); });
			};
			React.useEffect(function () {
				load(1, {});
			}, []);
			var changeCategory = function (c) {
				setCat(c);
				load(1, { category: c });
			};
			var changeOrder = function (o) {
				setOrder(o);
				load(1, { order: o });
			};
			var doSearch = function () {
				load(1, { query: query });
			};
			var runInstall = function (x) {
				setInstalling(true);
				setStage("fetch");
				// Move to the install stage after a few seconds so the user can
				// tell the fetch is still progressing.
				var timer = setTimeout(function () { setStage("install"); }, 4000);
				var input = x.npm ? { npm: x.npm, fullName: x.fullName } : { repo: x.fullName };
				call("installPlugin", input).then(function (r) {
					clearTimeout(timer);
					setConfirm(null);
					setInstalling(false);
					if (r && r.ok === false) {
						if (r.code === "network") setMsg({ kind: "err", text: t("curated.fail.network") });
						else if (r.code === "mismatch") setMsg({ kind: "err", text: t("curated.fail.mismatch") });
						else if (r.code === "exists") setMsg({ kind: "err", text: t("curated.fail.exists") });
						else if (r.code === "invalid") setMsg({ kind: "err", text: t("curated.fail.invalid") });
						else setMsg({ kind: "err", text: t("curated.installFailed") + (r.message || "") });
					} else if (r && r.ok === true) {
						setMsg({ kind: "ok", text: t("curated.installDone") });
						var updated = (items || []).map(function (y) { return y.id === x.id ? Object.assign({}, y, { installed: true }) : y; });
						setItems(updated);
						if (detail) setDetail(Object.assign({}, detail, { installed: true }));
					} else {
						setMsg({ kind: "err", text: t("curated.installFailed") });
					}
				}).catch(function (e) {
					clearTimeout(timer);
					setConfirm(null);
					setInstalling(false);
					setMsg({ kind: "err", text: t("curated.installFailed") + errText(e) });
				});
			};
			var catLabel = function (id) {
				if (!cats || !cats[id]) return id;
				var c = cats[id];
				return lang === "zh" && c.zh ? c.zh : (c.en || id);
			};
			var desc = function (x) {
				if (!x || !x.description) return "";
				return lang === "zh" && x.description.zh ? x.description.zh : (x.description.en || "");
			};
			var chip = function (active, onClick, label) {
				return h("button", { type: "button", className: "skm-tab" + (active ? " skm-active" : ""), onClick: onClick }, label);
			};
			return h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
				h("div", { className: "skm-hint" }, t("curated.hint")),
				h("div", { className: "skm-row", style: { gap: 8 } },
					h("input", { className: "skm-input", style: { flex: 1 }, placeholder: t("curated.search"), value: query, onChange: function (e) { setQuery(e.target.value); }, onKeyDown: function (e) { if (e.key === "Enter") doSearch(); } }),
					Btn({ disabled: busy, onClick: doSearch }, t("discover.searchBtn"))),
				cats ? h("div", { className: "skm-row", style: { flexWrap: "wrap", gap: 6 } },
					[["all", t("curated.all")]].concat(Object.keys(cats).map(function (id) { return [id, catLabel(id)]; }))
						.map(function (pair) {
							return chip(cat === pair[0], function () { changeCategory(pair[0]); }, pair[1]);
						})) : null,
				h("div", { className: "skm-row", style: { gap: 6, alignItems: "center", flexWrap: "wrap" } },
					chip(order === "featured", function () { changeOrder("featured"); }, t("curated.orderFeatured")),
					chip(order === "stars", function () { changeOrder("stars"); }, t("curated.orderStars")),
					chip(order === "newest", function () { changeOrder("newest"); }, t("curated.orderNewest")),
					total > 0 ? h("span", { className: "skm-hint" }, t("curated.total", { n: String(total) }) + (fromCache ? t("curated.fromCache") : "")) : null),
				error ? h(Banner, { text: error }) : null,
				msg ? h(Banner, { kind: msg.kind, text: msg.text }) : null,
				items === null ? h("div", { className: "skm-empty" }, t("curated.loading")) :
					items.length === 0 ? h("div", { className: "skm-empty" }, t("curated.empty")) :
					h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
						h("div", { className: "skm-list" },
							items.map(function (x) {
								return h("div", { key: x.id, className: "skm-plugin-row", onClick: function () { setDetail(x); } },
									h("div", { className: "skm-row" },
										h("span", { className: "skm-plugin-name" }, x.fullName),
										h("span", { className: "skm-badge" }, "⭐ " + String(x.stars || 0)),
										x.npm ? h("span", { className: "skm-badge", style: { color: "#3370ff", background: "rgba(51,112,255,.1)" } }, t("curated.npmBadge")) : null,
										x.installed ? h("span", { className: "skm-badge", style: { color: "#12965b", background: "rgba(18,150,91,.1)" } }, t("curated.installed")) : null),
									desc(x) ? h("div", { className: "skm-item-desc" }, desc(x)) : null);
							})),
						hasMore ? h("div", { style: { display: "flex", justifyContent: "center" } },
							Btn({ disabled: busy, onClick: function () { load(page + 1, {}); } }, busy ? t("curated.loading") : t("curated.loadMore"))) : null),
				detail ? h(Modal, { title: detail.fullName, onClose: function () { setDetail(null); } },
					h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
						desc(detail) ? h("div", { className: "skm-desc" }, desc(detail)) : null,
						h("div", { className: "skm-plugin-detail", style: { padding: 0 } },
							detail.category && detail.category !== "other" ? h("div", { className: "skm-plugin-detail-row" },
								h("b", null, t("curated.detail.category")),
								h("span", null, catLabel(detail.category))) : null,
							h("div", { className: "skm-plugin-detail-row" },
								h("b", null, t("curated.detail.source")),
								h("span", null, t("curated.detail.sourceCurated"))),
							h("div", { className: "skm-plugin-detail-row" },
								h("b", null, t("curated.detail.mode")),
								h("span", null, detail.npm ? t("curated.detail.modeNpm") : t("curated.detail.modeGit"))),
							detail.npm ? h("div", { className: "skm-plugin-detail-row" },
								h("b", null, t("curated.detail.npm")),
								h("span", null, detail.npm)) : null,
							h("div", { className: "skm-plugin-detail-row" },
								h("b", null, t("curated.detail.repo")),
								h("a", { href: detail.url, target: "_blank", rel: "noopener noreferrer", style: { color: "var(--dsw-alias-accent,#3370ff)" } }, detail.url || detail.fullName))),
						h("div", { className: "skm-row", style: { gap: 8 } },
							detail.installed
								? h("span", { className: "skm-badge", style: { color: "#12965b", background: "rgba(18,150,91,.1)" } }, t("curated.installed"))
								: Btn({ kind: "primary", onClick: function () { setConfirm(detail); } }, t("curated.install"))))) : null,
				confirm ? h(Modal, { title: t("curated.installTitle"), onClose: installing ? null : function () { setConfirm(null); } },
					h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
						installing
							? h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
								h("div", null, stage === "fetch" ? t("curated.stageFetch") : t("curated.stageInstall")),
								h("div", { className: "skm-hint" }, t("curated.installNote")))
							: [
								h("div", null, confirm.npm ? t("curated.installWarnNpm", { name: confirm.npm }) : t("curated.installWarnGit", { repo: confirm.fullName })),
								h("div", { className: "skm-hint" }, t("curated.installNote")),
								h("div", { className: "skm-row", style: { justifyContent: "flex-end", gap: 8 } },
									Btn({ onClick: function () { setConfirm(null); } }, t("cancel")),
									Btn({ kind: "primary", onClick: function () { runInstall(confirm); } }, t("curated.install"))),
							])) : null);
		}

		// ── Import panel (embedded per tab, kind fixed by the caller) ────────────
		function ImportPanel(props) {
			var t = props.t;
			// kind is fixed by the host tab: 'skills' from the Skills page,
			// 'mcp' from the MCP Servers page.
			var kind = props.kind;
			var scope = props.scope;
			var setScope = props.setScope;
			var folder = props.folder;
			var saveFolder = props.saveFolder;
			var sourceState = React.useState("claude");
			var source = sourceState[0];
			var setSource = sourceState[1];
			var dataState = React.useState(null);
			var data = dataState[0];
			var setData = dataState[1];
			var selectedState = React.useState({});
			var selected = selectedState[0];
			var setSelected = selectedState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var errorState = React.useState("");
			var error = errorState[0];
			var setError = errorState[1];
			var resultsState = React.useState(null);
			var results = resultsState[0];
			var setResults = resultsState[1];
			var load = function () {
				setBusy(true);
				setError("");
				setResults(null);
				setSelected({});
				call("discover", { source: source, kind: kind, folder: folder || undefined }).then(function (r) {
					setData(r);
				}).catch(function (e) { setError(errText(e)); }).finally(function () { setBusy(false); });
			};
			var toggle = function (name) {
				var s = Object.assign({}, selected);
				if (s[name]) delete s[name];
				else s[name] = true;
				setSelected(s);
			};
			var runImport = function () {
				var names = Object.keys(selected);
				if (names.length === 0) { setError(t("import.selectFirst")); return; }
				setBusy(true);
				setError("");
				setResults(null);
				call("importItems", { source: source, kind: kind, scope: scope, folder: folder || undefined, names: names })
					.then(function (r) { setResults(r); })
					.catch(function (e) { setError(t("import.failed") + errText(e)); })
					.finally(function () { setBusy(false); });
			};
			var items = [];
			if (data) {
				if (kind !== "mcp") items = items.concat((data.skills || []).map(function (s) { return { id: s.name, name: s.name, desc: s.description, source: s.scope }; }));
				if (kind !== "skills") items = items.concat((data.mcp || []).map(function (m) { return { id: "mcp:" + m.name, name: m.name, desc: m.transport + (m.transport === "stdio" ? " · " + m.command : " · " + (m.url || "")) }; }));
			}
			return h("div", { className: "skm-wrap" },
				h(Banner, { text: error }),
				h("div", { className: "skm-toolbar" },
					h("select", { className: "skm-select", style: { width: "auto" }, value: source, onChange: function (e) { setSource(e.target.value); setData(null); setResults(null); } },
						h("option", { value: "claude" }, t("import.sourceClaude")),
						h("option", { value: "codex" }, t("import.sourceCodex"))),
					h("select", { className: "skm-select", style: { width: "auto" }, value: scope, onChange: function (e) { setScope(e.target.value); } },
						h("option", { value: "project" }, t("scope.importProject")),
						h("option", { value: "global" }, t("scope.importGlobal"))),
					scope === "project" ? h(FolderBar, { t: t, folder: folder, onPicked: saveFolder }) : null,
					h("div", { className: "skm-spacer" }),
					Btn({ disabled: busy, onClick: load }, t("import.scan"))),
				data ? h("div", { className: "skm-wrap" },
					h("div", { className: "skm-list", style: { maxHeight: "38vh" } },
						items.map(function (it) {
							return h("label", { key: it.id, className: "skm-check" },
								h("input", { type: "checkbox", checked: !!selected[it.id], onChange: function () { toggle(it.id); } }),
								h("span", { style: { fontWeight: 500, minWidth: 140 } }, it.name),
								h("span", { className: "skm-item-desc", style: { flex: 1 } }, it.desc || ""));
						}),
						items.length === 0 ? h("div", { className: "skm-empty" }, t("import.empty")) : null),
					h("div", { className: "skm-toolbar" },
						h("span", { className: "skm-hint" }, t("import.selected", { count: Object.keys(selected).length })),
						h("div", { className: "skm-spacer" }),
						Btn({ kind: "primary", disabled: busy, onClick: runImport }, t("import.run"))),
					results ? h("div", { className: "skm-list", style: { maxHeight: "20vh" } },
						results.results.map(function (r, i) {
							return h("div", { key: i, className: "skm-item" },
								h("span", { className: "skm-badge" }, r.kind === "skill" ? t("badge.skill") : t("badge.mcp")),
								h("span", { style: { fontWeight: 500 } }, r.name),
								h("span", { className: "skm-item-desc", style: { flex: 1 } }, r.file || r.path || r.preset || ""));
						})) : null) : null);
		}

		// ── section root ────────────────────────────────────────────────────────
		function SkillMcpSection(props) {
			// The slot shell injects `t` (LocaleFace); fall back to the apply-time
			// bound translator for safety.
			var t = (props && props.t) || tRef;
			var tabState = React.useState("skills");
			var tab = tabState[0];
			var setTab = tabState[1];
			var scopeState = React.useState("project");
			var scope = scopeState[0];
			var setScope = scopeState[1];
			var folderState = useFolder();
			// "Check Updates" — compares this plugin's local version against npm.
			var updateBusyState = React.useState(false);
			var updateBusy = updateBusyState[0];
			var setUpdateBusy = updateBusyState[1];
			var updateInfoState = React.useState(null);
			var updateInfo = updateInfoState[0];
			var setUpdateInfo = updateInfoState[1];
			// update flow state: "idle" | "running" | "done" | "failed"
			var updateFlowState = React.useState("idle");
			var updateFlow = updateFlowState[0];
			var setUpdateFlow = updateFlowState[1];
			var updateFlowMsgState = React.useState("");
			var updateFlowMsg = updateFlowMsgState[0];
			var setUpdateFlowMsg = updateFlowMsgState[1];
			var checkUpdates = function () {
				setUpdateBusy(true);
				setUpdateInfo(null);
				setUpdateFlow("idle");
				setUpdateFlowMsg("");
				call("checkUpdates", {}).then(function (r) {
					setUpdateInfo(r);
				}).catch(function (e) {
					setUpdateInfo({ status: "error", message: errText(e) });
				}).finally(function () { setUpdateBusy(false); });
			};
			var runUpdate = function () {
				setUpdateFlow("running");
				setUpdateFlowMsg("");
				call("updatePlugin", {}).then(function (r) {
					if (r && r.ok) {
						setUpdateFlow("done");
						setUpdateFlowMsg(t("update.done", { version: r.version || "?" }));
					} else {
						setUpdateFlow("failed");
						setUpdateFlowMsg(t("update.runFailed") + (r && r.message ? r.message : ""));
					}
				}).catch(function (e) {
					setUpdateFlow("failed");
					setUpdateFlowMsg(t("update.runFailed") + errText(e));
				});
			};
			var updateText = function (info) {
				if (!info) return "";
				if (info.status === "update-available") return t("update.available", { current: info.current, latest: info.latest });
				if (info.status === "up-to-date") return t("update.upToDate", { current: info.current });
				if (info.status === "not-published") return t("update.notPublished");
				return t("update.fail") + (info.message || "");
			};
			var updateKind = function (info) {
				return info && (info.status === "error" || info.status === "not-published") ? "err" : "ok";
			};
			return h("div", { className: "skm-wrap", style: { padding: "2px 0" } },
				h("div", { className: "skm-header" },
					h("div", { className: "skm-header-main" },
						h("div", { className: "skm-header-title" }, t("header.title")),
						h("div", { className: "skm-header-sub" }, t("header.subtitle"))),
					h("div", { className: "skm-header-side" },
						Btn({ sm: true, className: "skm-update-btn", disabled: updateBusy || updateFlow === "running", onClick: checkUpdates }, t("update.check")))),
				updateFlow === "done" ? h(Banner, { kind: "ok", text: updateFlowMsg }) : null,
				updateFlow === "failed" ? h(Banner, { text: updateFlowMsg }) : null,
				updateInfo && updateFlow === "idle" ? h("div", { className: "skm-banner skm-" + updateKind(updateInfo), style: { display: "flex", alignItems: "center", gap: 10 } },
					h("span", { style: { flex: 1 } }, updateText(updateInfo)),
					updateInfo.status === "update-available" ? Btn({ sm: true, kind: "success", onClick: runUpdate }, t("update.run")) : null) : null,
				updateFlow === "running" ? h("div", { className: "skm-banner skm-ok" }, t("update.running")) : null,
				h("div", { className: "skm-tabs" },
					h("button", { type: "button", className: "skm-tab" + (tab === "skills" ? " skm-active" : ""), onClick: function () { setTab("skills"); } }, t("tab.skills")),
					h("button", { type: "button", className: "skm-tab" + (tab === "mcp" ? " skm-active" : ""), onClick: function () { setTab("mcp"); } }, t("tab.mcp")),
					h("button", { type: "button", className: "skm-tab" + (tab === "plugins" ? " skm-active" : ""), onClick: function () { setTab("plugins"); } }, t("tab.plugins")),
					h("button", { type: "button", className: "skm-tab" + (tab === "discover" ? " skm-active" : ""), onClick: function () { setTab("discover"); } }, t("tab.discover"))),
				tab === "skills" ? h(SkillsTab, { t: t, scope: scope, setScope: setScope, folder: folderState.folder, saveFolder: folderState.saveFolder }) : null,
				tab === "mcp" ? h(McpTab, { t: t, scope: scope, setScope: setScope, folder: folderState.folder, saveFolder: folderState.saveFolder }) : null,
				tab === "plugins" ? h(PluginsTab, { t: t }) : null,
				tab === "discover" ? h(DiscoverTab, { t: t }) : null);
		}

		// ── plugin face ──────────────────────────────────────────────────────────
		var inject = ["slots", "connection", "remote", "locale"];
		async function apply(ctx) {
			ctxRef = ctx;
			// Register dictionaries; the shell's LocaleFace injects `t` into the
			// section props and re-renders on locale switches.
			ctx.locale.register(NS, { zh, en });
			tRef = ctx.locale.bind(NS);
			// Mount the Remote contribution so the `extensionHub` namespace exists
			// (descriptor-driven client surface; see makeRemoteContribution).
			await ctx.remote.$mount(REMOTE_CONTRIBUTION);
			// Resolve the namespace service this plugin just created. It cannot
			// be declared in `inject` (self-created dependency would deadlock),
			// so read the service store directly without the inject requirement.
			apiRef = ctx.reflect.get("remote.extensionHub");
			if (!apiRef) throw new Error("extensionHub namespace failed to mount");
			ctx.slots.inject("settings.section", function () {
				return ctx.slots.register({
					name: "settings.section",
					id: "extension-hub",
					order: 95,
					label: function () { return tRef("nav"); },
				}, SkillMcpSection);
			});
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
