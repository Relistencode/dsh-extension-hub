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

  // Upgrade this plugin in the web profile WITHOUT pnpm: fetch the npm
  // tarball for the latest version, unpack it with the system tar, replace
  // node_modules/dsh-extension-hub, and update the profile dependency
  // declaration. This avoids pnpm's symlink requirements (Windows developer
  // mode / admin), so the update button works for every user. A restart of
  // dsh web is required for the new code to take effect.
  async updatePlugin(input) {
    input = input || {}
    const webDir = path.join(dshHome(), 'profiles', 'web')
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-hub-'))
    try {
      // 1. Resolve the latest published version.
      const res = await fetch('https://registry.npmjs.org/dsh-extension-hub/latest', { signal: AbortSignal.timeout(10000) })
      if (res.status === 404) return jsonSafe({ ok: false, message: 'package not published on npm' })
      if (!res.ok) return jsonSafe({ ok: false, message: `registry HTTP ${res.status}` })
      const meta = await res.json()
      const latest = meta && typeof meta.version === 'string' ? meta.version : null
      if (!latest) return jsonSafe({ ok: false, message: 'registry returned no version' })

      // 2. Download the tarball and unpack it with the system tar.
      const tgzRes = await fetch(`https://registry.npmjs.org/dsh-extension-hub/-/dsh-extension-hub-${latest}.tgz`, { signal: AbortSignal.timeout(60000) })
      if (!tgzRes.ok) return jsonSafe({ ok: false, message: `download HTTP ${tgzRes.status}` })
      const tarPath = path.join(tmpDir, 'pkg.tgz')
      fs.writeFileSync(tarPath, Buffer.from(await tgzRes.arrayBuffer()))
      await execFileAsync(process.platform === 'win32' ? 'tar.exe' : 'tar', ['-xzf', tarPath, '-C', tmpDir], { timeout: 60000, windowsHide: true })

      // 3. Validate the unpacked package.
      const pkgJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package', 'package.json'), 'utf8'))
      if (pkgJson.name !== 'dsh-extension-hub' || pkgJson.version !== latest) {
        return jsonSafe({ ok: false, message: 'downloaded package failed validation' })
      }

      // 4. Replace the installed package directory (junction or real dir).
      const target = path.join(webDir, 'node_modules', 'dsh-extension-hub')
      try {
        fs.rmSync(target, { recursive: true, force: true })
      } catch {
        // junction removal can race; retry once
        try { fs.rmSync(target, { recursive: true, force: true }) } catch { /* keep going */ }
      }
      fs.cpSync(path.join(tmpDir, 'package'), target, { recursive: true })

      // 5. Update the profile dependency declaration to ^latest.
      const profilePkg = path.join(webDir, 'package.json')
      const pp = JSON.parse(fs.readFileSync(profilePkg, 'utf8'))
      if (pp.dependencies && pp.dependencies['dsh-extension-hub']) {
        pp.dependencies['dsh-extension-hub'] = '^' + latest
        fs.writeFileSync(profilePkg, JSON.stringify(pp, null, 2) + '\n', 'utf8')
      }
      return jsonSafe({ ok: true, version: latest })
    } catch (error) {
      const message = error && error.message ? String(error.message) : String(error)
      return jsonSafe({ ok: false, message: message.length > 600 ? message.slice(0, 600) + '…' : message })
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
    }
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
  ['checkUpdates', undefined],
  ['updatePlugin', undefined],
]) {
  markRemote(extensionHubGateway.prototype, method, exportName)
}

export default extensionHubGateway
