import fs from 'node:fs'
import path from 'node:path'
import {
  dshHome,
  hostPatchPath,
  userPresetsRoot,
  userSkillsRoot,
  projectSkillsRoot,
  projectMcpManifest,
  projectDshDir,
  projectSlug,
  findShippedStandardPreset,
} from './paths.mjs'
import { mcpItemToInsertEntry } from './convert.mjs'
import { emit } from './emit.mjs'
import { parseYaml } from './yaml.mjs'
import * as region from './region.mjs'

// ── Skills ──────────────────────────────────────────────────────────────────

export function skillTargetDir(scope, cwd = process.cwd()) {
  return scope === 'project' ? projectSkillsRoot(cwd) : userSkillsRoot()
}

export function installSkill(item, scope, cwd = process.cwd()) {
  const dir = path.join(skillTargetDir(scope, cwd), item.name)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'SKILL.md')
  fs.writeFileSync(file, item.skillMd, 'utf8')
  return file
}

export function removeSkill(name, scope, cwd = process.cwd()) {
  const dir = path.join(skillTargetDir(scope, cwd), name)
  const removed = []
  for (const f of [path.join(dir, 'SKILL.md'), path.join(skillTargetDir(scope, cwd), `${name}.md`)]) {
    if (fs.existsSync(f)) {
      fs.rmSync(f)
      removed.push(f)
    }
  }
  // prune empty bundle dir
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmSync(dir, { recursive: true, force: true })
  return removed
}

export function findSkillFile(name, scope, cwd = process.cwd()) {
  const root = skillTargetDir(scope, cwd)
  for (const f of [path.join(root, name, 'SKILL.md'), path.join(root, `${name}.md`)]) {
    if (fs.existsSync(f)) return f
  }
  return null
}

// Enable/disable a skill by setting or removing the DSH frontmatter flags
// `disable-model-invocation` / `user-invocable`. Other frontmatter content is
// preserved verbatim.
export function toggleSkill(name, scope, disabled, cwd = process.cwd()) {
  const file = findSkillFile(name, scope, cwd)
  if (!file) throw new Error(`skill not found: ${name} (${scope})`)
  const text = fs.readFileSync(file, 'utf8')
  const updated = toggleSkillFrontmatter(text, disabled)
  fs.writeFileSync(file, updated, 'utf8')
  return { file, name, disabled }
}

function toggleSkillFrontmatter(text, disable) {
  const norm = text.replace(/\r\n/g, '\n')
  if (!norm.startsWith('---')) {
    // No frontmatter: synthesize one.
    const header = disable ? '---\ndisable-model-invocation: true\nuser-invocable: false\n---\n\n' : '---\n---\n\n'
    return header + norm
  }
  const endIdx = norm.indexOf('\n---', 3)
  if (endIdx === -1) {
    // malformed; fall back to append a header
    return disable ? '---\ndisable-model-invocation: true\nuser-invocable: false\n---\n\n' + norm : norm
  }
  const headerBody = norm.slice(4, endIdx)
  // The closing marker occupies endIdx..endIdx+3 ('\n---'); the rest begins
  // after it so the rebuilt header is not followed by a duplicate '---'.
  const rest = norm.slice(endIdx + 4)
  let lines = headerBody.split('\n').filter((l) => !/^\s*(disable-model-invocation|user-invocable)\s*:/.test(l.trim()))
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
  if (disable) {
    lines.push('disable-model-invocation: true')
    lines.push('user-invocable: false')
  }
  const newHeader = '---\n' + lines.join('\n') + '\n---'
  return newHeader + rest
}

// ── MCP: global (host patch) ────────────────────────────────────────────────

export function installMcpGlobal(entries) {
  const patch = hostPatchPath()
  const out = []
  for (const entry of entries) {
    region.upsertServer(patch, entry)
    out.push({ id: entry.id, serverName: entry.config.serverName, path: patch })
  }
  return out
}

export function removeMcpGlobal(serverName) {
  const patch = hostPatchPath()
  const id = serverName.startsWith('mcp-') ? serverName : `mcp-${serverName}`
  region.removeServer(patch, id)
  return { id, path: patch }
}

export function toggleMcpGlobal(serverName, disabled) {
  const patch = hostPatchPath()
  const id = serverName.startsWith('mcp-') ? serverName : `mcp-${serverName}`
  region.setServerDisabled(patch, id, disabled)
  return { id, disabled, path: patch }
}

// ── MCP: project (manifest + generated preset) ──────────────────────────────

export function readMcpManifest(cwd = process.cwd()) {
  const file = projectMcpManifest(cwd)
  if (!fs.existsSync(file)) return []
  try {
    const v = parseYaml(fs.readFileSync(file, 'utf8'))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function writeMcpManifest(entries, cwd = process.cwd()) {
  const file = projectMcpManifest(cwd)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, emit(entries) + '\n', 'utf8')
  return file
}

function projectPresetDir(cwd = process.cwd()) {
  return path.join(userPresetsRoot(), `${projectSlug(cwd)}-mcp`)
}

function projectPresetFile(cwd = process.cwd()) {
  return path.join(projectPresetDir(cwd), 'agent.cordis.yml')
}

// Generate (or refresh) the dedicated project-MCP preset. The preset is a copy
// of the shipped `standard` composition plus a managed region holding this
// project's MCP rows, so project MCP servers become selectable per session.
export function ensureProjectPreset(entries, cwd = process.cwd()) {
  const dir = projectPresetDir(cwd)
  const file = projectPresetFile(cwd)
  fs.mkdirSync(dir, { recursive: true })

  if (fs.existsSync(file)) {
    for (const entry of entries) region.upsertServer(file, entry)
    return file
  }

  const base = findShippedStandardPreset()
  if (!base) {
    throw new Error(
      `Cannot locate the shipped "standard" preset to use as a base for the ` +
      `project-MCP preset. Set DSH_SHIPPED_PRESETS to the agent-presets directory.`
    )
  }
  const baseText = fs.readFileSync(base, 'utf8')
  // Rebuild the file from the base plus a managed region.
  const regionList = entries.map((entry) => ({ insert: [entry] }))
  const regionText = regionList.length
    ? `# >>> dsh-mcp-skill-manager\n${emit(regionList)}\n# <<< dsh-mcp-skill-manager\n`
    : ''
  fs.writeFileSync(file, baseText.replace(/\n*$/, '\n') + '\n' + regionText, 'utf8')

  const presetYml = path.join(dir, 'preset.yml')
  if (!fs.existsSync(presetYml)) {
    fs.writeFileSync(
      presetYml,
      `name: Project MCP: ${path.basename(projectDshDir(cwd))}\n` +
      `description: Generated by dsh-mcp-skill-manager. Standard tools plus this project's MCP servers.\n`,
      'utf8',
    )
  }
  return file
}

export function installMcpProject(entries, cwd = process.cwd()) {
  // Merge with existing manifest.
  const existing = readMcpManifest(cwd)
  const byId = new Map()
  for (const e of existing) if (e && e.id) byId.set(e.id, e)
  for (const e of entries) byId.set(e.id, e)
  const merged = [...byId.values()]
  const manifest = writeMcpManifest(merged, cwd)
  const preset = ensureProjectPreset(entries, cwd)
  return { manifest, preset, ids: merged.map((e) => e.id) }
}

export function removeMcpProject(serverName, cwd = process.cwd()) {
  const id = serverName.startsWith('mcp-') ? serverName : `mcp-${serverName}`
  const manifest = readMcpManifest(cwd).filter((e) => e.id !== id)
  writeMcpManifest(manifest, cwd)
  const file = projectPresetFile(cwd)
  if (fs.existsSync(file)) region.removeServer(file, id)
  return { id, manifest: projectMcpManifest(cwd), preset: file }
}

export function toggleMcpProject(serverName, disabled, cwd = process.cwd()) {
  const id = serverName.startsWith('mcp-') ? serverName : `mcp-${serverName}`
  const file = projectPresetFile(cwd)
  if (fs.existsSync(file)) region.setServerDisabled(file, id, disabled)
  return { id, disabled, preset: file }
}
