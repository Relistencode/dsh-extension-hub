// Minimal YAML emitter for the small structures this manager generates
// (mcp-client config blocks and SKILL.md frontmatter). Only scalars, maps and
// sequences are emitted; block style is used for maps/sequences with nesting.

const PLAIN_SAFE = /^[A-Za-z0-9_./@+*^()\[\]{}:-]+$/
const RESERVED = new Set(['true', 'false', 'null', '~', 'yes', 'no', 'on', 'off', 'True', 'False', 'Null'])

export function scalar(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  if (typeof v !== 'string') return scalar(String(v))
  if (v === '') return "''"
  if (v.includes('\n')) return '|-\n' + v.split('\n').map((l) => '  ' + l).join('\n')
  const leading = v[0]
  const indicatorStart = ['@', '`', '!', '&', '*', '#', '|', '>', '%', '?', ',', '[', ']', '{', '}', '-', '"', "'"].includes(leading)
  const numberLike = /^-?\d+(\.\d+)?$/.test(v)
  const plainOk = PLAIN_SAFE.test(v) && !RESERVED.has(v) && !numberLike && !indicatorStart
  if (plainOk) return v
  // Single-quote; escape internal single quotes by doubling.
  return "'" + v.replace(/'/g, "''") + "'"
}

export function emit(value, indent = 0) {
  const pad = '  '.repeat(indent)
  if (value === null || value === undefined) return pad + 'null'
  if (Array.isArray(value)) {
    if (value.length === 0) return pad + '[]'
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const inner = emit(item, indent + 1)
          return pad + '- ' + inner.trimStart()
        }
        return pad + '- ' + scalar(item)
      })
      .join('\n')
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return pad + '{}'
    return keys
      .map((key) => {
        const val = value[key]
        if (val !== null && typeof val === 'object') {
          if (Array.isArray(val) && val.length === 0) return pad + key + ': []'
          if (!Array.isArray(val) && Object.keys(val).length === 0) return pad + key + ': {}'
          return pad + key + ':\n' + emit(val, indent + 1)
        }
        return pad + key + ': ' + scalar(val)
      })
      .join('\n')
  }
  return pad + scalar(value)
}
