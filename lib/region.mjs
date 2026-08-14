import fs from 'node:fs'
import path from 'node:path'
import { parseYaml } from './yaml.mjs'
import { emit } from './emit.mjs'

// A "managed region" is a commented YAML-list fragment this manager owns inside
// a composition file (the host cordis.patch.yml or a generated preset's
// agent.cordis.yml). It holds two kinds of entries:
//   { insert: [row] }       — MCP servers added by the manager
//   { id, disabled }        — enable/disable toggles keyed by row id
// Everything between the markers is regenerated on each write; text outside the
// markers (user content + comments) is preserved verbatim.

const START = '# >>> dsh-extension-hub'
const END = '# <<< dsh-extension-hub'

function parseRegionList(body) {
  try {
    const v = parseYaml(body)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function renderRegion(list) {
  const body = list.length ? emit(list) : ''
  return body ? `${START}\n${body}\n${END}` : `${START}\n${END}`
}

export function readRegion(filePath) {
  let text = ''
  try {
    text = fs.readFileSync(filePath, 'utf8')
  } catch {
    // missing file
  }
  const startIdx = text.indexOf(START)
  if (startIdx === -1) {
    return { text, before: text, after: '', regionList: [], hasRegion: false }
  }
  const bodyStart = startIdx + START.length
  const endIdx = text.indexOf(END, bodyStart)
  if (endIdx === -1) {
    const regionBody = text.slice(bodyStart)
    return { text, before: text.slice(0, startIdx), after: '', regionList: parseRegionList(regionBody), hasRegion: true }
  }
  const regionBody = text.slice(bodyStart, endIdx)
  // Strip the newline that terminates the END marker line; it belongs to the
  // region, not to the trailing content.
  const after = text.slice(endIdx + END.length).replace(/^\n/, '')
  return { text, before: text.slice(0, startIdx), after, regionList: parseRegionList(regionBody), hasRegion: true }
}

function writeRegion(filePath, list) {
  // Drop malformed entries (e.g. `{insert: null}` left over from partial row
  // deletion) so every write also heals the region.
  const clean = list.filter((e) => {
    if (!e || typeof e !== 'object') return false
    if (e.id !== undefined) return typeof e.id === 'string' && e.id !== ''
    if (e.insert !== undefined) return Array.isArray(e.insert) && e.insert.length > 0 && !!e.insert[0] && e.insert[0].id !== undefined
    return false
  })
  const { before, after } = readRegion(filePath)
  let out = before
  if (out !== '' && !out.endsWith('\n')) out += '\n'
  out += renderRegion(clean)
  if (after !== '') out += '\n' + after
  else out += '\n'
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, out, 'utf8')
}

function rowId(entry) {
  return entry && typeof entry === 'object' ? entry.id : undefined
}

export function listManaged(filePath) {
  return readRegion(filePath).regionList
}

export function upsertServer(filePath, entry) {
  const id = rowId(entry)
  const region = readRegion(filePath).regionList
  const list = region.filter((e) => !(e && e.insert && rowId(e.insert[0]) === id))
  list.push({ insert: [entry] })
  writeRegion(filePath, list)
}

export function removeServer(filePath, id) {
  const region = readRegion(filePath).regionList
  const list = region.filter((e) => {
    if (e && e.insert) return rowId(e.insert[0]) !== id
    if (e && e.id !== undefined) return e.id !== id
    return true
  })
  writeRegion(filePath, list)
}

export function setServerDisabled(filePath, id, disabled) {
  const region = readRegion(filePath).regionList
  const list = region.filter((e) => !(e && e.insert === undefined && e.id === id))
  list.push({ id, disabled: !!disabled })
  writeRegion(filePath, list)
}

// Resolve a region list into a map of id -> disabled for toggles.
export function toggleMap(filePath) {
  const map = {}
  for (const e of readRegion(filePath).regionList) {
    if (e && e.insert === undefined && e.id !== undefined) map[e.id] = !!e.disabled
  }
  return map
}
