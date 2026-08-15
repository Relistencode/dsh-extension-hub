// Browser half of dsh-myrules.
//
// This file is served verbatim by the host's client-modules bundle route
// (`/plugins/dsh-myrules/client.js`) and executed through the lazy CJS
// module table: the factory receives `require` and must register itself with
// `window.__ModuleLoader__.load`. Keep the require surface minimal — only
// `react` (a shell seed word) is used; the host API is reached through the
// mounted Remote namespace service, never through package imports.
//
// The plugin registers one section in the DSH Web settings page
// (`settings.section`, id `my-rules`): 「个性化 / Customize」 — a single
// page that edits the user-global instruction file ($DSH_HOME/AGENTS.md),
// which dsh-agent-instructions injects into every session on this host.
//
// Copy is fully localized through the DSH locale service (zh/en). No
// bundler/transpiler runs on this file — plain ES2017-ish JS.
window.__ModuleLoader__.load({
	id: "dsh-myrules",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		var React = require("react");

		// ── styles ──────────────────────────────────────────────────────────────
		var CSS_ID = "dsh-myrules/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"" + CSS_ID + "\"]") === null) {
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-myrules";
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = [
				".myr-wrap{display:flex;flex-direction:column;gap:14px;min-height:0;color:var(--dsw-alias-label-primary,#1f2329);font-size:14px;line-height:22px;padding:2px 0;max-width:760px}",
				".myr-title{font-size:18px;font-weight:700;line-height:26px;margin-bottom:4px}",
				".myr-sub{color:var(--dsw-alias-label-tertiary,#8f959e);font-size:12px;line-height:18px;margin-bottom:10px}",
				".myr-divider{height:1px;background:var(--dsw-alias-divider,#e5e6eb);border:none;margin:0}",
				".myr-block{display:flex;flex-direction:column;gap:8px}",
				".myr-block-head{display:flex;align-items:center;gap:10px}",
				".myr-block-title{font-weight:600;font-size:15px;line-height:22px}",
				".myr-link{color:var(--dsw-alias-label-tertiary,#8f959e);font-size:13px;line-height:20px;text-decoration:none;cursor:pointer}",
				".myr-link:hover{color:var(--dsw-alias-accent,#3370ff)}",
				".myr-hint{color:var(--dsw-alias-label-tertiary,#8f959e);font-size:13px;line-height:20px}",
				".myr-textarea{width:100%;box-sizing:border-box;height:190px;min-height:80px;padding:10px 12px;border:1px solid var(--dsw-alias-border,#d9dce1);border-radius:8px;background:var(--dsw-alias-bg-module-platform,#f7f8fa);color:var(--dsw-alias-label-primary,#1f2329);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;line-height:20px;resize:vertical;outline:none}",
				".myr-textarea:focus{border-color:var(--dsw-alias-accent,#3370ff)}",
				".myr-note{padding:0;border-radius:0;background:none;color:var(--dsw-alias-label-tertiary,#8f959e);font-size:12px;line-height:18px}",
				".myr-footer{display:flex;align-items:center;gap:12px}",
				".myr-meter{flex:1;display:flex;align-items:center;gap:10px;min-width:0}",
				".myr-meter-track{flex:1;height:6px;border-radius:3px;background:transparent;border:1px solid var(--dsw-alias-label-tertiary,#8f959e);overflow:hidden;min-width:60px}",
				".myr-meter-fill{height:100%;background:var(--dsw-alias-label-primary,#1f2329);border-radius:3px;transition:width .2s ease}",
				".myr-meter-text{font-size:12px;color:var(--dsw-alias-label-tertiary,#8f959e);white-space:nowrap}",
				".myr-msg{flex:1;font-size:13px;line-height:20px}",
				".myr-ok{color:#12965b}",
				".myr-warn{color:#d48806}",
				".myr-err{color:#d54941}",
				".myr-btn{cursor:pointer;border:1px solid var(--dsw-alias-label-tertiary,#8f959e);border-radius:999px;padding:2px 14px;font-family:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-bg-layer-2,#fff);background:var(--dsw-alias-label-primary,#1f2329)}",
				".myr-btn:hover{opacity:.85}",
				".myr-btn:disabled{opacity:.5;cursor:not-allowed}",
			].join("");
			// The style tag must actually be inserted into the DOM — without
			// appendChild the CSS never applies (i18n still works, which makes
			// this failure mode look like "text changed but styles did not").
			document.head.appendChild(tag);
		}

		// ── i18n ────────────────────────────────────────────────────────────────
		var NS = "myRules";
		var zh = {
			"nav": "个性化",
			"title": "个性化",
			"blockTitle": "自定义指令",
			"learnMore": "了解更多",
			"hint": "向 DSH 提供适用于此主机上所有聊天的额外说明和上下文。",
			"editorNote": "写入 {path} · Markdown 格式 · 新会话立即生效；当前会话在下次文件操作后感知新指令。",
			"placeholder": "在此输入你的自定义指令…（可多条，换行分隔）",
			"save": "保存",
			"saving": "保存中…",
			"bytes": "{n} 字节",
			"budget": "预算 {budget} KB",
			"meter": "{pct}% / 预算 {budget} KB",
			"saved": "已保存 — 新会话立即生效。",
			"savedWarn": "已保存（内容超过 64 KB 预算，超出部分可能被指令渲染器省略）。",
			"removed": "已清除全局指令。",
			"saveFailed": "保存失败: ",
			"confirmRemove": "内容为空 — 保存将删除全局指令文件（$DSH_HOME/AGENTS.md），所有会话将不再加载你的自定义指令。确定删除吗？",
			"loading": "加载中…",
			"loadFailed": "加载失败: ",
			"cancel": "取消",
		};
		var en = {
			"nav": "Customize",
			"title": "Customize",
			"blockTitle": "Custom Instructions",
			"learnMore": "Learn more",
			"hint": "Additional instructions and context for every chat on this host.",
			"editorNote": "Written to {path} · Markdown · new sessions apply immediately; the current session picks it up after the next file operation.",
			"placeholder": "Type your custom instructions here… (one per line)",
			"save": "Save",
			"saving": "Saving…",
			"bytes": "{n} bytes",
			"budget": "budget {budget} KB",
			"meter": "{pct}% / budget {budget} KB",
			"saved": "Saved — new sessions apply immediately.",
			"savedWarn": "Saved (content exceeds the 64 KB budget; overflow may be omitted by the instruction renderer).",
			"removed": "Global instructions removed.",
			"saveFailed": "Save failed: ",
			"confirmRemove": "The content is empty — saving will delete the global instructions file ($DSH_HOME/AGENTS.md) and your custom instructions will no longer load in any session. Delete?",
			"loading": "Loading…",
			"loadFailed": "Load failed: ",
			"cancel": "Cancel",
		};

		// ── remote surface ──────────────────────────────────────────────────────
		// The client Remote surface is descriptor-driven: the browser half must
		// mount an explicit contribution of the exact shape `{ package,
		// descriptors }` (docs/subsystems/typert.md — $mount(contribution)).
		// Each descriptor carries id/service/namespace/method/invocation plus
		// parameters/result codecs; a passthrough codec keeps every method a
		// plain-JSON seam. A malformed shape (e.g. missing `descriptors`) makes
		// $mount throw and fails the whole plugin apply — verify against the
		// working extension-hub bundle before shipping.
		var REMOTE_METHODS = ["readGlobalRules", "writeGlobalRules"];
		function passthroughCodec(typeSymbol) {
			return { mode: "strict", typeSymbol: typeSymbol, schema: { parse: function (v) { return v; } } };
		}
		function makeRemoteContribution() {
			var descriptors = [];
			for (var i = 0; i < REMOTE_METHODS.length; i++) {
				descriptors.push({
					id: "dsh-myrules#myRules/" + REMOTE_METHODS[i],
					service: "myRules",
					namespace: "myRules",
					method: REMOTE_METHODS[i],
					invocation: { kind: "direct" },
					parameters: [{ name: "input", wire: "input", source: "json", codec: passthroughCodec("dsh-myrules/types#Input") }],
					result: passthroughCodec("dsh-myrules/types#Result"),
				});
			}
			return { package: "dsh-myrules", descriptors: descriptors };
		}
		var REMOTE_CONTRIBUTION = makeRemoteContribution();

		// ── plumbing ────────────────────────────────────────────────────────────
		var ctxRef = null;
		var apiRef = null;
		var tRef = null;

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
			if (!e) return "";
			if (e && e.error && e.error.message) return e.error.message;
			return e.message || String(e);
		}

		var DOC_URL = "https://github.com/deepseek-ai/dsh-agent-instructions";

		// ── page ────────────────────────────────────────────────────────────────
		function h(type, props) {
			var args = [type, props];
			for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
			return React.createElement.apply(React, args);
		}

		function MyRulesPage(props) {
			// The slot shell may or may not inject `t`; fall back to the
			// apply-time bound translator (same pattern as extension-hub).
			var t = (props && props.t) || tRef;
			var contentState = React.useState("");
			var content = contentState[0];
			var setContent = contentState[1];
			var metaState = React.useState(null);
			var meta = metaState[0];
			var setMeta = metaState[1];
			var loadingState = React.useState(true);
			var loading = loadingState[0];
			var setLoading = loadingState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var msgState = React.useState(null);
			var msg = msgState[0];
			var setMsg = msgState[1];

			var load = function () {
				call("readGlobalRules", {}).then(function (r) {
					if (r && r.ok) {
						setContent(r.content || "");
						setMeta({
							exists: !!r.exists,
							bytes: r.bytes || 0,
							displayPath: r.displayPath || "$DSH_HOME/AGENTS.md",
							budget: r.budget || 65536,
						});
					} else {
						setMsg({ kind: "err", text: t("loadFailed") + ((r && r.message) || "") });
					}
				}).catch(function (e) {
					setMsg({ kind: "err", text: t("loadFailed") + errText(e) });
				}).finally(function () { setLoading(false); });
			};
			React.useEffect(function () {
				load();
			}, []);

			var byteCount = (function () {
				try { return new TextEncoder().encode(content).length; } catch (e) { return content.length; }
			})();
			var budgetBytes = meta ? meta.budget : 65536;
			var budgetKb = Math.round(budgetBytes / 1024);
			var pct = budgetBytes > 0 ? Math.round((byteCount / budgetBytes) * 100) : 0;
			var fillPct = Math.min(pct, 100);

			var save = function () {
				if (busy) return;
				if (content.trim() === "") {
					if (!window.confirm(t("confirmRemove"))) return;
				}
				setBusy(true);
				setMsg(null);
				call("writeGlobalRules", { content: content }).then(function (r) {
					if (r && r.ok) {
						if (r.removed) setMsg({ kind: "ok", text: t("removed") });
						else if (r.warning) setMsg({ kind: "warn", text: t("savedWarn") });
						else setMsg({ kind: "ok", text: t("saved") });
						if (meta) setMeta(Object.assign({}, meta, { exists: !r.removed, bytes: r.bytes || 0 }));
					} else {
						setMsg({ kind: "err", text: t("saveFailed") + ((r && r.message) || "") });
					}
				}).catch(function (e) {
					setMsg({ kind: "err", text: t("saveFailed") + errText(e) });
				}).finally(function () { setBusy(false); });
			};

			return h("div", { className: "myr-wrap" },
				h("div", { className: "myr-title" }, t("title")),
				h("div", { className: "myr-sub" }, t("hint")),
				h("div", { className: "myr-divider" }),
				h("div", { className: "myr-block" },
					h("div", { className: "myr-block-head" },
						h("span", { className: "myr-block-title" }, t("blockTitle")),
						h("a", { href: DOC_URL, target: "_blank", rel: "noopener noreferrer", className: "myr-link" }, t("learnMore") + " ↗")),
					loading
						? h("div", { className: "myr-hint" }, t("loading"))
						: h("textarea", {
							className: "myr-textarea",
							value: content,
							placeholder: t("placeholder"),
							spellCheck: false,
							onChange: function (e) { setContent(e.target.value); },
						}),
					h("div", { className: "myr-divider" }),
					meta ? h("div", { className: "myr-note" }, t("editorNote", { path: meta.displayPath })) : null,
					msg ? h("div", { className: "myr-msg myr-" + msg.kind }, msg.text) : null,
					h("div", { className: "myr-footer" },
						h("div", { className: "myr-meter" },
							h("div", { className: "myr-meter-track" },
								h("div", { className: "myr-meter-fill", style: { width: fillPct + "%" } })),
							h("span", { className: "myr-meter-text" }, t("meter", { pct: String(pct), budget: String(budgetKb) }))),
						h("button", { type: "button", className: "myr-btn", disabled: busy || loading, onClick: save }, busy ? t("saving") : t("save")))));
		}

		// ── plugin face ─────────────────────────────────────────────────────────
		var inject = ["slots", "connection", "remote", "locale"];
		async function apply(ctx) {
			ctxRef = ctx;
			ctx.locale.register(NS, { zh, en });
			tRef = ctx.locale.bind(NS);
			await ctx.remote.$mount(REMOTE_CONTRIBUTION);
			apiRef = ctx.reflect.get("remote.myRules");
			if (!apiRef) throw new Error("myRules namespace failed to mount");
			ctx.slots.inject("settings.section", function () {
				return ctx.slots.register({
					name: "settings.section",
					id: "my-rules",
					order: 100,
					label: function () { return tRef("nav"); },
				}, MyRulesPage);
			});
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
