// Curated plugin catalog for the extension-hub "精选目录" tab.
//
// Data source: https://awesome-dsh-plugin.com/plugins.json — the community
// curated registry (maintained via awesome-dsh-plugin, refreshed daily by CI)
// with npm mappings, bilingual descriptions and star counts. A local 24h cache
// under $DSH_HOME/cache keeps the tab usable offline and avoids hammering the
// remote; a stale cache is served with fromCache: true so the UI can hint.
//
// Installed matching reuses the profile patch rows (registeredSlugs): a row id
// equal to the npm package name (npm installs) or to the repository name
// (github clone installs) marks an entry as installed.
import fs from 'node:fs'
import path from 'node:path'
import { dshHome } from './paths.mjs'
import { registeredSlugs } from './plugins.mjs'

const CATALOG_URL = 'https://awesome-dsh-plugin.com/plugins.json'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const PAGE_SIZE = 48

function cacheFile() {
  return path.join(dshHome(), 'cache', 'dsh-extension-hub', 'catalog.json')
}

function readCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(cacheFile(), 'utf8'))
    if (raw && Array.isArray(raw.plugins) && typeof raw.updated === 'string') return raw
  } catch {
    // missing or malformed cache
  }
  return null
}

function writeCache(payload) {
  try {
    fs.mkdirSync(path.dirname(cacheFile()), { recursive: true })
    fs.writeFileSync(cacheFile(), JSON.stringify(payload), 'utf8')
  } catch {
    // cache is best-effort
  }
}

/**
 * Load the curated catalog: network first, local cache as fallback.
 * @returns {{ ok: true, data: object, fromCache: boolean } | { ok: false, message: string }}
 */
export async function fetchCuratedCatalog() {
  let res
  try {
    res = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(15000) })
  } catch {
    res = null
  }
  if (res && res.ok) {
    try {
      const data = await res.json()
      if (data && Array.isArray(data.plugins) && data.categories) {
        writeCache(data)
        return { ok: true, data, fromCache: false }
      }
    } catch {
      // malformed payload; fall through to cache
    }
  }
  const cached = readCache()
  if (cached) return { ok: true, data: cached, fromCache: true }
  const reason = res ? `HTTP ${res.status}` : 'network'
  return { ok: false, message: `精选目录获取失败（${reason}），且无本地缓存` }
}

function descOf(desc) {
  const en = desc && typeof desc.en === 'string' ? desc.en : ''
  const zh = desc && typeof desc.zh === 'string' ? desc.zh : ''
  return { en, zh }
}

function normalize(raw, slugs) {
  const name = typeof raw.name === 'string' ? raw.name : ''
  const owner = typeof raw.owner === 'string' ? raw.owner : ''
  const fullName = [owner, name].filter(Boolean).join('/')
  const npm = typeof raw.npm === 'string' && raw.npm.trim() !== '' ? raw.npm.trim() : null
  const repoName = name.toLowerCase()
  const installed = (npm !== null && slugs.has(npm.toLowerCase())) || (repoName !== '' && slugs.has(repoName))
  return {
    id: typeof raw.url === 'string' && raw.url !== '' ? raw.url : fullName || npm || name,
    fullName: fullName !== '' ? fullName : npm || name,
    name,
    owner,
    npm,
    description: descOf(raw.description),
    category: typeof raw.category === 'string' && raw.category !== '' ? raw.category : 'other',
    stars: Number.isFinite(raw.stars) ? raw.stars : 0,
    added: typeof raw.added === 'string' ? raw.added : '',
    url: typeof raw.url === 'string' ? raw.url : '',
    page: typeof raw.page === 'string' ? raw.page : '',
    curated: true,
    installed,
    installMode: npm !== null ? 'npm' : 'git',
  }
}

/**
 * Query the curated catalog. input: { category?, query?, order?, page? }
 * order: 'featured' (catalog order) | 'stars' | 'newest'. page starts at 1.
 */
export async function curatedCatalog(webProfileDir, input) {
  const loaded = await fetchCuratedCatalog()
  if (!loaded.ok) return loaded
  const { data, fromCache } = loaded
  const category = typeof input.category === 'string' ? input.category : 'all'
  const query = typeof input.query === 'string' ? input.query.trim().toLowerCase() : ''
  const order = typeof input.order === 'string' ? input.order : 'featured'
  const page = Number.isInteger(input.page) && input.page > 0 ? input.page : 1
  const slugs = registeredSlugs(webProfileDir)
  let items = Array.isArray(data.plugins) ? data.plugins : []
  if (category !== 'all') items = items.filter((p) => p.category === category)
  if (query !== '') {
    const q = query
    items = items.filter((p) => {
      const name = String(p.name || '').toLowerCase()
      const full = String(p.owner || '').toLowerCase() + '/' + name
      const en = String((p.description && p.description.en) || '').toLowerCase()
      const zh = String((p.description && p.description.zh) || '').toLowerCase()
      return name.includes(q) || full.includes(q) || en.includes(q) || zh.includes(q)
    })
  }
  if (order === 'stars') {
    items = [...items].sort((a, b) => (b.stars || 0) - (a.stars || 0))
  } else if (order === 'newest') {
    items = [...items].sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')))
  }
  const total = items.length
  const start = (page - 1) * PAGE_SIZE
  const pageItems = items.slice(start, start + PAGE_SIZE)
  const plugins = pageItems.map((raw) => normalize(raw, slugs))
  return {
    ok: true,
    plugins,
    categories: data.categories || {},
    updated: typeof data.updated === 'string' ? data.updated : '',
    total,
    page,
    hasMore: start + PAGE_SIZE < total,
    fromCache,
  }
}
