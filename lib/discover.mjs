import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { splitFrontmatter } from './yaml.mjs'
import { parseToml } from './toml.mjs'

const CLAUDE_HOME = () => path.join(os.homedir(), '.claude')
const CODEX_HOME = () => path.join(os.homedir(), '.codex')

function kebab(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

// Scan a skill root: `<root>/<name>/SKILL.md` bundles and `<root>/<name>.md`
// flat files. Skips dot-directories (e.g. Codex `.system`).
function scanSkillRoot(root, source, scope) {
  const out = []
  if (!fs.existsSync(root)) return out
  let entries
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return out
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue
    if (ent.isDirectory()) {
      const skillFile = path.join(root, ent.name, 'SKILL.md')
      if (fs.existsSync(skillFile)) out.push(readSkill(skillFile, ent.name, source, scope))
    } else if (ent.name.endsWith('.md')) {
      out.push(readSkill(path.join(root, ent.name), ent.name.slice(0, -3), source, scope))
    }
  }
  return out
}

function readSkill(file, fallbackName, source, scope) {
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return null
  }
  const { frontmatter, body } = splitFrontmatter(text)
  const fm = frontmatter || {}
  const name = kebab(fm.name || fallbackName)
  const description = typeof fm.description === 'string' ? fm.description : ''
  const whenToUse = typeof fm.whenToUse === 'string' ? fm.whenToUse : undefined
  return {
    source,
    scope,
    name,
    description,
    whenToUse,
    path: file,
    body,
    license: fm.license,
    allowedTools: fm['allowed-tools'],
  }
}

function claudeSkillRoots(cwd) {
  const roots = []
  // project first (matches Claude precedence)
  roots.push({ root: path.join(cwd, '.claude', 'skills'), scope: 'project' })
  roots.push({ root: path.join(CLAUDE_HOME(), 'skills'), scope: 'global' })
  // Claude Code plugins ship skills too: ~/.claude/plugins/**/skills
  const plugins = path.join(CLAUDE_HOME(), 'plugins')
  if (fs.existsSync(plugins)) {
    try {
      for (const mp of fs.readdirSync(plugins)) {
        for (const plug of safeReaddir(path.join(plugins, mp))) {
          roots.push({ root: path.join(plugins, mp, plug, 'skills'), scope: 'global' })
        }
      }
    } catch {
      // ignore
    }
  }
  return roots
}

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir)
  } catch {
    return []
  }
}

function codexSkillRoots(cwd) {
  const roots = []
  roots.push({ root: path.join(cwd, '.codex', 'skills'), scope: 'project' })
  roots.push({ root: path.join(CODEX_HOME(), 'skills'), scope: 'global' })
  return roots
}

export function discoverClaudeSkills(cwd = process.cwd()) {
  const out = []
  for (const { root, scope } of claudeSkillRoots(cwd)) {
    for (const s of scanSkillRoot(root, 'claude', scope)) {
      if (s && s.name) out.push(s)
    }
  }
  return dedupeSkills(out)
}

export function discoverCodexSkills(cwd = process.cwd()) {
  const out = []
  for (const { root, scope } of codexSkillRoots(cwd)) {
    for (const s of scanSkillRoot(root, 'codex', scope)) {
      if (s && s.name) out.push(s)
    }
  }
  return dedupeSkills(out)
}

function dedupeSkills(list) {
  const seen = new Set()
  const out = []
  for (const s of list) {
    const key = s.name
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

// ── MCP ─────────────────────────────────────────────────────────────────────

function claudeMcpEntryToItem(name, entry, source, scope) {
  if (!entry || typeof entry !== 'object') return null
  const type = (entry.type || 'stdio').toLowerCase()
  if (type === 'http' || type === 'sse' || type === 'streamable-http') {
    return {
      name,
      source,
      scope,
      transport: 'streamable-http',
      command: null,
      args: [],
      env: {},
      url: entry.url || '',
      headers: entry.headers || {},
      timeoutSec: entry.timeoutSec,
    }
  }
  return {
    name,
    source,
    scope,
    transport: 'stdio',
    command: entry.command || '',
    args: Array.isArray(entry.args) ? entry.args : [],
    env: entry.env && typeof entry.env === 'object' ? entry.env : {},
    url: null,
    headers: {},
    timeoutSec: entry.timeoutSec,
  }
}

export function discoverClaudeMcp(cwd = process.cwd()) {
  const out = new Map()
  // project .mcp.json
  const projectMcp = readJson(path.join(cwd, '.mcp.json'))
  if (projectMcp && projectMcp.mcpServers && typeof projectMcp.mcpServers === 'object') {
    for (const [name, entry] of Object.entries(projectMcp.mcpServers)) {
      out.set(name, claudeMcpEntryToItem(name, entry, 'claude', 'project'))
    }
  }
  // project .claude.json
  const projectClaudeJson = readJson(path.join(cwd, '.claude.json'))
  if (projectClaudeJson && projectClaudeJson.mcpServers) {
    for (const [name, entry] of Object.entries(projectClaudeJson.mcpServers)) {
      out.set(name, claudeMcpEntryToItem(name, entry, 'claude', 'project'))
    }
  }
  // global ~/.claude.json
  const globalJson = readJson(path.join(os.homedir(), '.claude.json'))
  if (globalJson && globalJson.mcpServers && typeof globalJson.mcpServers === 'object') {
    for (const [name, entry] of Object.entries(globalJson.mcpServers)) {
      out.set(name, claudeMcpEntryToItem(name, entry, 'claude', 'global'))
    }
  }
  // ~/.claude/.claude.json
  const nestedJson = readJson(path.join(CLAUDE_HOME(), '.claude.json'))
  if (nestedJson && nestedJson.mcpServers && typeof nestedJson.mcpServers === 'object') {
    for (const [name, entry] of Object.entries(nestedJson.mcpServers)) {
      out.set(name, claudeMcpEntryToItem(name, entry, 'claude', 'global'))
    }
  }
  return [...out.values()].filter(Boolean)
}

function codexMcpEntriesFromToml(toml, source, scope) {
  const out = []
  const servers = toml && toml.mcp_servers
  if (!servers || typeof servers !== 'object') return out
  for (const [name, entry] of Object.entries(servers)) {
    if (!entry || typeof entry !== 'object') continue
    const type = String(entry.type || 'stdio').toLowerCase()
    if (type === 'http' || type === 'sse' || type === 'streamable-http') {
      out.push({
        name,
        source,
        scope,
        transport: 'streamable-http',
        command: null,
        args: [],
        env: {},
        url: entry.url || '',
        headers: entry.headers || {},
        timeoutSec: entry.startup_timeout_sec,
      })
    } else {
      out.push({
        name,
        source,
        scope,
        transport: 'stdio',
        command: entry.command || '',
        args: Array.isArray(entry.args) ? entry.args : [],
        env: entry.env && typeof entry.env === 'object' ? entry.env : {},
        url: null,
        headers: {},
        timeoutSec: entry.startup_timeout_sec,
      })
    }
  }
  return out
}

export function discoverCodexMcp(cwd = process.cwd()) {
  const out = []
  const globalToml = readToml(path.join(CODEX_HOME(), 'config.toml'))
  out.push(...codexMcpEntriesFromToml(globalToml, 'codex', 'global'))
  const projectToml = readToml(path.join(cwd, '.codex', 'config.toml'))
  out.push(...codexMcpEntriesFromToml(projectToml, 'codex', 'project'))
  // project config.toml may also live at <repo>/.codex/config.toml (covered) —
  // de-dupe by name, project wins over global.
  const seen = new Set()
  const result = []
  for (const item of out) {
    if (seen.has(item.name)) continue
    seen.add(item.name)
    result.push(item)
  }
  return result
}

function readToml(file) {
  try {
    return parseToml(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

// ── Combined discovery ──────────────────────────────────────────────────────

export function discover(source, cwd = process.cwd()) {
  if (source === 'claude') {
    return { skills: discoverClaudeSkills(cwd), mcp: discoverClaudeMcp(cwd) }
  }
  if (source === 'codex') {
    return { skills: discoverCodexSkills(cwd), mcp: discoverCodexMcp(cwd) }
  }
  throw new Error(`unknown source: ${source}`)
}
