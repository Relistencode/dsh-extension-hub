// Loader-backed persistence for the host patch file.
//
// The profile cordis.patch.yml is owned by the include EntryTree inside the
// running loader. Writing the file directly works until the loader rewrites it
// from its in-memory tree (which happens on plugin-config updates) — rows we
// added externally then vanish. The correct path is to mutate the loader's
// tree through the include group: `root.update(rows)` applies the rows in
// memory (hot-mounting/unmounting entries) and `include.write()` serializes
// the tree back to the file, so memory and disk always agree.
//
// The CLI runs outside the loader; it uses the same flat row format
// (insert blocks expanded, one top-level row per line) so UI and CLI stay
// interchangeable.
import fs from 'node:fs'
import path from 'node:path'
import { parseYaml } from './yaml.mjs'

/**
 * Locate the include EntryTree that owns the profile patch file. The include
 * plugin's entry carries `.subtree` (the EntryTree), whose `filename` matches
 * the patch path; fall back to the first available subtree otherwise.
 */
export function findInclude(loader, patchPath) {
  if (!loader) return null
  const fallback = []
  for (const entry of loader.entries()) {
    if (!entry.subtree) continue
    if (patchPath && typeof entry.subtree.filename === 'string') {
      if (path.resolve(entry.subtree.filename) === path.resolve(patchPath)) return entry.subtree
    }
    fallback.push(entry.subtree)
  }
  return fallback.length > 0 ? fallback[0] : null
}

/** Patch rows as the loader sees them (insert blocks already expanded). */
export function includeRows(include) {
  if (!include || !Array.isArray(include.root?.data)) return null
  return include.root.data.map((row) => (row && typeof row === 'object' ? { ...row } : row))
}

/**
 * Commit rows through the loader: update the in-memory tree (which hot-mounts
 * or unmounts affected entries) then write the file. Returns false when no
 * include is available (caller falls back to the CLI path).
 */
export async function commitIncludeRows(include, rows) {
  if (!include) return false
  await include.root.update(rows)
  include.write()
  return true
}

/**
 * Flat row list from the patch file (insert blocks expanded, rows with the
 * same id merged — the last row wins, which is how `disabled` override rows
 * combine with their base row).
 */
export function fileRows(filePath) {
  let text = ''
  try {
    text = fs.readFileSync(filePath, 'utf8')
  } catch {
    return []
  }
  const parsed = parseYaml(text)
  if (!Array.isArray(parsed)) return []
  const merged = new Map()
  for (const item of parsed) {
    if (item && typeof item === 'object' && Array.isArray(item.insert)) {
      for (const row of item.insert) {
        if (row && typeof row === 'object' && row.id !== undefined) {
          merged.set(row.id, { ...(merged.get(row.id) || {}), ...row })
        }
      }
    } else if (item && typeof item === 'object' && item.id !== undefined) {
      merged.set(item.id, { ...(merged.get(item.id) || {}), ...item })
    }
  }
  return [...merged.values()]
}

// NOTE: no flat writer is provided on purpose. cordis.patch.yml is a PATCH
// OPERATION list: rows must be wrapped in `- insert:` blocks — a bare
// top-level `- id:` row means "override" and silently no-ops when the target
// does not exist. Writes always go through region.mjs (managed insert blocks).
