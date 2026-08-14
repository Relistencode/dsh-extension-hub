import { emit } from './emit.mjs'

// dsh-mcp-client requires serverName to match [A-Za-z0-9_-]{1,32}.
export function normalizeServerName(name) {
  let s = String(name || '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (s === '') s = 'mcp-server'
  if (/^[0-9]/.test(s)) s = 'm-' + s
  return s.slice(0, 32)
}

// Convert a discovered MCP item into a dsh-mcp-client config object.
export function mcpItemToConfig(item) {
  const serverName = normalizeServerName(item.name)
  if (item.transport === 'streamable-http') {
    const config = { serverName, transport: 'streamable-http', url: item.url || '' }
    if (item.headers && Object.keys(item.headers).length) config.headers = item.headers
    return { serverName, config, id: 'mcp-' + serverName }
  }
  const config = { serverName, transport: 'stdio', command: item.command || '' }
  if (item.args && item.args.length) config.args = item.args
  if (item.env && Object.keys(item.env).length) config.env = item.env
  return { serverName, config, id: 'mcp-' + serverName }
}

// A full patch `insert` list entry for one MCP server.
export function mcpItemToInsertEntry(item) {
  const { id, config } = mcpItemToConfig(item)
  return { id, name: '@deepseek-ai/dsh-mcp-client', config }
}

// Render a discovered skill into a DSH-compatible SKILL.md body.
export function skillItemToSkillMd(item) {
  const fm = {}
  fm.name = item.name
  fm.description = item.description || ''
  if (item.whenToUse) fm.whenToUse = item.whenToUse
  const meta = {}
  if (item.license != null) meta.license = item.license
  if (item.allowedTools != null) meta['allowed-tools'] = item.allowedTools
  if (Object.keys(meta).length) fm.metadata = meta
  const header = '---\n' + emit(fm) + '\n---\n\n'
  return header + (item.body || '')
}
