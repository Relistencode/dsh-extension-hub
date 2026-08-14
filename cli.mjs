#!/usr/bin/env node
import { discover } from './lib/discover.mjs'
import { skillItemToSkillMd, mcpItemToInsertEntry, normalizeServerName } from './lib/convert.mjs'
import {
  installSkill,
  removeSkill,
  toggleSkill,
  installMcpGlobal,
  installMcpProject,
  removeMcpGlobal,
  removeMcpProject,
  toggleMcpGlobal,
  toggleMcpProject,
} from './lib/install.mjs'
import { listAll, listSkills, listMcp } from './lib/list.mjs'
import { readSkill, createSkill, updateSkill } from './lib/skills.mjs'
import { upsertMcp, removeMcp, toggleMcp, getMcpEntry } from './lib/mcp.mjs'
import { readState, writeState } from './lib/state.mjs'
import { projectRoot } from './lib/paths.mjs'
import fs from 'node:fs'

const USAGE = `dsh-extension-hub — manage DSH MCP servers and skills

Usage:
  node cli.mjs list [--skills|--mcp|--all] [--json]
  node cli.mjs discover <claude|codex> [--skills|--mcp|--all] [--json]
  node cli.mjs import <claude|codex> (--skills|--mcp) [--scope project|global] [--names a,b] [--dry-run] [--json]
  node cli.mjs get skill <name> [--scope project|global] [--json]
  node cli.mjs create skill <name> [--description S] [--when-to-use S] [--license S]
                  [--user-invocable true|false] [--body S] [--body-file PATH] [--scope project|global] [--json]
  node cli.mjs edit skill <name> [--new-name S] [--description S] [--when-to-use S] [--license S]
                  [--user-invocable true|false] [--body S] [--body-file PATH] [--scope project|global] [--json]
  node cli.mjs create mcp <serverName> [--transport stdio|streamable-http] [--command CMD]
                  [--args a,b] [--env k=v,...] [--url U] [--headers k=v,...] [--scope project|global] [--json]
  node cli.mjs edit mcp <name|id> [same flags as create mcp] [--scope project|global] [--json]
  node cli.mjs enable  <skill|mcp> <name> [--scope project|global] [--json]
  node cli.mjs disable <skill|mcp> <name> [--scope project|global] [--json]
  node cli.mjs remove  <skill|mcp> <name> [--scope project|global] [--json]
  node cli.mjs folder <path> [--json]
  node cli.mjs state [--json]
`

function parseArgs(argv) {
  const args = argv.slice(2)
  const flags = { json: false, dryRun: false, scope: 'global', names: null, kind: 'all' }
  const positional = []
  const valueFlags = new Set([
    '--scope', '--names', '--description', '--when-to-use', '--license', '--allowed-tools',
    '--user-invocable', '--body', '--body-file', '--new-name', '--transport', '--command',
    '--args', '--env', '--url', '--headers',
  ])
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--json') flags.json = true
    else if (a === '--dry-run') flags.dryRun = true
    else if (a === '--skills') flags.kind = 'skills'
    else if (a === '--mcp') flags.kind = 'mcp'
    else if (a === '--all') flags.kind = 'all'
    else if (valueFlags.has(a)) flags[a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = args[++i]
    else positional.push(a)
  }
  return { flags, positional }
}

// --args a,b,c / --env k=v,k2=v2 style list parsers.
function splitList(value) {
  if (value === undefined || value === null) return undefined
  return String(value).split(',').map((s) => s.trim()).filter(Boolean)
}

function splitPairs(value) {
  if (value === undefined || value === null) return undefined
  const out = {}
  for (const part of String(value).split(',')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
  }
  return out
}

function boolFlag(value) {
  if (value === undefined) return undefined
  const s = String(value).toLowerCase()
  return s === 'true' || s === 'yes' || s === 'on' || s === '1'
}

function readBody(flags) {
  if (flags.body !== undefined) return flags.body
  if (flags.bodyFile) return fs.readFileSync(flags.bodyFile, 'utf8')
  return undefined
}

function out(flags, data) {
  if (flags.json) {
    console.log(JSON.stringify(data, null, 2))
  } else {
    printText(data)
  }
}

function printText(data) {
  // data is the structured result; render a compact human view.
  if (data.command === 'list') {
    renderList(data)
  } else if (data.command === 'discover') {
    renderDiscover(data)
  } else if (data.command === 'import') {
    renderImport(data)
  } else {
    renderAction(data)
  }
}

function renderList(data) {
  console.log(`Workspace: ${data.projectRoot}`)
  console.log(`\nSkills (${data.skills.length}):`)
  for (const s of data.skills) {
    const state = s.enabled ? 'enabled ' : 'DISABLED'
    console.log(`  [${state}] ${s.name}  (${s.scope}/${s.source})  ${s.description.slice(0, 60)}`)
  }
  console.log(`\nMCP servers (${data.mcp.length}):`)
  for (const m of data.mcp) {
    const state = m.enabled ? 'enabled ' : 'DISABLED'
    console.log(`  [${state}] ${m.serverName}  (${m.transport || '?'})  ${m.source}`)
  }
}

function renderDiscover(data) {
  console.log(`Discovered from ${data.source}:`)
  console.log(`\nSkills (${data.skills.length}):`)
  for (const s of data.skills) {
    console.log(`  ${s.name}  [${s.scope}]  ${s.description.slice(0, 60)}`)
  }
  console.log(`\nMCP servers (${data.mcp.length}):`)
  for (const m of data.mcp) {
    console.log(`  ${m.name}  [${m.scope}]  ${m.transport}${m.transport === 'stdio' ? '  ' + m.command : '  ' + (m.url || '')}`)
  }
}

function renderImport(data) {
  for (const line of data.lines) console.log(line)
}

function renderAction(data) {
  console.log(JSON.stringify(data, null, 2))
}

async function main() {
  const { flags, positional } = parseArgs(process.argv)
  const cmd = positional[0]
  const cwd = process.cwd()

  if (!cmd) {
    process.stdout.write(USAGE)
    process.exit(0)
  }

  try {
    if (cmd === 'list') {
      const data = { command: 'list', projectRoot: projectRoot(cwd), skills: [], mcp: [] }
      if (flags.kind === 'skills') data.skills = listSkills(cwd)
      else if (flags.kind === 'mcp') data.mcp = listMcp(cwd)
      else {
        const all = listAll(cwd)
        data.skills = all.skills
        data.mcp = all.mcp
      }
      return out(flags, data)
    }

    if (cmd === 'get') {
      const kind = positional[1]
      const name = positional[2]
      if (kind !== 'skill' || !name) {
        process.stderr.write('get requires: skill <name>\n')
        process.exit(2)
      }
      const skill = readSkill(name, flags.scope, cwd)
      return out(flags, { command: 'get', kind, name, scope: flags.scope, ...skill })
    }

    if (cmd === 'create' && positional[1] === 'skill') {
      const name = positional[2]
      if (!name) {
        process.stderr.write('create skill requires a name\n')
        process.exit(2)
      }
      const r = createSkill({
        name,
        description: flags.description,
        whenToUse: flags.whenToUse,
        license: flags.license,
        allowedTools: flags.allowedTools,
        userInvocable: boolFlag(flags.userInvocable),
        body: readBody(flags),
      }, flags.scope, cwd)
      return out(flags, { command: 'create', kind: 'skill', ...r })
    }

    if (cmd === 'edit' && positional[1] === 'skill') {
      const name = positional[2]
      if (!name) {
        process.stderr.write('edit skill requires a name\n')
        process.exit(2)
      }
      const r = updateSkill(name, {
        newName: flags.newName,
        description: flags.description,
        whenToUse: flags.whenToUse,
        license: flags.license,
        allowedTools: flags.allowedTools,
        userInvocable: boolFlag(flags.userInvocable),
        body: readBody(flags),
      }, flags.scope, cwd)
      return out(flags, { command: 'edit', kind: 'skill', ...r })
    }

    if (cmd === 'create' && positional[1] === 'mcp') {
      const serverName = positional[2]
      if (!serverName) {
        process.stderr.write('create mcp requires a serverName\n')
        process.exit(2)
      }
      const r = upsertMcp({
        serverName,
        transport: flags.transport,
        command: flags.command,
        args: splitList(flags.args),
        env: splitPairs(flags.env),
        url: flags.url,
        headers: splitPairs(flags.headers),
      }, flags.scope, cwd)
      return out(flags, { command: 'create', kind: 'mcp', ...r })
    }

    if (cmd === 'edit' && positional[1] === 'mcp') {
      const name = positional[2]
      if (!name) {
        process.stderr.write('edit mcp requires a serverName or id\n')
        process.exit(2)
      }
      const r = upsertMcp({
        id: name,
        serverName: flags.serverName,
        transport: flags.transport,
        command: flags.command,
        args: splitList(flags.args),
        env: splitPairs(flags.env),
        url: flags.url,
        headers: splitPairs(flags.headers),
      }, flags.scope, cwd)
      return out(flags, { command: 'edit', kind: 'mcp', ...r })
    }

    if (cmd === 'folder') {
      const folder = positional[1]
      if (!folder) {
        process.stderr.write('folder requires a path\n')
        process.exit(2)
      }
      const state = writeState({ projectFolder: folder })
      return out(flags, { command: 'folder', projectFolder: state.projectFolder })
    }

    if (cmd === 'state') {
      return out(flags, { command: 'state', ...readState() })
    }

    if (cmd === 'discover') {
      const source = positional[1]
      if (!source || !['claude', 'codex'].includes(source)) {
        process.stderr.write('discover requires <claude|codex>\n')
        process.exit(2)
      }
      const d = discover(source, cwd)
      // Omit bulky skill bodies from the discover surface (they are only needed
      // at import time).
      const skills = d.skills.map(({ body, ...rest }) => ({ ...rest, bodyBytes: (body || '').length }))
      const data = { command: 'discover', source, skills: [], mcp: [] }
      if (flags.kind === 'skills') data.skills = skills
      else if (flags.kind === 'mcp') data.mcp = d.mcp
      else {
        data.skills = skills
        data.mcp = d.mcp
      }
      return out(flags, data)
    }

    if (cmd === 'import') {
      const source = positional[1]
      if (!source || !['claude', 'codex'].includes(source)) {
        process.stderr.write('import requires <claude|codex>\n')
        process.exit(2)
      }
      if (flags.kind === 'all') {
        process.stderr.write('import requires --skills or --mcp\n')
        process.exit(2)
      }
      const d = discover(source, cwd)
      const names = flags.names ? flags.names.split(',').map((s) => s.trim()).filter(Boolean) : null

      if (flags.kind === 'skills') {
        const items = d.skills.filter((s) => !names || names.includes(s.name))
        const lines = []
        const results = []
        for (const item of items) {
          const skillMd = skillItemToSkillMd(item)
          if (flags.dryRun) {
            results.push({ name: item.name, scope: flags.scope, dryRun: true })
            lines.push(`[dry-run] would install skill "${item.name}" -> ${flags.scope}`)
            continue
          }
          const file = installSkill({ ...item, skillMd }, flags.scope, cwd)
          results.push({ name: item.name, scope: flags.scope, file })
          lines.push(`installed skill "${item.name}" -> ${file}`)
        }
        return out(flags, { command: 'import', kind: 'skills', source, scope: flags.scope, dryRun: flags.dryRun, results, lines })
      }

      // mcp
      const items = d.mcp.filter((m) => !names || names.includes(m.name) || names.includes(normalizeServerName(m.name)))
      const entries = items.map(mcpItemToInsertEntry)
      const lines = []
      const results = []
      if (flags.dryRun) {
        for (const e of entries) {
          results.push({ id: e.id, serverName: e.config.serverName, scope: flags.scope, dryRun: true })
          lines.push(`[dry-run] would install MCP "${e.config.serverName}" (${e.config.transport}) -> ${flags.scope}`)
        }
        return out(flags, { command: 'import', kind: 'mcp', source, scope: flags.scope, dryRun: true, results, lines })
      }
      if (flags.scope === 'project') {
        const r = installMcpProject(entries, cwd)
        lines.push(`wrote manifest ${r.manifest}`)
        lines.push(`generated/updated project preset ${r.preset}`)
        lines.push('note: DSH has no per-project MCP mount; select the project preset in the session roster to activate these servers.')
        for (const id of r.ids) results.push({ id, scope: 'project' })
      } else {
        const r = installMcpGlobal(entries)
        for (const e of r) {
          results.push({ id: e.id, serverName: e.serverName, scope: 'global' })
          lines.push(`installed MCP "${e.serverName}" -> ${e.path}`)
        }
        lines.push('note: restart the DSH session (or HMR reload the host) to connect new servers.')
      }
      return out(flags, { command: 'import', kind: 'mcp', source, scope: flags.scope, results, lines })
    }

    if (cmd === 'enable' || cmd === 'disable') {
      const kind = positional[1]
      const name = positional[2]
      if (!kind || !name) {
        process.stderr.write(`${cmd} requires <skill|mcp> <name>\n`)
        process.exit(2)
      }
      const disabled = cmd === 'disable'
      if (kind === 'skill') {
        const r = toggleSkill(name, flags.scope, disabled, cwd)
        return out(flags, { command: cmd, kind, name, disabled, scope: flags.scope, file: r.file })
      }
      if (kind === 'mcp') {
        const r = flags.scope === 'project'
          ? toggleMcpProject(name, disabled, cwd)
          : toggleMcpGlobal(name, disabled)
        return out(flags, { command: cmd, kind, name, disabled, scope: flags.scope, ...r })
      }
      process.stderr.write(`unknown kind: ${kind}\n`)
      process.exit(2)
    }

    if (cmd === 'remove') {
      const kind = positional[1]
      const name = positional[2]
      if (!kind || !name) {
        process.stderr.write('remove requires <skill|mcp> <name>\n')
        process.exit(2)
      }
      if (kind === 'skill') {
        const removed = removeSkill(name, flags.scope, cwd)
        return out(flags, { command: cmd, kind, name, scope: flags.scope, removed })
      }
      if (kind === 'mcp') {
        const r = flags.scope === 'project' ? removeMcpProject(name, cwd) : removeMcpGlobal(name)
        return out(flags, { command: cmd, kind, name, scope: flags.scope, ...r })
      }
      process.stderr.write(`unknown kind: ${kind}\n`)
      process.exit(2)
    }

    process.stderr.write(USAGE)
    process.exit(2)
  } catch (err) {
    process.stderr.write(`error: ${err && err.message ? err.message : err}\n`)
    process.exit(1)
  }
}

main()
