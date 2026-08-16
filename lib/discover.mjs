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

/**
 * Merge MCP server groups by priority. Groups are ordered LOW → HIGH and a
 * later group's server with the same name replaces the earlier one, so the
 * most project-local source wins a duplicate — matching Claude Code's
 * precedence (project over user) for both import paths.
 * @param groups - `{ servers, source, scope }` in ascending priority.
 * @param toItem - converts one `(name, entry, source, scope)` into a discovered item.
 * @returns the merged items, invalid entries filtered out.
 */
export function mergeMcpEntries(groups, toItem) {
  const out = new Map()
  for (const { servers, source, scope } of groups) {
    if (!servers || typeof servers !== 'object') continue
    for (const [name, entry] of Object.entries(servers)) {
      out.set(name, toItem(name, entry, source, scope))
    }
  }
  return [...out.values()].filter(Boolean)
}

export function discoverClaudeMcp(cwd = process.cwd()) {
  // Claude Code precedence: project `.mcp.json` > project `.claude.json` >
  // user `~/.claude.json` > `~/.claude/.claude.json`. Groups are ordered
  // low-priority first so a later same-named server wins.
  const groups = []
  const nestedJson = readJson(path.join(CLAUDE_HOME(), '.claude.json'))
  groups.push({ servers: nestedJson && nestedJson.mcpServers, source: 'claude', scope: 'global' })
  const globalJson = readJson(path.join(os.homedir(), '.claude.json'))
  groups.push({ servers: globalJson && globalJson.mcpServers, source: 'claude', scope: 'global' })
  const projectClaudeJson = readJson(path.join(cwd, '.claude.json'))
  groups.push({ servers: projectClaudeJson && projectClaudeJson.mcpServers, source: 'claude', scope: 'project' })
  const projectMcp = readJson(path.join(cwd, '.mcp.json'))
  groups.push({ servers: projectMcp && projectMcp.mcpServers, source: 'claude', scope: 'project' })
  return mergeMcpEntries(groups, claudeMcpEntryToItem)
}

function codexMcpEntryToItem(name, entry, source, scope) {
  if (!entry || typeof entry !== 'object') return null
  const type = String(entry.type || 'stdio').toLowerCase()
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
      timeoutSec: entry.startup_timeout_sec,
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
    timeoutSec: entry.startup_timeout_sec,
  }
}

export function discoverCodexMcp(cwd = process.cwd()) {
  // Precedence: project `.codex/config.toml` > user `~/.codex/config.toml`.
  // Groups are ordered low-priority first so a later same-named server wins.
  const groups = []
  const globalToml = readToml(path.join(CODEX_HOME(), 'config.toml'))
  groups.push({ servers: globalToml && globalToml.mcp_servers, source: 'codex', scope: 'global' })
  const projectToml = readToml(path.join(cwd, '.codex', 'config.toml'))
  groups.push({ servers: projectToml && projectToml.mcp_servers, source: 'codex', scope: 'project' })
  return mergeMcpEntries(groups, codexMcpEntryToItem)
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
