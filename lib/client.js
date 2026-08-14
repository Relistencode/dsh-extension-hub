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
				".skm-list{display:flex;flex-direction:column;gap:6px;max-height:52vh;overflow-y:auto;padding-right:4px}",
				".skm-item{display:flex;align-items:center;gap:10px;border:1px solid var(--dsw-alias-border,#e5e6eb);border-radius:11px;padding:8px 12px;background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,.015))}",
				".skm-item-main{flex:1;min-width:0}",
				".skm-item-title{display:flex;align-items:center;gap:8px;font-weight:500}",
				".skm-item-desc{font-size:12px;color:var(--dsw-alias-label-secondary,#646a73);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
				".skm-badge{font-size:11px;line-height:16px;padding:0 7px;border-radius:999px;background:var(--dsw-alias-interactive-bg-active,rgba(0,0,0,.07));color:var(--dsw-alias-label-secondary,#646a73);white-space:nowrap}",
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
		var REMOTE_METHODS = ["list", "getSkill", "createSkill", "updateSkill", "removeSkill", "toggleSkill", "getMcp", "upsertMcp", "removeMcp", "toggleMcp", "discover", "importItems", "projectInfo", "getState", "setState", "pickProjectFolder", "listDirectory", "createDirectory", "checkUpdates", "updatePlugin"];
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
		// Retry transport-level failures: the host's typert claims table can be
		// briefly empty right after a dsh web start (services still registering),
		// which surfaces as a 404 on /api/<ns>/<method>. Two quick retries ride
		// past that window.
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
				if (attempt < 2) {
					await new Promise(function (resolve) { setTimeout(resolve, 400); });
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
					h("button", { type: "button", className: "skm-tab" + (tab === "mcp" ? " skm-active" : ""), onClick: function () { setTab("mcp"); } }, t("tab.mcp"))),
				tab === "skills" ? h(SkillsTab, { t: t, scope: scope, setScope: setScope, folder: folderState.folder, saveFolder: folderState.saveFolder }) : null,
				tab === "mcp" ? h(McpTab, { t: t, scope: scope, setScope: setScope, folder: folderState.folder, saveFolder: folderState.saveFolder }) : null);
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
