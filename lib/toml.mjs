// A minimal TOML parser sufficient for reading OpenAI Codex `config.toml`
// (mcp_servers tables, skills.config array-of-tables, env sub-tables).
//
// Supported:
//   - [table] and [table.sub] (dotted)
//   - [[array.of.tables]]
//   - key = value  (string, number, bool, arrays, inline tables)
//   - single/double-quoted strings with basic escapes
//   - multi-line arrays
//   - # comments
//
// Not a full TOML implementation (no dates, literal strings, dotted keys on
// the left side, or inline-table edge cases beyond the Codex subset).

export function parseToml(text) {
  const src = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = src.split('\n')
  const root = {}
  // Current table path as an array of segments; for array-of-tables we also
  // track the object instance indices implicitly via the path segments.
  let path = []

  function ensureAt(pathArr) {
    let node = root
    for (const seg of pathArr) {
      if (seg === null || seg === undefined) continue
      if (node[seg] === undefined) node[seg] = {}
      if (typeof node[seg] !== 'object' || node[seg] === null) node[seg] = {}
      node = node[seg]
    }
    return node
  }

  function containerFor(pathArr) {
    let node = root
    const last = pathArr[pathArr.length - 1]
    for (let i = 0; i < pathArr.length - 1; i++) {
      const seg = pathArr[i]
      if (seg == null) continue
      if (node[seg] === undefined) node[seg] = {}
      node = node[seg]
    }
    return { node, last }
  }

  function parseTableHeader(line) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[[')) {
      const inner = trimmed.slice(2, trimmed.indexOf(']]'))
      return { kind: 'array', path: parseKeyPath(inner) }
    }
    const inner = trimmed.slice(1, trimmed.indexOf(']'))
    return { kind: 'table', path: parseKeyPath(inner) }
  }

  function parseKeyPath(inner) {
    return splitDotted(inner).map((s) => parseKey(s))
  }

  function parseKey(s) {
    const t = s.trim()
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return parseString(t)
    }
    return t
  }

  function splitDotted(inner) {
    // Split on '.' outside quotes.
    const out = []
    let cur = ''
    let q = null
    for (const ch of inner) {
      if (q) {
        cur += ch
        if (ch === q) q = null
        continue
      }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue }
      if (ch === '.') { out.push(cur); cur = ''; continue }
      cur += ch
    }
    if (cur !== '') out.push(cur)
    return out
  }

  function parseString(s) {
    const t = s.trim()
    if (t.startsWith("'")) {
      return t.slice(1, -1)
    }
    if (t.startsWith('"')) {
      let out = ''
      for (let i = 1; i < t.length - 1; i++) {
        const ch = t[i]
        if (ch === '\\' && i + 1 < t.length - 1) {
          const nx = t[i + 1]
          const map = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' }
          out += map[nx] !== undefined ? map[nx] : nx
          i += 1
          continue
        }
        out += ch
      }
      return out
    }
    return t
  }

  function scalarValue(s) {
    const t = s.trim()
    if (t === '') return ''
    if (t.startsWith("'") || t.startsWith('"')) return parseString(t)
    if (t === 'true') return true
    if (t === 'false') return false
    if (/^-?\d+$/.test(t)) return Number(t)
    if (/^-?\d+\.\d+$/.test(t)) return Number(t)
    return t
  }

  // Parse a flow value starting at index `start` in `joined`, returning
  // { value, end } (end is index after the value).
  function parseFlow(joined, start) {
    let i = start
    function ws() { while (i < joined.length && /[\s,\n]/.test(joined[i])) i += 1 }
    function readScalar() {
      ws()
      const c = joined[i]
      if (c === '"' || c === "'") {
        const q = c
        let out = ''
        i += 1
        while (i < joined.length) {
          if (joined[i] === q) { i += 1; break }
          if (joined[i] === '\\' && q === '"') {
            const nx = joined[i + 1]
            const map = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' }
            out += map[nx] !== undefined ? map[nx] : nx
            i += 2
            continue
          }
          out += joined[i]
          i += 1
        }
        return out
      }
      let s = i
      while (i < joined.length && !/[\],\s\n]/.test(joined[i])) i += 1
      return scalarValue(joined.slice(s, i))
    }
    function readValue() {
      ws()
      const c = joined[i]
      if (c === '[') {
        i += 1
        const arr = []
        ws()
        if (joined[i] === ']') { i += 1; return arr }
        for (;;) {
          arr.push(readValue())
          ws()
          if (joined[i] === ']') { i += 1; break }
          if (joined[i] === ',') { i += 1; continue }
        }
        return arr
      }
      if (c === '{') {
        i += 1
        const obj = {}
        ws()
        if (joined[i] === '}') { i += 1; return obj }
        for (;;) {
          const key = readScalar()
          ws()
          if (joined[i] === '=' || joined[i] === ':') i += 1
          obj[String(key)] = readValue()
          ws()
          if (joined[i] === '}') { i += 1; break }
          if (joined[i] === ',') { i += 1; continue }
        }
        return obj
      }
      return readScalar()
    }
    const v = readValue()
    return { value: v, end: i }
  }

  function isBalancedValue(s) {
    // For multi-line arrays: return true when brackets/quotes are balanced.
    let stack = []
    let q = null
    for (let i = 0; i < s.length; i++) {
      const c = s[i]
      if (q) {
        if (c === '\\' && q === '"') { i += 1; continue }
        if (c === q) q = null
        continue
      }
      if (c === '"' || c === "'") { q = c; continue }
      if (c === '[') { stack.push(']'); continue }
      if (c === ']') { if (stack.pop() !== ']') return false; continue }
      if (c === '{') { stack.push('}'); continue }
      if (c === '}') { if (stack.pop() !== '}') return false; continue }
    }
    return stack.length === 0 && q === null
  }

  let i = 0
  while (i < lines.length) {
    const raw = lines[i]
    const stripped = raw.trim()
    if (stripped === '' || stripped.startsWith('#')) { i += 1; continue }
    if (stripped.startsWith('[')) {
      const header = parseTableHeader(raw)
      if (header.kind === 'array') {
        // array-of-tables: append an object to the parent array
        const parentPath = header.path.slice(0, -1)
        const last = header.path[header.path.length - 1]
        const { node } = containerFor(parentPath)
        if (!Array.isArray(node[last])) node[last] = []
        node[last].push({})
        path = header.path.concat([node[last].length - 1])
      } else {
        path = header.path
        ensureAt(path)
      }
      i += 1
      continue
    }
    // key = value
    const eq = findEq(raw)
    if (eq === -1) { i += 1; continue }
    const keyText = raw.slice(0, eq).trim()
    const key = parseKey(keyText)
    let valueText = raw.slice(eq + 1).trim()
    // multi-line value (array / inline table)
    if (!isBalancedValue(valueText)) {
      let j = i + 1
      let acc = valueText
      while (j < lines.length) {
        acc += '\n' + lines[j].trim()
        if (isBalancedValue(acc)) { valueText = acc; i = j + 1; break }
        j += 1
      }
      if (j >= lines.length) { i += 1; continue }
    } else {
      i += 1
    }
    const target = ensureAt(path)
    target[key] = parseFlow(valueText, 0).value
  }

  return root
}

function findEq(line) {
  let q = null
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '\\' && q === '"') { i += 1; continue }
      if (c === q) q = null
      continue
    }
    if (c === '"' || c === "'") { q = c; continue }
    if (c === '=') return i
  }
  return -1
}
