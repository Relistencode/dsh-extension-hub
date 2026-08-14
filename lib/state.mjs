// Small persistent state for the manager UI: remembered project folder and
// last-used choices. Stored under the DSH home (managerStateDir), so every
// profile/session of the same host shares it.
import fs from 'node:fs'
import path from 'node:path'
import { managerStateDir } from './paths.mjs'

export function stateFile() {
  return path.join(managerStateDir(), 'state.json')
}

export function readState() {
  try {
    const v = JSON.parse(fs.readFileSync(stateFile(), 'utf8'))
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

export function writeState(patch) {
  const dir = managerStateDir()
  fs.mkdirSync(dir, { recursive: true })
  const next = { ...readState(), ...(patch || {}) }
  fs.writeFileSync(stateFile(), JSON.stringify(next, null, 2), 'utf8')
  return next
}
