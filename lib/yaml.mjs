// A focused YAML-subset parser sufficient for DSH composition files
// (cordis.yml patch layers, agent.cordis.yml presets) and SKILL.md frontmatter.
//
// Supported:
//   - comments (# ...)
//   - block sequences ("- item") and block mappings ("key: value")
//   - nesting by indentation
//   - flow sequences [a, b] and flow mappings {a: b} (may span lines)
//   - plain / single-quoted / double-quoted scalars
//   - block scalars |, |-, |+, >, >-, >+
//   - YAML tags (!!js, !!str, !!int, !!bool, !!null) — !!js scalars are returned
//     as { __js: "<expression>" }; other tags are parsed to their plain value.
//   - true/false/null/~ and integer/float literals (best effort)
//
// This is intentionally NOT a general YAML implementation. It is only meant to
// read the DSH files this manager touches; writes use managed-region text edits
// so original comments are preserved.

export function parseYaml(text) {
  const src = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = src.split('\n')
  let pos = 0

  const isBlank = (s) => s.trim() === ''
  const isComment = (s) => s.trimStart().startsWith('#')
  const indentOf = (line) => {
    let n = 0
    while (n < line.length && line[n] === ' ') n += 1
    return n
  }

  function peekContent() {
    let p = pos
    while (p < lines.length) {
      const line = lines[p]
      if (isBlank(line) || isComment(line)) {
        p += 1
        continue
      }
      return { lineIdx: p, indent: indentOf(line), body: line.slice(indentOf(line)) }
    }
    return null
  }

  function error(msg, lineIdx) {
    const ln = lineIdx != null ? lines[lineIdx] : lines[pos]
    throw new Error(`YAML parse error at line ${(lineIdx != null ? lineIdx : pos) + 1}: ${msg}\n  ${ln}`)
  }

  // ── scalars ────────────────────────────────────────────────────────────────

  function peelTag(chunk) {
    const m = chunk.match(/^(!![A-Za-z0-9_-]+)\s+(.*)$/)
    if (m) return { tag: m[1], rest: m[2] }
    return { tag: null, rest: chunk }
  }

  function plainCommentIndex(s) {
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '#') {
        if (i === 0 || /\s/.test(s[i - 1])) return i
      }
    }
    return -1
  }

  function scalarValue(chunk) {
    const trimmed = chunk.trim()
    const { tag, rest } = peelTag(trimmed)
    let value
    const r = rest
    if (r === '' || r === '~' || r === 'null' || r === 'Null' || r === 'NULL') value = null
    else if (r === 'true' || r === 'True' || r === 'TRUE') value = true
    else if (r === 'false' || r === 'False' || r === 'FALSE') value = false
    else if (r.startsWith("'")) value = parseSingleQuoted(r)
    else if (r.startsWith('"')) value = parseDoubleQuoted(r)
    else if (/^-?\d+$/.test(r)) value = Number(r)
    else if (/^-?\d+\.\d+$/.test(r)) value = Number(r)
    else {
      const ci = plainCommentIndex(r)
      value = (ci >= 0 ? r.slice(0, ci) : r).trim()
    }
    if (tag === '!!js') return { __js: typeof value === 'string' ? value : rest }
    if (tag != null) return value
    return value
  }

  function parseSingleQuoted(s) {
    let out = ''
    let i = 1
    while (i < s.length) {
      const ch = s[i]
      if (ch === "'") {
        if (s[i + 1] === "'") { out += "'"; i += 2; continue }
        break
      }
      out += ch
      i += 1
    }
    return out
  }

  function parseDoubleQuoted(s) {
    let out = ''
    let i = 1
    while (i < s.length) {
      const ch = s[i]
      if (ch === '\\' && i + 1 < s.length) {
        const nx = s[i + 1]
        const map = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', '0': '\0' }
        if (map[nx] !== undefined) { out += map[nx]; i += 2; continue }
        if (nx === 'u' && /^[0-9a-fA-F]{4}/.test(s.slice(i + 2, i + 6))) {
          out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16))
          i += 6
          continue
        }
        out += nx
        i += 2
        continue
      }
      if (ch === '"') break
      out += ch
      i += 1
    }
    return out
  }

  // ── flow collections ──────────────────────────────────────────────────────

  function balancedFlow(s) {
    let stack = []
    let i = 0
    let inS = false
    let inD = false
    while (i < s.length) {
      const c = s[i]
      if (inS) {
        if (c === "'" && s[i + 1] === "'") { i += 2; continue }
        if (c === "'") inS = false
        i += 1
        continue
      }
      if (inD) {
        if (c === '\\') { i += 2; continue }
        if (c === '"') inD = false
        i += 1
        continue
      }
      if (c === "'") { inS = true; i += 1; continue }
      if (c === '"') { inD = true; i += 1; continue }
      if (c === '[' || c === '{') { stack.push(c); i += 1; continue }
      if (c === ']' || c === '}') { stack.pop(); i += 1; continue }
      i += 1
    }
    return stack.length === 0 && !inS && !inD
  }

  function parseFlowString(s) {
    let i = 0
    function ws() { while (i < s.length && /[\s,]/.test(s[i])) i += 1 }
    function skipWs() {
      for (;;) {
        ws()
        if (s[i] === '#') { while (i < s.length && s[i] !== '\n') i += 1; continue }
        break
      }
    }
    function readScalar() {
      skipWs()
      const c = s[i]
      if (c === "'") {
        let out = ''
        i += 1
        while (i < s.length) {
          if (s[i] === "'" && s[i + 1] === "'") { out += "'"; i += 2; continue }
          if (s[i] === "'") { i += 1; break }
          out += s[i]; i += 1
        }
        return out
      }
      if (c === '"') {
        let out = ''
        i += 1
        while (i < s.length) {
          if (s[i] === '\\') {
            const nx = s[i + 1]
            const map = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' }
            out += map[nx] !== undefined ? map[nx] : nx
            i += 2
            continue
          }
          if (s[i] === '"') { i += 1; break }
          out += s[i]; i += 1
        }
        return out
      }
      let start = i
      while (i < s.length && !/[\],\s]/.test(s[i])) i += 1
      return scalarValue(s.slice(start, i))
    }
    function readValue() {
      skipWs()
      const c = s[i]
      if (c === '[') {
        i += 1
        const arr = []
        skipWs()
        if (s[i] === ']') { i += 1; return arr }
        for (;;) {
          arr.push(readValue())
          skipWs()
          if (s[i] === ']') { i += 1; break }
          if (s[i] === ',') { i += 1; continue }
        }
        return arr
      }
      if (c === '{') {
        i += 1
        const obj = {}
        skipWs()
        if (s[i] === '}') { i += 1; return obj }
        for (;;) {
          const key = readScalar()
          skipWs()
          if (s[i] === ':') i += 1
          obj[String(key)] = readValue()
          skipWs()
          if (s[i] === '}') { i += 1; break }
          if (s[i] === ',') { i += 1; continue }
        }
        return obj
      }
      return readScalar()
    }
    return readValue()
  }

  // Parse a flow collection that starts at `startCol` of `lineIdx`; consumes
  // subsequent lines until balanced. Sets pos past the consumed lines.
  function parseFlowAt(lineIdx, startCol) {
    let p = lineIdx
    while (p < lines.length) {
      const text = lines.slice(lineIdx, p + 1).join('\n').slice(startCol)
      if (balancedFlow(text)) break
      p += 1
    }
    if (p >= lines.length) error('unterminated flow collection', lineIdx)
    const text = lines.slice(lineIdx, p + 1).join('\n').slice(startCol)
    pos = p + 1
    return parseFlowString(text)
  }

  // ── block scalars ─────────────────────────────────────────────────────────

  function parseBlockScalar(lineIdx, header) {
    const folded = header[0] === '>'
    const chomp = header.includes('+') ? 'keep' : header.includes('-') ? 'strip' : 'clip'
    let contentIndent = null
    let p = lineIdx + 1
    while (p < lines.length) {
      if (isBlank(lines[p]) || isComment(lines[p])) { p += 1; continue }
      contentIndent = indentOf(lines[p])
      break
    }
    if (contentIndent === null) { pos = lines.length; return '' }
    const raw = []
    while (p < lines.length) {
      const line = lines[p]
      if (isBlank(line)) { raw.push(''); p += 1; continue }
      if (indentOf(line) < contentIndent) break
      raw.push(line.slice(contentIndent))
      p += 1
    }
    let value = folded ? foldLines(raw) : raw.join('\n')
    if (chomp === 'strip') value = value.replace(/\n+$/, '')
    else if (chomp === 'clip') value = value.replace(/\n+$/, '') + '\n'
    pos = p
    return value
  }

  function foldLines(raw) {
    const out = []
    let para = []
    const flush = () => { if (para.length) { out.push(para.join(' ')); para = [] } }
    for (const line of raw) {
      if (line === '') { flush(); out.push(''); continue }
      para.push(line)
    }
    flush()
    return out.join('\n')
  }

  // ── block structure ───────────────────────────────────────────────────────

  function isSeqLine(body) {
    return body === '-' || body.startsWith('- ')
  }

  function splitKey(body) {
    let i = 0
    let key
    if (body[0] === '"' || body[0] === "'") {
      const q = body[0]
      i = 1
      let k = ''
      while (i < body.length) {
        if (body[i] === q) {
          if (body[i + 1] === q) { k += q; i += 2; continue }
          i += 1
          break
        }
        k += body[i]
        i += 1
      }
      key = k
      // A quoted scalar is only a mapping key when a colon follows the quote.
      let j = i
      while (j < body.length && body[j] === ' ') j += 1
      if (body[j] !== ':') return null
      i = j + 1
    } else {
      while (i < body.length && body[i] !== ':') i += 1
      if (i >= body.length) return null
      key = body.slice(0, i).trim()
      i += 1
    }
    if (key === '') return null
    return { key, rest: body.slice(i) }
  }

  function parseKeyValue(keyIndent, rest, lineIdx) {
    const r = rest.trimStart()
    if (r === '' || r.startsWith('#')) {
      const v = parseBlock(keyIndent + 1)
      return v === null ? null : v
    }
    if (r.startsWith('|') || r.startsWith('>')) {
      return parseBlockScalar(lineIdx, r.replace(/#.*$/, '').trim())
    }
    if (r.startsWith('[') || r.startsWith('{')) {
      const col = lines[lineIdx].indexOf(r[0])
      return parseFlowAt(lineIdx, col < 0 ? lineIdx : col)
    }
    return scalarValue(rest)
  }

  function parseMappingFirst(keyIndent, firstKey, firstRest, lineIdx) {
    const obj = {}
    obj[firstKey] = parseKeyValue(keyIndent, firstRest, lineIdx)
    for (;;) {
      const c = peekContent()
      if (!c || c.indent !== keyIndent) break
      const kv = splitKey(c.body)
      if (!kv) break
      pos = c.lineIdx + 1
      obj[kv.key] = parseKeyValue(keyIndent, kv.rest, c.lineIdx)
    }
    return obj
  }

  function parseMapping(indent) {
    const obj = {}
    for (;;) {
      const c = peekContent()
      if (!c || c.indent !== indent) break
      const kv = splitKey(c.body)
      if (!kv) break
      pos = c.lineIdx + 1
      obj[kv.key] = parseKeyValue(indent, kv.rest, c.lineIdx)
    }
    return obj
  }

  function parseSequence(indent) {
    const arr = []
    for (;;) {
      const c = peekContent()
      if (!c || c.indent !== indent || !isSeqLine(c.body)) break
      pos = c.lineIdx + 1
      const rest = c.body === '-' ? '' : c.body.slice(2)
      if (rest.trim() === '' || rest.trim().startsWith('#')) {
        const v = parseBlock(indent + 1)
        arr.push(v === null ? null : v)
      } else if (rest.trimStart().startsWith('|') || rest.trimStart().startsWith('>')) {
        arr.push(parseBlockScalar(c.lineIdx, rest.trimStart().replace(/#.*$/, '').trim()))
      } else if (rest.trimStart().startsWith('[') || rest.trimStart().startsWith('{')) {
        const r = rest.trimStart()
        const col = lines[c.lineIdx].indexOf(r[0])
        arr.push(parseFlowAt(c.lineIdx, col < 0 ? c.lineIdx : col))
      } else {
        const kv = splitKey(rest)
        if (kv) arr.push(parseMappingFirst(indent + 2, kv.key, kv.rest, c.lineIdx))
        else arr.push(scalarValue(rest))
      }
    }
    return arr
  }

  function parseScalarLine(lineIdx, indent) {
    const body = lines[lineIdx].slice(indent)
    const r = body.trimStart()
    if (r.startsWith('|') || r.startsWith('>')) {
      return parseBlockScalar(lineIdx, r.replace(/#.*$/, '').trim())
    }
    if (r.startsWith('[') || r.startsWith('{')) {
      const col = lines[lineIdx].indexOf(r[0])
      return parseFlowAt(lineIdx, col < 0 ? lineIdx : col)
    }
    pos = lineIdx + 1
    return scalarValue(body)
  }

  function parseBlock(minIndent) {
    const c = peekContent()
    if (!c) return null
    if (c.indent < minIndent) return null
    if (isSeqLine(c.body)) return parseSequence(c.indent)
    if (splitKey(c.body)) return parseMapping(c.indent)
    return parseScalarLine(c.lineIdx, c.indent)
  }

  return parseBlock(0)
}

// Parse YAML frontmatter from a SKILL.md body: leading "---\n...\n---".
// Returns { frontmatter: object|null, body: string }.
export function splitFrontmatter(text) {
  const s = String(text).replace(/\r\n/g, '\n')
  if (!s.startsWith('---')) return { frontmatter: null, body: s }
  const end = s.indexOf('\n---', 3)
  if (end === -1) return { frontmatter: null, body: s }
  const fmText = s.slice(4, end)
  const body = s.slice(end + 4).replace(/^\n+/, '')
  let frontmatter = null
  try {
    frontmatter = parseYaml(fmText)
  } catch {
    frontmatter = null
  }
  return { frontmatter: frontmatter && typeof frontmatter === 'object' ? frontmatter : null, body }
}
