import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

// Resolve the DeepSeek Harness home: $DSH_HOME, else ~/.dsh.
export function dshHome() {
  const env = process.env.DSH_HOME
  if (env && env.trim() !== '') return path.resolve(env)
  return path.join(os.homedir(), '.dsh')
}

// Shared agent config root: $DSH_AGENTS_HOME, else ~/.agents.
export function agentsHome() {
  const env = process.env.DSH_AGENTS_HOME
  if (env && env.trim() !== '') return path.resolve(env)
  return path.join(os.homedir(), '.agents')
}

// The host composition patch file. Extension management is bound to the web
// profile — the DSH Web surface this UI runs in (installation, plugin rows
// and the README all target `profiles/web`). Never auto-probe the profiles
// directory: with several profiles (headless + web) a scan can hit the wrong
// one first, and the MCP list then reads/writes a composition this UI does
// not run in. An explicit profile name overrides the default.
export function hostPatchPath(profileName) {
  const name = profileName || 'web'
  return path.join(dshHome(), 'profiles', name, 'cordis.patch.yml')
}

export function userPresetsRoot() {
  return path.join(dshHome(), '.agent-presets')
}

export function userSkillsRoot() {
  return path.join(dshHome(), 'skills')
}

export function userAgentsSkillsRoot() {
  return path.join(agentsHome(), 'skills')
}

export function projectRoot(cwd = process.cwd()) {
  let dir = path.resolve(cwd)
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return path.resolve(cwd)
    dir = parent
  }
}

export function projectDshDir(cwd = process.cwd()) {
  return path.join(projectRoot(cwd), '.dsh')
}

export function projectSkillsRoot(cwd = process.cwd()) {
  return path.join(projectDshDir(cwd), 'skills')
}

// Project MCP manifest (DSH has no per-project MCP mount; we record the rows
// here and materialize them into a dedicated preset on `import --scope project`).
export function projectMcpManifest(cwd = process.cwd()) {
  return path.join(projectDshDir(cwd), 'mcp-servers.yaml')
}

// Locate the shipped `standard` preset's composition, used as the base for a
// generated project-MCP preset. Searches the deployment config under the DSH
// profiles node_modules and a couple of common npm-cache locations.
export function findShippedStandardPreset() {
  const candidates = []
  const home = dshHome()
  const envOverride = process.env.DSH_SHIPPED_PRESETS
  if (envOverride && envOverride.trim() !== '') candidates.push(envOverride.trim())

  candidates.push(path.join(home, 'profiles', 'node_modules', '@deepseek-ai', 'dsh', 'config', 'agent-presets'))
  candidates.push(path.join(home, 'node_modules', '@deepseek-ai', 'dsh', 'config', 'agent-presets'))

  // npm _npx cache: **/node_modules/@deepseek-ai/dsh/config/agent-presets
  const npxRoot = path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_npx')
  try {
    for (const entry of fs.readdirSync(npxRoot)) {
      candidates.push(path.join(npxRoot, entry, 'node_modules', '@deepseek-ai', 'dsh', 'config', 'agent-presets'))
    }
  } catch {
    // ignore
  }

  for (const root of candidates) {
    const comp = path.join(root, 'standard', 'agent.cordis.yml')
    if (fs.existsSync(comp)) return comp
  }
  return null
}

// A stable kebab-case slug from an arbitrary project directory name.
export function projectSlug(cwd = process.cwd()) {
  const name = path.basename(projectRoot(cwd))
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'project'
  return slug.replace(/^-+/, '')
}

export function managerStateDir() {
  return path.join(dshHome(), 'extension-hub')
}
