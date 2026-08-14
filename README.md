# dsh-extension-hub

Manage DeepSeek Harness (DSH) skills and MCP servers from one place.

Skills management · MCP servers · Skill import

A service-oriented extension center for DeepSeek Harness: a zero-dependency persistence core and CLI, plus a durable settings-page UI embedded in DSH Web — create / edit / enable / disable skills and MCP servers, and one-click import from Claude Code and OpenAI Codex. Plugin management and a plugin marketplace are on the roadmap.

🌏 [中文](README.zh.md) · English

## Quick Start

**Prerequisites**: DSH installed and running (`dsh web` works), Node.js ≥ 22, pnpm ≥ 10.

macOS / Linux (Windows with Git Bash or WSL works too):

```bash
cd ~/.dsh/profiles/web
pnpm add dsh-extension-hub
grep -q "name: dsh-extension-hub" cordis.patch.yml || cat >> cordis.patch.yml <<'EOF'

- insert:
    - id: extension-hub
      name: dsh-extension-hub
EOF
```

Windows (PowerShell 5.1+ / pwsh):

```powershell
cd "$env:USERPROFILE\.dsh\profiles\web"
pnpm add dsh-extension-hub
if (-not (Select-String -Path cordis.patch.yml -Pattern 'name: dsh-extension-hub' -Quiet)) {
  Add-Content -Path cordis.patch.yml -Value "`n- insert:`n    - id: extension-hub`n      name: dsh-extension-hub"
}
```

Restart `dsh web`, then open **Settings → Extension Management**.

Install once — localization, update checks and everything else ship with version updates.

## Features

| Feature | CLI | Settings UI |
|---|---|---|
| List skills / MCP (enabled state, scope) | ✅ | ✅ |
| Create / edit / delete skills | ✅ | ✅ (form + Markdown body) |
| Enable / disable skills & MCP | ✅ | ✅ |
| Create / edit / delete MCP (stdio / streamable-http) | ✅ | ✅ |
| Import skills & MCP from Claude / Codex | ✅ | ✅ |
| Project-scope install with folder picker | ✅ (`folder` cmd) | ✅ (DSH directory picker) |

**Built-in skills are read-only**: the list also shows skills bundled with the
deployment (shipped presets, e.g. the `cordis` preset's skills) and skills
shipped inside user presets, marked "Built-in/Preset" and not editable /
deletable / toggleable — they belong to the deployment or preset layer. To
override, create a same-name skill in the user or project directory.

## Recent Updates

<details>
<summary>Recent updates (click to expand)</summary>

- **2026-08** — "Check Updates" button in the header: compares the local package version against the npm registry.
- **2026-08** — Section renamed to **Extension Management** with a header ("Manage plugins, skills and MCP"); import moved from its own tab into the Skills and MCP Servers pages.
- **2026-08** — Full zh/en i18n (83 keys), project folder picker, built-in skill read-only layer.
- Initial release — CLI + durable settings UI + zero-dependency persistence core.

</details>

## How it works

- The host half (`lib/host.js`) is a `TypertRemoteService` gateway exposed
  under the `extensionHub` wire namespace; the browser half mounts its Remote
  contribution and calls the mounted namespace service.
- The browser bundle is declared via `dsh.client.platform: "web"` in
  `package.json`; DSH's client-modules system scans it at boot, injects the
  boot manifest, and serves the bundle over
  `/plugins/dsh-extension-hub/client.js` — **no web bundle rebuild required**.
- All real reads/writes run inside the host process (outside the session file
  sandbox) and share the same `lib/` code as the CLI.

## Data sources (discovery scope)

| Source | Skills | MCP |
|---|---|---|
| **Claude** | `<repo>/.claude/skills/*/SKILL.md`, `~/.claude/skills/*/SKILL.md` | `<repo>/.mcp.json`, `~/.claude.json`, `~/.claude/.claude.json` |
| **Codex** | `<repo>/.codex/skills/*/SKILL.md`, `~/.codex/skills/*/SKILL.md` | `~/.codex/config.toml`, `<repo>/.codex/config.toml` |

Conversion: Claude/Codex `stdio` servers → DSH `transport: stdio`
(`command`/`args`/`env`); `http`/`sse` → `transport: streamable-http`
(`url`/`headers`). Skill `name`/`description`/`whenToUse` are preserved,
`license`/`allowed-tools` fold into `metadata`.

## Persistence locations

### Skills

- **Project scope** `--scope project` → `<target folder>/.dsh/skills/<name>/SKILL.md`
- **Global scope** `--scope global` → `~/.dsh/skills/<name>/SKILL.md`

Enable/disable rewrites the `disable-model-invocation` / `user-invocable`
frontmatter flags; removal deletes the file.

### MCP

- **Global** → rows are appended/updated inside the managed region
  (`# >>> dsh-extension-hub` … `# <<< dsh-extension-hub`) of
  `~/.dsh/profiles/<profile>/cordis.patch.yml`.
- **Project** → writes a manifest `<target folder>/.dsh/mcp-servers.yaml` and
  generates a dedicated preset
  `~/.dsh/.agent-presets/<slug>-mcp/agent.cordis.yml` (based on the shipped
  `standard` preset). Select that preset in the session roster to activate
  the servers.

## Supported platforms

DSH itself runs on Windows, macOS and Linux; this plugin has no platform
specifics — the CLI works anywhere Node.js runs, and the settings UI follows
the DSH Web host.

## Repository layout

```
dsh-extension-hub/
  package.json        # plugin metadata (dsh.client, bin, exports)
  cli.mjs             # CLI entry
  lib/
    paths.mjs         # DSH home / patch / presets / skill roots resolution
    yaml.mjs          # YAML subset parser
    toml.mjs          # TOML subset parser (Codex config.toml)
    emit.mjs          # minimal YAML emitter
    region.mjs        # managed-region text editing
    discover.mjs      # Claude / Codex discovery
    convert.mjs       # Claude/Codex -> DSH conversion
    install.mjs       # disk writes (skills / patch / project preset)
    list.mjs          # list DSH skills + MCP
    skills.mjs        # skill create / read / update (frontmatter + body)
    mcp.mjs           # MCP row upsert / get / remove / toggle
    state.mjs         # manager state (remembered project folder etc.)
    host.js           # plugin host half: extensionHub Remote gateway
    client.js         # plugin browser half: settings "Extension Management" UI
```

## Known limitations

- The YAML/TOML parsers are self-contained **subsets** covering the shapes
  that actually appear in DSH compositions and Codex `config.toml`; anything
  outside them is skipped or reported, never silently corrupted.
- Skill discovery matches DSH `dsh-skill-filesystem`: only
  `<root>/<name>/SKILL.md` and `<root>/<name>.md` are recognized; names must
  be kebab-case.
- Project MCP relies on the "generated preset + manually select the preset"
  mechanism; the tool does not switch presets between sessions for you.
- Project-scope enable/disable toggles apply to the generated preset (whether
  the servers load when that preset is selected); the manifest always keeps
  the full record.
- Global MCP removal/editing only affects manager-managed rows (inside the
  managed region); hand-written patch rows are untouched.

## License

MIT
