// Plugin enumeration and provenance classification for the extension-hub
// plugin manager tab.
//
// The Loader flattens every composition layer (built-in bundles, user
// bundles, profile/home/overlay patches) into entries and does not retain
// which layer contributed a row, so provenance is recovered by re-reading
// the built-in bundles' patch files: any entry whose id (or module name)
// was declared by an @deepseek-ai/* bundle in the profile's
// dsh.profile.bundles list is "official"; everything else (user profile
// patch rows, user bundles, overlays) is "other".
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { dshHome } from './paths.mjs'
import { upsertServer, toggleMap } from './region.mjs'

const execFileAsync = promisify(execFile)

// Cordis FiberState -> phase name (mirror of the cross-package const enum;
// disposed fibers expose no entry and never reach here).
const FIBER_PHASE = {
  0: 'pending',
  1: 'loading',
  2: 'active',
  3: 'failed',
  5: 'unloading',
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

/** Bundles owned by the harness vendor (@deepseek-ai scope) from the profile manifest. */
export function officialBundleNames(webProfileDir) {
  const manifest = readJson(path.join(webProfileDir, 'package.json'))
  const bundles = manifest && Array.isArray(manifest.dsh?.profile?.bundles)
    ? manifest.dsh.profile.bundles
    : []
  const official = bundles.filter((name) => typeof name === 'string' && name.startsWith('@deepseek-ai/'))
  return official.length > 0 ? official : ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
}

/**
 * Every row id and module name declared by the built-in bundles' patch
 * files. Entries matching these are classified as official plugins.
 */
export function officialPluginIds(webProfileDir) {
  const ids = new Set()
  const require = createRequire(path.join(webProfileDir, '__noop__.js'))
  for (const bundle of officialBundleNames(webProfileDir)) {
    try {
      const pkgPath = require.resolve(`${bundle}/package.json`)
      const pkg = readJson(pkgPath)
      const rel = pkg && typeof pkg.dsh?.bundle?.patch === 'string' ? pkg.dsh.bundle.patch : null
      if (!rel) continue
      const text = fs.readFileSync(path.join(path.dirname(pkgPath), rel), 'utf8')
      for (const match of text.matchAll(/^\s*- id:\s*(\S+)/gm)) ids.add(match[1])
      for (const match of text.matchAll(/^\s*(?:- |\s{2,})name:\s*(['"]?)([^'"\s]+)\1\s*$/gm)) ids.add(match[2])
    } catch {
      // bundle unresolvable from the profile; skip it
    }
  }
  return ids
}

/** Best-effort human description for a plugin module name (package.json description). */
function pluginDescription(require, name) {
  if (typeof name !== 'string' || name === '') return ''
  if (path.isAbsolute(name)) {
    // Local path plugin (--patch overlay): walk up to the nearest package.json.
    let dir = name
    try {
      if (fs.statSync(name).isFile()) dir = path.dirname(name)
    } catch {
      return ''
    }
    let current = dir
    for (;;) {
      const pkg = readJson(path.join(current, 'package.json'))
      if (pkg && typeof pkg.description === 'string') return pkg.description
      const parent = path.dirname(current)
      if (parent === current) return ''
      current = parent
    }
  }
  if (name.startsWith('.')) return ''
  const parts = name.split('/')
  const base = name.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  if (base === '') return ''
  try {
    const pkg = readJson(require.resolve(`${base}/package.json`))
    return pkg && typeof pkg.description === 'string' ? pkg.description : ''
  } catch {
    return ''
  }
}

/** Normalize a package.json `repository` value to an https URL ('' when absent). */
function repositoryUrl(require, name) {
  if (typeof name !== 'string' || name === '' || name.startsWith('.') || path.isAbsolute(name)) return ''
  const parts = name.split('/')
  const base = name.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  if (base === '') return ''
  let raw = null
  try {
    const pkg = readJson(require.resolve(`${base}/package.json`))
    if (pkg) {
      const repo = pkg.repository
      raw = typeof repo === 'string' ? repo : (repo && typeof repo === 'object' && typeof repo.url === 'string' ? repo.url : null)
    }
  } catch {
    return ''
  }
  if (!raw || typeof raw !== 'string' || raw === '') return ''
  let url = raw.trim()
  // Strip npm's shorthand forms down to a plain https URL.
  if (url.startsWith('git+')) url = url.slice(4)
  if (url.startsWith('github:')) url = `https://github.com/${url.slice(7)}`
  if (url.startsWith('gitlab:')) url = `https://gitlab.com/${url.slice(7)}`
  if (url.startsWith('bitbucket:')) url = `https://bitbucket.org/${url.slice(10)}`
  if (url.startsWith('git://')) url = `https://${url.slice(6)}`
  if (url.startsWith('ssh://git@')) url = `https://${url.slice(10)}`
  if (url.endsWith('.git')) url = url.slice(0, -4)
  if (/^https?:\/\//.test(url)) return url
  return ''
}

/**
 * Delete one plugin row (the `- id: <id>` block, including its indented
 * children) from a composition file. Only affects rows physically present in
 * the file; built-in bundle rows are not found and report removed: false.
 */
export function removePluginRow(filePath, id) {
  let text
  try {
    text = fs.readFileSync(filePath, 'utf8')
  } catch {
    return { removed: false }
  }
  const lines = text.split('\n')
  const ranges = []
  let removedName = ''
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)- id:\s*(\S+)\s*$/)
    if (!match) continue
    // Strip YAML quoting so a quoted row id ('@scope/pkg') matches the bare id.
    const rowId = match[2].replace(/^['"]|['"]$/g, '')
    if (rowId !== id) continue
    const indent = match[1].length
    let j = i + 1
    while (j < lines.length) {
      const t = lines[j]
      if (t.trim() === '') {
        j++
        continue
      }
      const nameMatch = t.match(/^\s*name:\s*(.+?)\s*$/)
      if (nameMatch && removedName === '') removedName = nameMatch[1].replace(/^['"]|['"]$/g, '')
      const indented = t.match(/^(\s*)\S/)
      if (!indented || indented[1].length <= indent) break
      j++
    }
    let start = i
    // If the row is a child entry whose parent list (a less-indented `- ` row
    // such as `- insert:`) ends up with no children left, drop the parent too.
    if (indent > 0) {
      let parentLine = -1
      let parentIndent = -1
      for (let k = i - 1; k >= 0; k--) {
        const pm = lines[k].match(/^(\s*)- /)
        if (pm && pm[1].length < indent) {
          parentLine = k
          parentIndent = pm[1].length
          break
        }
      }
      if (parentLine >= 0) {
        let k = j
        let hasChild = false
        while (k < lines.length) {
          const t = lines[k]
          if (t.trim() === '') {
            k++
            continue
          }
          const cm = t.match(/^(\s*)\S/)
          if (!cm || cm[1].length <= parentIndent) break
          hasChild = true
          break
        }
        if (!hasChild) start = parentLine
      }
    }
    ranges.push({ start, end: j })
  }
  if (ranges.length === 0) return { removed: false }
  ranges.sort((a, b) => a.start - b.start)
  const out = []
  let cursor = 0
  for (const range of ranges) {
    if (range.start < cursor) continue
    out.push(...lines.slice(cursor, range.start))
    cursor = range.end
  }
  out.push(...lines.slice(cursor))
  fs.writeFileSync(filePath, out.join('\n'), 'utf8')
  return { removed: true, name: removedName }
}

/** Directory where GitHub-discovered plugins are cloned. */
export function pluginsDir() {
  return path.join(dshHome(), 'extension-hub', 'plugins')
}

/** Slugs of plugins whose registration row exists in the profile patch. */
export function registeredSlugs(webProfileDir) {
  const slugs = new Set()
  let text = ''
  try {
    text = fs.readFileSync(path.join(webProfileDir, 'cordis.patch.yml'), 'utf8')
  } catch {
    return slugs
  }
  const dir = pluginsDir()
  for (const match of text.matchAll(/^\s*name:\s*['"]?([^'"\s]+)['"]?\s*$/gm)) {
    const value = match[1]
    if (path.isAbsolute(value)) {
      if (value.toLowerCase().startsWith(dir.toLowerCase() + path.sep.toLowerCase())) {
        slugs.add(path.basename(value).toLowerCase())
      }
    } else {
      // Bundle-style row (npm package name, e.g. id: extension-hub with
      // name: dsh-extension-hub): register the bare name as an install key.
      slugs.add(value.replace(/^['"]|['"]$/g, '').toLowerCase())
    }
  }
  // Also accept explicit row ids matching the clone slug. Quoted ids
  // (e.g. '@scope/pkg') are stripped so the slug matches the bare package name.
  for (const match of text.matchAll(/^\s*- id:\s*(\S+)\s*$/gm)) {
    slugs.add(match[1].replace(/^['"]|['"]$/g, '').toLowerCase())
  }
  return slugs
}

/**
 * Search GitHub for repositories tagged `dsh-plugin` (plus an optional free
 * query). Pageable: page starts at 1, per_page = 30. A repository counts as
 * installed only when its registration row exists in the profile patch (a
 * leftover clone without a row is NOT installed).
 */
export async function discoverPlugins(webProfileDir, query, page) {
  const pageNum = Number.isInteger(page) && page > 0 ? page : 1
  const terms = `topic:dsh-plugin${query && String(query).trim() ? ` ${String(query).trim()}` : ''}`
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(terms)}&sort=stars&order=desc&per_page=30&page=${pageNum}`
  let res
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'dsh-extension-hub', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(15000),
    })
  } catch (error) {
    return { ok: false, message: error && error.message ? error.message : String(error) }
  }
  if (!res.ok) {
    if (res.status === 403) return { ok: false, message: 'GitHub API 限流（未认证每分钟 10 次），请稍后再试' }
    if (res.status === 422) return { ok: false, message: '搜索条件无效' }
    return { ok: false, message: `GitHub API HTTP ${res.status}` }
  }
  const data = await res.json()
  const installed = registeredSlugs(webProfileDir)
  const items = Array.isArray(data.items) ? data.items : []
  const repos = items.map((item) => ({
    id: item.id,
    fullName: item.full_name,
    name: item.name,
    description: item.description || '',
    stars: item.stargazers_count || 0,
    language: item.language || '',
    updatedAt: item.updated_at || '',
    htmlUrl: item.html_url || '',
    installed: installed.has(String(item.name).toLowerCase()),
  }))
  return { ok: true, repos, page: pageNum, hasMore: items.length === 30 }
}

/**
 * Clone a GitHub repository into the local plugins dir and register it as a
 * plugin row (absolute-path module) in the profile patch. No pnpm involved.
 * The row is inserted through the managed region (insert-block patch
 * semantics); it takes effect on the next dsh web start.
 */
export async function installPlugin(webProfileDir, repo) {
  const full = String(repo || '').trim()
  const match = /^([\w.-]+)\/([\w.-]+)$/.exec(full)
  if (!match) return { ok: false, message: '仓库名无效，应为 owner/repo 格式' }
  const slug = match[2]
  const dir = pluginsDir()
  const target = path.join(dir, slug)
  if (fs.existsSync(target)) return { ok: false, message: `目录 ${slug} 已存在，可能已安装` }
  fs.mkdirSync(dir, { recursive: true })
  try {
    await execFileAsync('git', ['clone', '--depth', '1', `https://github.com/${full}.git`, target], { timeout: 120000, windowsHide: true })
  } catch (error) {
    return { ok: false, code: 'network', message: error && error.message ? error.message : String(error) }
  }
  const pkgPath = path.join(target, 'package.json')
  let pkg = null
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  } catch {
    pkg = null
  }
  if (!pkg || typeof pkg.main !== 'string' || !fs.existsSync(path.join(target, pkg.main))) {
    fs.rmSync(target, { recursive: true, force: true })
    return { ok: false, code: 'invalid', message: '仓库缺少可用的 package.json/main，不是有效的 dsh 插件包' }
  }
  const patchPath = path.join(webProfileDir, 'cordis.patch.yml')
  upsertServer(patchPath, { id: slug, name: target })
  // Verify the registration row actually landed in the patch file.
  let wrote = false
  try {
    wrote = new RegExp(`^\\s{4}- id:\\s*${slug}\\s*$`, 'm').test(fs.readFileSync(patchPath, 'utf8'))
  } catch {
    wrote = false
  }
  if (!wrote) {
    fs.rmSync(target, { recursive: true, force: true })
    return { ok: false, code: 'invalid', message: '插件已克隆但注册行未能写入配置，请重启 dsh web 后重试' }
  }
  return { ok: true, message: `已安装 ${full}，重启 dsh web 后生效`, path: target }
}

// npm package name grammar (unscoped or @scope/name, no path separators).
const NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

/**
 * Install a plugin from the npm registry WITHOUT pnpm: fetch the latest
 * tarball, unpack with the system tar, place it in the profile node_modules,
 * register a bundle row (`id: <name>`) in the managed patch region, and record
 * the dependency in the profile manifest. The registry package must point back
 * at the selected repository (`expectedRepo`) — an anti-squatting check — when
 * the caller can name one.
 */
export async function installNpmPlugin(webProfileDir, pkgName, expectedRepo) {
  const name = String(pkgName || '').trim()
  if (!NPM_NAME_RE.test(name)) return { ok: false, code: 'invalid', message: 'npm 包名无效' }
  if (registeredSlugs(webProfileDir).has(name.toLowerCase())) {
    return { ok: false, code: 'exists', message: '该插件似乎已安装' }
  }
  const encoded = registryName(name)
  let meta = null
  try {
    const res = await fetch(`https://registry.npmjs.org/${encoded}/latest`, { signal: AbortSignal.timeout(10000) })
    if (res.status === 404) return { ok: false, code: 'invalid', message: 'npm 上不存在该包' }
    if (!res.ok) return { ok: false, code: 'network', message: `registry HTTP ${res.status}` }
    meta = await res.json()
  } catch (error) {
    return { ok: false, code: 'network', message: error && error.message ? error.message : String(error) }
  }
  const version = typeof meta.version === 'string' ? meta.version : null
  const tarball = meta.dist && typeof meta.dist.tarball === 'string' ? meta.dist.tarball : null
  if (!version || !tarball) return { ok: false, code: 'invalid', message: 'registry 返回数据不完整' }
  if (expectedRepo) {
    const repoRaw = meta.repository
      ? (typeof meta.repository === 'object' ? meta.repository.url : meta.repository)
      : ''
    const repoUrl = String(repoRaw || '')
      .toLowerCase()
      .replace(/^git\+/, '')
      .replace(/\.git$/, '')
      .replace(/^github:/, 'https://github.com/')
    if (!repoUrl.includes(String(expectedRepo).toLowerCase())) {
      return { ok: false, code: 'mismatch', message: 'npm 包与所选仓库不匹配（可能存在名称抢占），已取消安装' }
    }
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-inst-'))
  const target = path.join(webProfileDir, 'node_modules', ...(name.startsWith('@') ? name.split('/') : [name]))
  const profilePkgPath = path.join(webProfileDir, 'package.json')
  const patchPath = path.join(webProfileDir, 'cordis.patch.yml')
  try {
    if (fs.existsSync(target)) return { ok: false, code: 'exists', message: 'node_modules 中已存在该包，可能已安装' }
    const tgzRes = await fetch(tarball, { signal: AbortSignal.timeout(60000) })
    if (!tgzRes.ok) return { ok: false, code: 'network', message: `download HTTP ${tgzRes.status}` }
    const tarPath = path.join(tmpDir, 'pkg.tgz')
    fs.writeFileSync(tarPath, Buffer.from(await tgzRes.arrayBuffer()))
    await execFileAsync(process.platform === 'win32' ? 'tar.exe' : 'tar', ['-xzf', tarPath, '-C', tmpDir], { timeout: 60000, windowsHide: true })
    const pkgJson = readJson(path.join(tmpDir, 'package', 'package.json'))
    if (!pkgJson || pkgJson.name !== name || pkgJson.version !== version) {
      return { ok: false, code: 'invalid', message: '下载的包未通过校验（包名/版本不匹配）' }
    }
    if (typeof pkgJson.main !== 'string' || !fs.existsSync(path.join(tmpDir, 'package', pkgJson.main))) {
      return { ok: false, code: 'invalid', message: 'npm 包缺少可用的 package.json/main，不是有效的 dsh 插件包' }
    }
    fs.cpSync(path.join(tmpDir, 'package'), target, { recursive: true })
    upsertServer(patchPath, { id: name, name })
    // Record the dependency so a future pnpm install keeps the package.
    const pp = readJson(profilePkgPath)
    if (pp && pp.dependencies && typeof pp.dependencies === 'object') {
      pp.dependencies[name] = '^' + version
      try {
        fs.writeFileSync(profilePkgPath, JSON.stringify(pp, null, 2) + '\n', 'utf8')
      } catch {
        // manifest update is best-effort; the node_modules copy is the source of truth
      }
    }
    // Self-check: registration row AND installed dir must both exist.
    let wrote = false
    try {
      wrote = new RegExp(`^\\s{4}- id:\\s*['"]?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?\\s*$`, 'm')
        .test(fs.readFileSync(patchPath, 'utf8'))
    } catch {
      wrote = false
    }
    if (!wrote || !fs.existsSync(target)) {
      try { fs.rmSync(target, { recursive: true, force: true }) } catch { /* keep going */ }
      if (pp && pp.dependencies) {
        try {
          delete pp.dependencies[name]
          fs.writeFileSync(profilePkgPath, JSON.stringify(pp, null, 2) + '\n', 'utf8')
        } catch { /* keep going */ }
      }
      return { ok: false, code: 'invalid', message: '插件已安装但注册行未能写入配置，请重启 dsh web 后重试' }
    }
    return { ok: true, kind: 'npm', name, version, message: `已安装 ${name}@${version}（npm），重启 dsh web 后生效` }
  } catch (error) {
    try { fs.rmSync(target, { recursive: true, force: true }) } catch { /* keep going */ }
    return { ok: false, code: 'network', message: error && error.message ? error.message : String(error) }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* keep going */ }
  }
}

// Cordis include is the composition loader itself (bundle + patch merge);
// it is system-critical and must never be disabled or removed.
const CORE_PLUGIN_NAMES = new Set(['cordis:include'])

/**
 * Snapshot of every non-group Loader entry with provenance classification.
 * @param ctx - plugin context that can reach the `loader` service.
 * @param webProfileDir - web profile directory (composition + dependency root).
 */
export function listPlugins(ctx, webProfileDir) {
  const loader = ctx.get('loader')
  const plugins = []
  if (loader) {
    const official = officialPluginIds(webProfileDir)
    const require = createRequire(path.join(webProfileDir, '__noop__.js'))
    for (const entry of loader.entries()) {
      if (entry.options.group) continue
      const name = entry.options.name
      // Provenance: vendor scope (@deepseek-ai/*) means an official plugin —
      // rows the vendor bundles OR rows a user configures with an official
      // package are both official. Bundle-row ids are kept as a fallback for
      // any future non-scoped vendor row. Everything else is "other".
      const isOfficial = (typeof name === 'string' && name.startsWith('@deepseek-ai/')) || official.has(String(entry.id).replace(/^include:/, ''))
      const isCore = typeof name === 'string' && CORE_PLUGIN_NAMES.has(name)
      plugins.push({
        entryId: entry.id,
        name,
        enabled: !entry.disabled,
        phase: entry.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state] ?? 'active',
        official: isOfficial || isCore,
        core: isCore,
        description: pluginDescription(require, name),
        repository: repositoryUrl(require, name),
      })
    }
  }
  plugins.sort((a, b) => {
    if (a.official !== b.official) return a.official ? -1 : 1
    return String(a.name).localeCompare(String(b.name))
  })
  return { plugins }
}

// ── updates ──────────────────────────────────────────────────────────────────

function registryName(name) {
  return name.startsWith('@') ? name.replace('/', '%2F') : name
}

/**
 * Upgrade one npm package inside the web profile WITHOUT pnpm: fetch the
 * latest registry metadata, download its tarball, unpack with the system tar,
 * replace node_modules/<name>, and update the profile dependency declaration.
 * Avoids pnpm's symlink requirements (Windows developer mode / admin).
 */
export async function updateNpmPackage(webDir, pkgName) {
  const encoded = registryName(pkgName)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-upd-'))
  try {
    const res = await fetch(`https://registry.npmjs.org/${encoded}/latest`, { signal: AbortSignal.timeout(10000) })
    if (res.status === 404) return { ok: false, message: 'package not published on npm' }
    if (!res.ok) return { ok: false, message: `registry HTTP ${res.status}` }
    const meta = await res.json()
    const latest = meta && typeof meta.version === 'string' ? meta.version : null
    if (!latest) return { ok: false, message: 'registry returned no version' }
    const tarball = meta.dist && typeof meta.dist.tarball === 'string'
      ? meta.dist.tarball
      : `https://registry.npmjs.org/${encoded}/-/${pkgName.split('/').pop()}-${latest}.tgz`
    const tgzRes = await fetch(tarball, { signal: AbortSignal.timeout(60000) })
    if (!tgzRes.ok) return { ok: false, message: `download HTTP ${tgzRes.status}` }
    const tarPath = path.join(tmpDir, 'pkg.tgz')
    fs.writeFileSync(tarPath, Buffer.from(await tgzRes.arrayBuffer()))
    await execFileAsync(process.platform === 'win32' ? 'tar.exe' : 'tar', ['-xzf', tarPath, '-C', tmpDir], { timeout: 60000, windowsHide: true })
    const pkgJson = readJson(path.join(tmpDir, 'package', 'package.json'))
    if (!pkgJson || pkgJson.name !== pkgName || pkgJson.version !== latest) {
      return { ok: false, message: 'downloaded package failed validation' }
    }
    const target = path.join(webDir, 'node_modules', ...(pkgName.startsWith('@') ? pkgName.split('/') : [pkgName]))
    try {
      fs.rmSync(target, { recursive: true, force: true })
    } catch {
      try { fs.rmSync(target, { recursive: true, force: true }) } catch { /* keep going */ }
    }
    fs.cpSync(path.join(tmpDir, 'package'), target, { recursive: true })
    const profilePkg = path.join(webDir, 'package.json')
    const pp = readJson(profilePkg)
    if (pp && pp.dependencies && typeof pp.dependencies[pkgName] === 'string') {
      pp.dependencies[pkgName] = '^' + latest
      fs.writeFileSync(profilePkg, JSON.stringify(pp, null, 2) + '\n', 'utf8')
    }
    return { ok: true, version: latest }
  } catch (error) {
    return { ok: false, message: error && error.message ? String(error.message) : String(error) }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

/**
 * Compare every non-official plugin against its update source: npm packages
 * check the registry; local git clones (discover-installed) compare HEAD to
 * origin. Built-in/official plugins are skipped (they track the DSH release).
 */
export async function checkPluginUpdates(ctx, webProfileDir) {
  const snapshot = listPlugins(ctx, webProfileDir).plugins
  const results = []
  for (const plugin of snapshot) {
    if (plugin.official || plugin.core) continue
    const name = plugin.name
    if (typeof name !== 'string' || name === '') continue
    if (path.isAbsolute(name)) {
      if (fs.existsSync(path.join(name, '.git'))) {
        try {
          const [localOut, remoteOut] = await Promise.all([
            execFileAsync('git', ['-C', name, 'rev-parse', 'HEAD'], { timeout: 15000, windowsHide: true }),
            execFileAsync('git', ['-C', name, 'ls-remote', 'origin', 'HEAD'], { timeout: 15000, windowsHide: true }),
          ])
          const local = localOut.stdout.trim()
          const remote = (remoteOut.stdout.split(/\s+/)[0] || '').trim()
          results.push({
            name,
            kind: 'git',
            current: local.slice(0, 7),
            latest: remote ? remote.slice(0, 7) : '',
            updateable: !!remote && remote !== local,
          })
        } catch {
          results.push({ name, kind: 'git', current: '', latest: '', updateable: false, error: true })
        }
      }
      continue
    }
    if (name.startsWith('.')) continue
    let current = ''
    try {
      const require = createRequire(path.join(webProfileDir, '__noop__.js'))
      const pkg = readJson(require.resolve(`${name}/package.json`))
      current = pkg && typeof pkg.version === 'string' ? pkg.version : ''
    } catch {
      // local version unresolvable
    }
    try {
      const res = await fetch(`https://registry.npmjs.org/${registryName(name)}/latest`, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) {
        results.push({ name, kind: 'npm', current, latest: '', updateable: false, error: true })
        continue
      }
      const meta = await res.json()
      const latest = meta && typeof meta.version === 'string' ? meta.version : ''
      results.push({ name, kind: 'npm', current, latest, updateable: !!latest && latest !== current })
    } catch {
      results.push({ name, kind: 'npm', current, latest: '', updateable: false, error: true })
    }
  }
  return { plugins: results }
}

/** Update one plugin by its source kind: git pull for clones, tarball for npm. */
export async function updatePluginItem(webDir, name) {
  if (typeof name !== 'string' || name === '') return { ok: false, message: 'missing plugin name' }
  if (path.isAbsolute(name)) {
    try {
      await execFileAsync('git', ['-C', name, 'fetch', 'origin', '--depth', '1'], { timeout: 60000, windowsHide: true })
      await execFileAsync('git', ['-C', name, 'reset', '--hard', 'FETCH_HEAD'], { timeout: 30000, windowsHide: true })
      return { ok: true, kind: 'git', message: '已更新本地克隆，重启 dsh web 后生效' }
    } catch (error) {
      return { ok: false, message: error && error.message ? error.message : String(error) }
    }
  }
  return updateNpmPackage(webDir, name)
}

// ── add-on features ───────────────────────────────────────────────────────────

/**
 * Catalog of optional add-on features shipped alongside Extension Hub. Each
 * entry is an independent npm plugin: it keeps its own patch row (installable,
 * disableable, uninstallable like any plugin) and its own settings page; the
 * Plugin Management tab surfaces this list so users install/disable/uninstall
 * them without leaving the page. Add future features by appending here.
 */
export function featureCatalog() {
  return [
    { id: 'my-rules', name: 'dsh-myrules' },
  ]
}

/**
 * Find the patch row id whose package name matches `pkgName` (a row installed
 * via installNpmPlugin uses id === name; a hand-written row may use any id
 * with `name: <pkgName>`). Returns null when no row references the package.
 */
export function patchRowIdByPackageName(filePath, pkgName) {
  let text
  try {
    text = fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const nm = lines[i].match(/^\s*name:\s*['"]?([^'"\s]+)['"]?\s*$/)
    if (!nm || nm[1] !== pkgName) continue
    const indent = (lines[i].match(/^\s*/) || [''])[0].length
    // Walk back to the nearest `- id:` at the same or shallower indent.
    for (let j = i - 1; j >= 0; j--) {
      const im = lines[j].match(/^(\s*)- id:\s*(\S+)\s*$/)
      if (im) {
        if (im[1].length >= indent) continue
        return im[2].replace(/^['"]|['"]$/g, '')
      }
      const t = lines[j].trim()
      if (t !== '') {
        const ind = (lines[j].match(/^\s*/) || [''])[0].length
        if (ind < indent) break
      }
    }
    return pkgName
  }
  return null
}

/**
 * Snapshot every add-on feature: installed (patch row present), enabled
 * (no disabled override), and the exact patch row id to act on.
 */
export function listFeatures(webProfileDir) {
  const patchPath = path.join(webProfileDir, 'cordis.patch.yml')
  const toggles = toggleMap(patchPath)
  const features = featureCatalog().map((f) => {
    const rowId = patchRowIdByPackageName(patchPath, f.name)
    return {
      id: f.id,
      name: f.name,
      rowId,
      installed: rowId !== null,
      enabled: rowId === null ? false : toggles[rowId] !== true,
    }
  })
  return { features }
}
