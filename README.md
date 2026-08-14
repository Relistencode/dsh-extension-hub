# dsh-extension-hub

Manage **DeepSeek Harness (DSH)** skills and MCP servers from one place — with a
dependency-free CLI and a durable settings-page UI for the DSH Web app.

Three layers in one package:

1. **Persistence core** (`lib/*.mjs`) — zero third-party dependencies. Only
   edits text inside its own managed regions; your hand-written content is
   never touched.
2. **CLI** (`cli.mjs`) — manage skills/MCP from the terminal and import from
   **Claude Code** and **OpenAI Codex**.
3. **Durable UI plugin** (`lib/host.js` + `lib/client.js`) — a dual-face Cordis
   plugin that embeds everything into the **DSH Web settings page**
   ("Extension Management" section) with project-level folder selection.

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

**Localization**: the settings section is fully **zh / en** bilingual and
follows the DSH Web language switch live.

## CLI

```bash
node cli.mjs <command> [...]

# Inspect
node cli.mjs list [--skills|--mcp|--all] [--json]

# Discover / import from Claude / Codex
node cli.mjs discover <claude|codex> [--skills|--mcp|--all] [--json]
node cli.mjs import <claude|codex> (--skills|--mcp) [--scope project|global] [--names a,b] [--dry-run] [--json]

# Skill CRUD
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
node cli.mjs edit mcp <name|id> [same flags] [--scope project|global] [--json]
node cli.mjs enable  mcp <name> [--scope project|global] [--json]
node cli.mjs disable mcp <name> [--scope project|global] [--json]
node cli.mjs remove  mcp <name> [--scope project|global] [--json]

# Remember the project-level target folder
node cli.mjs folder <path> [--json]
node cli.mjs state [--json]
```

Every command supports `--json` (structured output for scripts and UIs).

## Settings UI (DSH Web)

The plugin registers an **"Extension Management"** section in the settings
page, with a header ("Manage plugins, skills and MCP") and two tabs:

- **Skills**: list (scope badge, enable switch, edit, delete) + create (form:
  name / description / whenToUse / license / user-invocable + Markdown body)
- **MCP Servers**: list (transport badge, enable switch, edit, delete) +
  create (stdio: command / args / env; streamable-http: URL / headers)

Each tab has its own **"Import from Claude/Codex…"** button that opens a modal
with the type fixed to that page (skills or MCP): pick source → scan → check
items → choose scope (project/global) → import.

**Project folder**: the "Choose Folder…" button uses the host directory picker
(native dialog or in-app browser, depending on the deployment); the choice is
remembered in `~/.dsh/extension-hub/state.json` across reloads.

### Install (on your own DSH)

```bash
# 1. Add this package as a dependency of the web profile
cd ~/.dsh/profiles/web
pnpm add dsh-extension-hub            # from the npm registry
# or: pnpm add <path-to-this-repo>    # local / git checkout

# 2. Mount the plugin row in the host patch (takes effect after a dsh restart)
#    append to ~/.dsh/profiles/web/cordis.patch.yml:
#    - insert:
#        - id: extension-hub
#          name: dsh-extension-hub

# 3. Restart dsh web
```

> **Development mode (this repo as the source)**: `pnpm add file:...` links the
> profile to this directory. ESM resolves dependencies from the physical path,
> so the repo needs a resolution link:
> ```bash
> mklink /J node_modules\@deepseek-ai <your DSH profiles>\node_modules\@deepseek-ai
> ```
> Packages installed from the npm registry do not need this step.

### How it works

- The host half (`lib/host.js`) is a `TypertRemoteService` gateway exposed
  under the `extensionHub` wire namespace; the browser half mounts its Remote
  contribution and calls the mounted namespace service (never the compiled
  static `connection.api` surface).
- The browser bundle is declared via `dsh.client.platform: "web"` in
  `package.json`; the DSH client-modules system scans it at boot, injects the
  boot manifest, and serves the bundle over `/plugins/dsh-extension-hub/client.js`
  — **no web bundle rebuild required**.
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
  generates a dedicated preset `~/.dsh/.agent-presets/<slug>-mcp/agent.cordis.yml`
  (based on the shipped `standard` preset). Select that preset in the session
  roster to activate the servers.

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

## Publishing

Before `npm publish`:

1. Confirm the `name` (`dsh-extension-hub`) is still available on the registry;
2. `node_modules/` is git-ignored (dev junction, never committed);
3. Verify once from the registry on a clean profile:
   `dsh plugin --profile web add dsh-extension-hub`.

## License

MIT
