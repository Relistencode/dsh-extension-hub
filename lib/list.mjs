import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parseYaml, splitFrontmatter } from './yaml.mjs'
import {
  hostPatchPath,
  userPresetsRoot,
  userSkillsRoot,
  userAgentsSkillsRoot,
  projectSkillsRoot,
  projectRoot,
  projectMcpManifest,
  dshHome,
} from './paths.mjs'

const MCP_CLIENT = '@deepseek-ai/dsh-mcp-client'

function kebab(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ── Skills ──────────────────────────────────────────────────────────────────

function scanDsHackSkillRoot(root, scope, source, readOnly = false) {
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
      const file = path.join(root, ent.name, 'SKILL.md')
      if (fs.existsSync(file)) out.push(readDshSkill(file, ent.name, scope, source, readOnly))
    } else if (ent.name.endsWith('.md')) {
      out.push(readDshSkill(path.join(root, ent.name), ent.name.slice(0, -3), scope, source, readOnly))
    }
  }
  return out
}

function readDshSkill(file, fallbackName, scope, source, readOnly = false) {
  try {
    const text = fs.readFileSync(file, 'utf8')
    const { frontmatter, body } = splitFrontmatter(text)
    const fm = frontmatter || {}
    const name = kebab(String(fm.name || fallbackName))
    const description = typeof fm.description === 'string' ? fm.description : ''
    const disable = boolOf(fm['disable-model-invocation'])
    const userInvocable = fm['user-invocable'] === undefined ? true : boolOf(fm['user-invocable'])
    const out = {
      kind: 'skill',
      name,
      description,
      enabled: !disable,
      userInvocable,
      scope,
      source,
      path: file,
      hasBody: !!body,
      readOnly,
    }
    if (typeof fm.whenToUse === 'string' && fm.whenToUse !== '') out.whenToUse = fm.whenToUse
    return out
  } catch {
    return null
  }
}

function boolOf(v) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.toLowerCase()
    return s === 'true' || s === 'yes' || s === 'on' || s === '1'
  }
  return false
}

export function listSkills(cwd = process.cwd()) {
  const roots = [
    { root: path.join(projectRoot(cwd), '.dsh', 'skills'), scope: 'project', source: 'project-dsh' },
    { root: path.join(projectRoot(cwd), '.agents', 'skills'), scope: 'project', source: 'project-agents' },
    { root: userSkillsRoot(), scope: 'global', source: 'user-dsh' },
    { root: userAgentsSkillsRoot(), scope: 'global', source: 'user-agents' },
  ]
  const seen = new Set()
  const out = []
  for (const { root, scope, source } of roots) {
    for (const s of scanDsHackSkillRoot(root, scope, source)) {
      if (!s || !s.name) continue
      if (seen.has(s.name)) continue
      seen.add(s.name)
      out.push(s)
    }
  }
  // Read-only layers: skills bundled with the deployment (shipped presets)
  // and skills shipped inside user-authored presets. Listed for visibility
  // with readOnly: true — the manager never edits these files.
  for (const s of scanShippedSkills()) {
    if (!s || !s.name) continue
    if (seen.has(s.name)) continue
    seen.add(s.name)
    out.push(s)
  }
  for (const s of scanPresetSkills()) {
    if (!s || !s.name) continue
    if (seen.has(s.name)) continue
    seen.add(s.name)
    out.push(s)
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

// Deployment-bundled presets (read-only deployment config).
export function shippedPresetRoots() {
  const roots = []
  const home = dshHome()
  const candidates = [
    path.join(home, 'profiles', 'node_modules', '@deepseek-ai', 'dsh', 'config', 'agent-presets'),
    path.join(home, 'node_modules', '@deepseek-ai', 'dsh', 'config', 'agent-presets'),
  ]
  const npxRoot = path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_npx')
  try {
    for (const entry of fs.readdirSync(npxRoot)) {
      candidates.push(path.join(npxRoot, entry, 'node_modules', '@deepseek-ai', 'dsh', 'config', 'agent-presets'))
    }
  } catch {
    // ignore
  }
  for (const root of candidates) {
    if (!fs.existsSync(root)) continue
    for (const preset of fs.readdirSync(root)) {
      const dir = path.join(root, preset)
      if (!fs.statSync(dir).isDirectory()) continue
      if (!fs.existsSync(path.join(dir, 'agent.cordis.yml'))) continue
      roots.push({ name: preset, dir })
    }
  }
  return roots
}

function scanShippedSkills() {
  const out = []
  for (const preset of shippedPresetRoots()) {
    for (const s of scanDsHackSkillRoot(path.join(preset.dir, 'skills'), 'system', `shipped:${preset.name}`, true)) {
      if (s) out.push(s)
    }
  }
  return out
}

function scanPresetSkills() {
  const out = []
  const presetsRoot = userPresetsRoot()
  if (!fs.existsSync(presetsRoot)) return out
  for (const preset of fs.readdirSync(presetsRoot)) {
    const dir = path.join(presetsRoot, preset)
    if (!fs.statSync(dir).isDirectory()) continue
    for (const s of scanDsHackSkillRoot(path.join(dir, 'skills'), 'preset', `preset:${preset}`, true)) {
      if (s) out.push(s)
    }
  }
  return out
}

// ── MCP ─────────────────────────────────────────────────────────────────────

function extractMcpRows(list, location, scope) {
  const rows = []
  const toggles = {}
  for (const entry of list || []) {
    if (!entry || typeof entry !== 'object') continue
    if (Array.isArray(entry.insert)) {
      for (const row of entry.insert) {
        if (row && typeof row === 'object' && String(row.name || '').includes('mcp-client')) {
          rows.push({
            id: row.id,
            serverName: row.config && row.config.serverName ? row.config.serverName : null,
            transport: row.config ? row.config.transport : null,
            disabledInRow: row.disabled === true,
            location,
            scope,
          })
        }
      }
      continue
    }
    // Flat rows (loader-serialized patch): the MCP row itself plus any
    // `disabled` toggle row under the same id.
    if (entry.id === undefined) continue
    if (String(entry.name || '').includes('mcp-client')) {
      rows.push({
        id: entry.id,
        serverName: entry.config && entry.config.serverName ? entry.config.serverName : null,
        transport: entry.config ? entry.config.transport : null,
        disabledInRow: entry.disabled === true,
        location,
        scope,
      })
    }
    if (entry.disabled !== undefined) toggles[entry.id] = entry.disabled === true
  }
  return { rows, toggles }
}

function readYamlFile(file) {
  try {
    return parseYaml(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

export function listMcp(cwd = process.cwd()) {
  const all = []
  const seen = new Set()

  // Home-level patch ($DSH_HOME/cordis.patch.yml): machine-local preferences
  // applied AFTER the profile layer (so a same-named home row wins the
  // composed config). Read-only in this manager: writes always target the
  // profile patch. Handled before the profile patch so the composed winner
  // claims the duplicate name.
  const homePatch = path.join(dshHome(), 'cordis.patch.yml')
  const homeList = readYamlFile(homePatch)
  if (Array.isArray(homeList)) {
    const { rows, toggles } = extractMcpRows(homeList, homePatch, 'home')
    for (const row of rows) {
      const id = row.id
      const disabled = row.disabledInRow || toggles[id] === true
      if (seen.has(id)) continue
      seen.add(id)
      all.push({ kind: 'mcp', id, serverName: row.serverName || id, transport: row.transport, enabled: !disabled, scope: 'home', source: 'home-patch', location: homePatch, locationKind: 'patch', readOnly: true })
    }
  }

  // Host patch
  const patch = hostPatchPath()
  const patchList = readYamlFile(patch)
  if (Array.isArray(patchList)) {
    const { rows, toggles } = extractMcpRows(patchList, patch, 'global')
    for (const row of rows) {
      const id = row.id
      const disabled = row.disabledInRow || toggles[id] === true
      if (seen.has(id)) continue
      seen.add(id)
      all.push({ kind: 'mcp', id, serverName: row.serverName || id, transport: row.transport, enabled: !disabled, scope: 'global', source: 'host-patch', location: patch, locationKind: 'patch' })
    }
  }

  // User presets (including generated *-mcp project presets)
  const presetsRoot = userPresetsRoot()
  if (fs.existsSync(presetsRoot)) {
    for (const preset of fs.readdirSync(presetsRoot)) {
      const file = path.join(presetsRoot, preset, 'agent.cordis.yml')
      if (!fs.existsSync(file)) continue
      const list = readYamlFile(file)
      if (!Array.isArray(list)) continue
      const { rows, toggles } = extractMcpRows(list, file, 'preset')
      for (const row of rows) {
        const id = row.id
        const disabled = row.disabledInRow || toggles[id] === true
        if (seen.has(id)) continue
        seen.add(id)
        const isProject = preset.endsWith('-mcp')
        all.push({ kind: 'mcp', id, serverName: row.serverName || id, transport: row.transport, enabled: !disabled, scope: isProject ? 'project' : 'global', source: isProject ? 'project-preset' : 'preset', location: file, locationKind: 'preset' })
      }
    }
  }

  // Project manifest rows not yet materialized (report as manifest entries)
  const manifest = projectMcpManifest(cwd)
  if (fs.existsSync(manifest)) {
    const manifestList = readYamlFile(manifest)
    for (const entry of manifestList || []) {
      if (!entry || typeof entry !== 'object') continue
      const id = entry.id
      if (seen.has(id)) continue
      seen.add(id)
      all.push({ kind: 'mcp', id, serverName: entry.config ? entry.config.serverName : id, transport: entry.config ? entry.config.transport : null, enabled: true, scope: 'project', source: 'manifest', location: manifest, locationKind: 'manifest' })
    }
  }

  return all.sort((a, b) => String(a.serverName).localeCompare(String(b.serverName)))
}

export function listAll(cwd = process.cwd()) {
  return { skills: listSkills(cwd), mcp: listMcp(cwd) }
}
