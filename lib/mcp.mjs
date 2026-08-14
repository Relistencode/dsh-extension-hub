// MCP server create / update / get wrappers over the managed-region
// persistence. The row id is the stable key everywhere (the UI never derives
// ids from display names); serverName is editable through upsertMcp.
import { hostPatchPath, projectMcpManifest } from './paths.mjs'
import { normalizeServerName } from './convert.mjs'
import {
  installMcpGlobal,
  installMcpProject,
  removeMcpGlobal,
  removeMcpProject,
  toggleMcpGlobal,
  toggleMcpProject,
  readMcpManifest,
} from './install.mjs'
import { listMcp } from './list.mjs'
import * as region from './region.mjs'

const MCP_CLIENT = '@deepseek-ai/dsh-mcp-client'

export function normalizeId(nameOrId) {
  const s = String(nameOrId || '')
  return s.startsWith('mcp-') ? s : 'mcp-' + s
}

// Resolve a user-supplied name (serverName or id) to the exact managed row id.
export function resolveMcpId(nameOrId, cwd = process.cwd()) {
  const list = listMcp(cwd)
  const hit = list.find((m) => m.id === nameOrId || m.serverName === nameOrId)
  if (hit) return hit.id
  return normalizeId(nameOrId)
}

// Fetch one managed row (global host patch or project manifest).
export function getMcpEntry(id, scope, cwd = process.cwd()) {
  if (scope === 'project') {
    const row = readMcpManifest(cwd).find((e) => e && e.id === id)
    if (!row) return null
    return { ...row, disabled: false, scope, source: 'manifest' }
  }
  const patch = hostPatchPath()
  const row = region.listManaged(patch).find((e) => e && e.insert && e.insert[0] && e.insert[0].id === id)
  if (!row) return null
  return { ...row.insert[0], disabled: region.toggleMap(patch)[id] === true, scope, source: 'host-patch' }
}

// Merge an existing row with a partial update and produce the patch insert row.
function mergeEntry(existing, input) {
  const baseConfig = existing && existing.config ? existing.config : {}
  const config = { ...baseConfig }
  const id = input.id ? normalizeId(input.id) : normalizeId((existing && existing.id) || input.serverName || 'mcp-server')
  if (input.serverName) config.serverName = normalizeServerName(input.serverName)
  if (input.transport) config.transport = input.transport
  if (input.command !== undefined) config.command = input.command
  if (input.args !== undefined) config.args = input.args
  if (input.env !== undefined) config.env = input.env
  if (input.url !== undefined) config.url = input.url
  if (input.headers !== undefined) config.headers = input.headers
  if (config.transport === 'streamable-http') {
    delete config.command
    delete config.args
    delete config.env
    if (!config.url) throw new Error('streamable-http MCP servers require a url')
  } else {
    config.transport = 'stdio'
    delete config.url
    delete config.headers
    if (!config.command) throw new Error('stdio MCP servers require a command')
  }
  return { id, name: MCP_CLIENT, config }
}

// Create (id not managed yet) or update (id managed) one MCP server.
export function upsertMcp(input, scope, cwd = process.cwd()) {
  if (!input || (!input.serverName && !input.id)) throw new Error('MCP server requires a serverName or id')
  const id = normalizeId(input.id || input.serverName)
  const existing = getMcpEntry(id, scope, cwd)
  const entry = mergeEntry(existing, input)
  if (scope === 'project') {
    const r = installMcpProject([entry], cwd)
    return { id: entry.id, serverName: entry.config.serverName, scope, manifest: r.manifest, preset: r.preset }
  }
  const r = installMcpGlobal([entry])
  return { id: entry.id, serverName: entry.config.serverName, scope, path: r[0].path }
}

export function removeMcp(nameOrId, scope, cwd = process.cwd()) {
  const id = resolveMcpId(nameOrId, cwd)
  if (scope === 'project') {
    const r = removeMcpProject(id, cwd)
    return { id, scope, manifest: r.manifest, preset: r.preset }
  }
  const r = removeMcpGlobal(id)
  return { id, scope, path: r.path }
}

export function toggleMcp(nameOrId, disabled, scope, cwd = process.cwd()) {
  const id = resolveMcpId(nameOrId, cwd)
  if (scope === 'project') {
    const r = toggleMcpProject(id, disabled, cwd)
    return { id, disabled, scope, preset: r.preset }
  }
  const r = toggleMcpGlobal(id, disabled)
  return { id, disabled, scope, path: r.path }
}

export { projectMcpManifest }
