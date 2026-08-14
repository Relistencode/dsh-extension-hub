// Host half of the durable dsh-extension-hub plugin.
//
// A TypertRemoteService gateway exposed under the `extensionHub` wire
// namespace. Every Remote method is a thin JSON seam over the dependency-free
// persistence core in this package (lib/*.mjs), which owns all real file
// reads/writes — the same core the CLI wraps. The browser half
// (lib/client.js) calls these methods through `the mounted Remote namespace`.
//
// Mounted in the profile composition as:
//   - insert:
//       - id: extension-hub
//         name: dsh-extension-hub
//
// Remote methods are registered with markRemote() instead of the @Remote
// decorator (plain-JS compatibility: the runtime does not parse decorators).
// The mechanics are identical to the decorator — the marker table is private
// module state inside dsh-typert-protocol, filled through the decorator
// context's addInitializer.
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { listAll, listSkills, listMcp } from './list.mjs'
import { readSkill, createSkill, updateSkill } from './skills.mjs'
import { removeSkill, toggleSkill, installSkill, installMcpGlobal, installMcpProject } from './install.mjs'
import { upsertMcp, removeMcp, toggleMcp, getMcpEntry } from './mcp.mjs'
import { discover } from './discover.mjs'
import { skillItemToSkillMd, mcpItemToInsertEntry, normalizeServerName } from './convert.mjs'
import { projectRoot, projectSlug, projectMcpManifest, dshHome } from './paths.mjs'
import { readState, writeState } from './state.mjs'
import { listPlugins as pluginSnapshot, removePluginRow, discoverPlugins, installPlugin, pluginsDir, updateNpmPackage, checkPluginUpdates as pluginUpdates, updatePluginItem } from './plugins.mjs'
import { setServerDisabled, removeServer } from './region.mjs'

const execFileAsync = promisify(execFile)

// ── Remote marker plumbing (decorator-free @Remote) ─────────────────────────

const remoteMarks = []

function markRemote(proto, method, exportName) {
  const context = {
    kind: 'method',
    name: method,
    private: false,
    static: false,
    addInitializer(fn) {
      remoteMarks.push({ proto, method, exportName, fn })
    },
  }
  Remote(exportName || method)(proto[method], context)
}

function runRemoteMarks(instance) {
  const proto = Object.getPrototypeOf(instance)
  for (const mark of remoteMarks) {
    if (mark.proto === proto) mark.fn.call(instance)
  }
}

// Remote results cross the JSON boundary: strip undefined-valued properties
// (and recurse) so every method returns a JSON-safe plain value.
function jsonSafe(value) {
  if (Array.isArray(value)) {
    const out = []
    for (const item of value) out.push(jsonSafe(item))
    return out
  }
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value)) {
      const item = jsonSafe(value[key])
      if (item !== undefined) out[key] = item
    }
    return out
  }
  return value
}

// ── Gateway ─────────────────────────────────────────────────────────────────

class extensionHubGateway extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, 'extensionHub')
    runRemoteMarks(this)
  }

  // The folder project-scope operations target: explicit `folder` input wins,
  // else the remembered folder, else the host process cwd.
  _projectFolder(input) {
    const folder = input && typeof input.folder === 'string' && input.folder.trim() !== ''
      ? input.folder.trim()
      : (readState().projectFolder || process.cwd())
    return folder
  }

  list(input) {
    input = input || {}
    const kind = input.kind || 'all'
    const folder = this._projectFolder(input)
    if (kind === 'skills') return jsonSafe({ skills: listSkills(folder), mcp: [] })
    if (kind === 'mcp') return jsonSafe({ skills: [], mcp: listMcp(folder) })
    const all = listAll(folder)
    return jsonSafe({ skills: all.skills, mcp: all.mcp })
  }

  getSkill(input) {
    input = input || {}
    return jsonSafe(readSkill(input.name, input.scope || 'global', this._projectFolder(input)))
  }

  // Read-only skills live in shipped presets or generated preset layers; the
  // manager only edits user/project roots. Guard every mutating skill method.
  _assertSkillWritable(name, scope, folder) {
    const hit = listSkills(folder).find((s) => s.name === name && s.scope === scope)
    if (hit && hit.readOnly) {
      throw new Error(`技能 "${name}" 来自只读层(${hit.source})，不能直接修改。请在用户或项目目录新建同名技能。`)
    }
  }

  createSkill(input) {
    input = input || {}
    return createSkill(input, input.scope || 'global', this._projectFolder(input))
  }

  updateSkill(input) {
    input = input || {}
    this._assertSkillWritable(input.name, input.scope || 'global', this._projectFolder(input))
    return updateSkill(input.name, input, input.scope || 'global', this._projectFolder(input))
  }

  removeSkill(input) {
    input = input || {}
    this._assertSkillWritable(input.name, input.scope || 'global', this._projectFolder(input))
    return { removed: removeSkill(input.name, input.scope || 'global', this._projectFolder(input)) }
  }

  toggleSkill(input) {
    input = input || {}
    this._assertSkillWritable(input.name, input.scope || 'global', this._projectFolder(input))
    return toggleSkill(input.name, input.scope || 'global', !!input.disabled, this._projectFolder(input))
  }

  getMcp(input) {
    input = input || {}
    return jsonSafe(getMcpEntry(input.id, input.scope || 'global', this._projectFolder(input)))
  }

  upsertMcp(input) {
    input = input || {}
    return upsertMcp(input, input.scope || 'global', this._projectFolder(input))
  }

  removeMcp(input) {
    input = input || {}
    return removeMcp(input.id || input.name, input.scope || 'global', this._projectFolder(input))
  }

  toggleMcp(input) {
    input = input || {}
    return toggleMcp(input.id || input.name, !!input.disabled, input.scope || 'global', this._projectFolder(input))
  }

  discover(input) {
    input = input || {}
    const source = input.source === 'codex' ? 'codex' : 'claude'
    const folder = this._projectFolder(input)
    const d = discover(source, folder)
    const skills = (d.skills || []).map(({ body, ...rest }) => ({ ...rest, bodyBytes: (body || '').length }))
    return jsonSafe({ source, skills, mcp: d.mcp || [] })
  }

  importItems(input) {
    input = input || {}
    const source = input.source === 'codex' ? 'codex' : 'claude'
    const kind = input.kind || 'all'
    const scope = input.scope || 'global'
    const folder = this._projectFolder(input)
    const names = Array.isArray(input.names) && input.names.length ? new Set(input.names) : null
    const d = discover(source, folder)
    const results = []
    if (kind === 'skills' || kind === 'all') {
      for (const item of d.skills || []) {
        if (names && !names.has(item.name)) continue
        const file = installSkill({ ...item, skillMd: skillItemToSkillMd(item) }, scope, folder)
        results.push({ kind: 'skill', name: item.name, scope, file })
      }
    }
    if (kind === 'mcp' || kind === 'all') {
      const entries = (d.mcp || [])
        .filter((m) => !names || names.has(m.name) || names.has(normalizeServerName(m.name)))
        .map(mcpItemToInsertEntry)
      if (scope === 'project') {
        const r = installMcpProject(entries, folder)
        for (const e of entries) {
          results.push({ kind: 'mcp', id: e.id, name: e.config.serverName, scope, manifest: r.manifest, preset: r.preset })
        }
      } else {
        const r = installMcpGlobal(entries)
        for (const e of r) results.push({ kind: 'mcp', id: e.id, name: e.serverName, scope, path: e.path })
      }
    }
    return jsonSafe({ source, kind, scope, folder, results })
  }

  projectInfo(input) {
    input = input || {}
    const folder = this._projectFolder(input)
    const root = projectRoot(folder)
    return {
      folder,
      projectRoot: root,
      slug: projectSlug(folder),
      manifest: projectMcpManifest(folder),
    }
  }

  getState(input) {
    input = input || {}
    return readState()
  }

  setState(input) {
    input = input || {}
    return writeState(input.patch || {})
  }

  // Directory picking. The host capability seam decides the interaction:
  // native opens the OS chooser on the host display; browse tells the client
  // to render an in-app browser over listDirectory/createDirectory.
  async pickProjectFolder(input) {
    input = input || {}
    const picker = this.ctx.get('directoryPicker')
    if (!picker) return { capability: 'none' }
    const cap = picker.capability()
    if (cap.kind === 'native') {
      const picked = await cap.pick(new AbortController().signal)
      return { capability: 'native', path: typeof picked === 'string' && picked !== '' ? picked : null }
    }
    if (cap.kind === 'browse') return { capability: 'browse' }
    return { capability: 'none' }
  }

  listDirectory(input) {
    input = input || {}
    const picker = this.ctx.get('directoryPicker')
    const cap = picker && picker.capability()
    if (!cap || cap.kind !== 'browse') throw new Error('directory browse is unavailable on this host')
    return cap.list(input.path || undefined)
  }

  createDirectory(input) {
    input = input || {}
    const picker = this.ctx.get('directoryPicker')
    const cap = picker && picker.capability()
    if (!cap || cap.kind !== 'browse') throw new Error('directory browse is unavailable on this host')
    return cap.createDirectory(input.path, input.name)
  }

  // Plugin manager tab: enumerate every non-group Loader entry with
  // provenance classification (official @deepseek-ai bundle rows vs other)
  // and a best-effort package description.
  listPlugins(input) {
    input = input || {}
    return jsonSafe(pluginSnapshot(this.ctx, path.join(dshHome(), 'profiles', 'web')))
  }

  // Enable/disable a plugin row by writing a `disabled` override into the
  // managed region of the profile cordis.patch.yml (later layers win, so the
  // override beats any earlier row, official bundle rows included). Takes
  // effect on the next dsh web start.
  setPluginEnabled(input) {
    input = input || {}
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (id === '') throw new Error('missing plugin id')
    const patchPath = path.join(dshHome(), 'profiles', 'web', 'cordis.patch.yml')
    if (input.enabled) removeServer(patchPath, id)
    else setServerDisabled(patchPath, id, true)
    return jsonSafe({ ok: true, pending: true, id })
  }

  // Uninstall a plugin row by deleting its insert block from the profile
  // cordis.patch.yml. Built-in bundle rows are not physically present in the
  // file, so they report ok:false (disable them instead). When the row points
  // at a local clone under the managed plugins dir, the clone is removed too.
  // Takes effect on the next dsh web start.
  removePlugin(input) {
    input = input || {}
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (id === '') throw new Error('missing plugin id')
    const patchPath = path.join(dshHome(), 'profiles', 'web', 'cordis.patch.yml')
    const result = removePluginRow(patchPath, id)
    if (!result.removed) {
      return jsonSafe({ ok: false, message: '未在配置中找到该插件行（内置插件无法卸载，只能停用）' })
    }
    let message = '已从配置移除，重启 dsh web 后生效'
    if (typeof result.name === 'string' && result.name !== '') {
      const dir = pluginsDir()
      const resolved = path.resolve(result.name)
      if (resolved.startsWith(path.resolve(dir) + path.sep) && fs.existsSync(resolved)) {
        try {
          fs.rmSync(resolved, { recursive: true, force: true })
          message += '；已删除本地克隆目录'
        } catch {
          // directory removal failed; keep going
        }
      }
    }
    return jsonSafe({ ok: true, pending: true, id, message })
  }

  // Discover tab: search GitHub for repositories tagged dsh-plugin.
  async discoverPlugins(input) {
    input = input || {}
    const query = typeof input.query === 'string' ? input.query : ''
    const page = Number.isInteger(input.page) && input.page > 0 ? input.page : 1
    return jsonSafe(await discoverPlugins(path.join(dshHome(), 'profiles', 'web'), query, page))
  }

  // Discover tab: clone a GitHub repository and register it as a plugin row.
  async installPlugin(input) {
    input = input || {}
    const repo = typeof input.repo === 'string' ? input.repo : ''
    return jsonSafe(await installPlugin(path.join(dshHome(), 'profiles', 'web'), repo))
  }

  // Compare the locally installed package version against the npm registry.
  // status: update-available | up-to-date | not-published | error
  async checkUpdates(input) {
    input = input || {}
    let current = null
    try {
      const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
      current = typeof pkg.version === 'string' ? pkg.version : null
    } catch {
      // version unreadable; still attempt the registry check
    }
    try {
      const res = await fetch('https://registry.npmjs.org/dsh-extension-hub/latest', { signal: AbortSignal.timeout(8000) })
      if (res.status === 404) return jsonSafe({ status: 'not-published', current })
      if (!res.ok) return jsonSafe({ status: 'error', current, message: `registry HTTP ${res.status}` })
      const data = await res.json()
      const latest = data && typeof data.version === 'string' ? data.version : null
      if (!latest) return jsonSafe({ status: 'error', current, message: 'registry returned no version' })
      return jsonSafe({ status: latest === current ? 'up-to-date' : 'update-available', current, latest })
    } catch (error) {
      return jsonSafe({ status: 'error', current, message: error && error.message ? error.message : String(error) })
    }
  }

  // Upgrade this plugin in the web profile WITHOUT pnpm (tarball download,
  // system tar, replace node_modules, update the dependency declaration).
  // A restart of dsh web is required for the new code to take effect.
  async updatePlugin(input) {
    input = input || {}
    const result = await updateNpmPackage(path.join(dshHome(), 'profiles', 'web'), 'dsh-extension-hub')
    return jsonSafe(result)
  }

  // Plugin manager: check every non-official plugin for a newer version
  // (npm registry for packages, origin HEAD for local git clones).
  async checkPluginUpdates(input) {
    input = input || {}
    const result = await pluginUpdates(this.ctx, path.join(dshHome(), 'profiles', 'web'))
    return jsonSafe(result)
  }

  // Plugin manager: update one plugin by its source kind.
  async updatePluginItem(input) {
    input = input || {}
    const name = typeof input.name === 'string' ? input.name : ''
    if (name === '') throw new Error('missing plugin name')
    const result = await updatePluginItem(path.join(dshHome(), 'profiles', 'web'), name)
    return jsonSafe(result)
  }
}

// Register Remote methods (declaration order = wire order).
for (const [method, exportName] of [
  ['list', undefined],
  ['getSkill', undefined],
  ['createSkill', undefined],
  ['updateSkill', undefined],
  ['removeSkill', undefined],
  ['toggleSkill', undefined],
  ['getMcp', undefined],
  ['upsertMcp', undefined],
  ['removeMcp', undefined],
  ['toggleMcp', undefined],
  ['discover', undefined],
  ['importItems', undefined],
  ['projectInfo', undefined],
  ['getState', undefined],
  ['setState', undefined],
  ['pickProjectFolder', undefined],
  ['listDirectory', undefined],
  ['createDirectory', undefined],
  ['listPlugins', undefined],
  ['setPluginEnabled', undefined],
  ['removePlugin', undefined],
  ['discoverPlugins', undefined],
  ['installPlugin', undefined],
  ['checkPluginUpdates', undefined],
  ['updatePluginItem', undefined],
  ['checkUpdates', undefined],
  ['updatePlugin', undefined],
]) {
  markRemote(extensionHubGateway.prototype, method, exportName)
}

export default extensionHubGateway
