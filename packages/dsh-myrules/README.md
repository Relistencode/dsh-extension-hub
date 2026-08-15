# dsh-myrules

My Rules for DeepSeek Harness (DSH): edit your **host-wide global instructions**
from the DSH Web settings page. A "Customize" section (个性化) provides a
multi-line editor for `$DSH_HOME/AGENTS.md` — the file
[dsh-agent-instructions](https://github.com/deepseek-ai/dsh-agent-instructions)
injects into **every session on this machine** as a durable instruction block.

Edit once, save — new sessions apply it immediately; the current session picks
it up after its next file operation. No restart needed.

## Install

```sh
dsh plugin --profile web add dsh-myrules
```

Restart `dsh web`, then open **Settings → Customize**.

## Usage

1. Open **Settings → Customize (个性化)**
2. Edit your custom instructions (Markdown, one or many lines)
3. Click **Save**

Saving is straightforward:

- an **empty** save deletes the file (clearing the instructions) — confirm first
- content beyond the 64 KB instruction budget is saved with a warning (the
  renderer omits broader files before truncating the most specific one)

## How it works

- **Host** (`lib/host.js`): a `TypertRemoteService` gateway under the
  `myRules` wire namespace — `readGlobalRules` / `writeGlobalRules`. The file
  path resolves through `$DSH_HOME` (config → env → `~/.dsh`).
- **Client** (`lib/client.js`): a standard client-modules bundle registering
  the `settings.section` page; fully localized (zh/en).
- **Effect**: no hot-reload needed — DSH's built-in `dsh-agent-instructions`
  watches the user-global scope and re-injects on file changes.

## License

MIT
