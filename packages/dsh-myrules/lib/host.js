// Host half of dsh-myrules.
//
// A TypertRemoteService gateway under the `myRules` wire namespace with two
// thin JSON methods that read and write the user-global instruction file
// ($DSH_HOME/AGENTS.md). That file is consumed by DSH's built-in
// dsh-agent-instructions plugin and injected into every session on this host
// as a durable user-role instruction block — so editing it here customizes
// every chat. An empty save removes the file (clearing the instructions);
// content beyond the agent-instructions budget (64 KiB) is still written but
// flagged.
//
// Remote methods are registered with markRemote() instead of the @Remote
// decorator (plain-JS compatibility: the runtime does not parse decorators).
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Budget the dsh-base bundle configures for dsh-agent-instructions
// (maxBytes: 65536). Content beyond it gets omitted/truncated by the
// instructions renderer, so we surface the number and a soft warning.
const INSTRUCTION_BUDGET_BYTES = 65536

// Resolve $DSH_HOME: explicit config → DSH_HOME env → ~/.dsh.
export function resolveDshHome(configured, env = process.env) {
  if (typeof configured === 'string' && configured.trim() !== '') return configured.trim()
  const fromEnv = env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  return path.join(os.homedir(), '.dsh')
}

export function globalInstructionsPath(dshHome) {
  return path.join(dshHome, 'AGENTS.md')
}

function displayHome(dshHome) {
  const def = path.join(os.homedir(), '.dsh')
  return path.resolve(dshHome) === path.resolve(def) ? '~/.dsh' : '$DSH_HOME'
}

// Strip JSON-unsafe values (undefined) from a result object.
function jsonSafe(value) {
  if (Array.isArray(value)) return value.map(jsonSafe)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) out[key] = jsonSafe(item)
    }
    return out
  }
  return value
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

class MyRulesGateway extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, 'myRules')
    runRemoteMarks(this)
  }

  // Read the current global instruction file. When the file does not exist
  // yet, exists: false with empty content (saving creates it).
  readGlobalRules(input) {
    input = input || {}
    const dshHome = resolveDshHome(input.dshHome)
    const file = globalInstructionsPath(dshHome)
    const content = readText(file)
    return jsonSafe({
      ok: true,
      exists: content !== null,
      content: content === null ? '' : content,
      bytes: content === null ? 0 : Buffer.byteLength(content, 'utf8'),
      path: file,
      displayPath: `${displayHome(dshHome)}/AGENTS.md`,
      budget: INSTRUCTION_BUDGET_BYTES,
    })
  }

  // Save the global instruction file. `content` must be a string. Empty
  // content removes the file (clearing the instructions); non-empty content
  // overwrites it. Content beyond the 64 KiB instruction budget is written
  // anyway and flagged with `warning`.
  writeGlobalRules(input) {
    input = input || {}
    if (typeof input.content !== 'string') {
      return jsonSafe({ ok: false, code: 'invalid', message: 'content must be a string' })
    }
    if (Buffer.byteLength(input.content, 'utf8') > 64 * 1024 * 1024) {
      return jsonSafe({ ok: false, code: 'invalid', message: 'content too large' })
    }
    const dshHome = resolveDshHome(input.dshHome)
    const file = globalInstructionsPath(dshHome)
    let removed = false
    try {
      if (input.content.trim() === '') {
        if (fs.existsSync(file)) fs.rmSync(file)
        removed = true
      } else {
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, input.content, 'utf8')
      }
    } catch (error) {
      return jsonSafe({
        ok: false,
        code: 'io',
        message: error && error.message ? error.message : String(error),
      })
    }
    const bytes = Buffer.byteLength(input.content, 'utf8')
    return jsonSafe({
      ok: true,
      removed,
      bytes,
      warning: bytes > INSTRUCTION_BUDGET_BYTES,
      displayPath: `${displayHome(dshHome)}/AGENTS.md`,
    })
  }
}

// Register Remote methods (declaration order = wire order).
const remoteMarks = []
function markRemote(proto, method) {
  const context = {
    kind: 'method',
    name: method,
    private: false,
    static: false,
    addInitializer(fn) {
      remoteMarks.push({ proto, method, fn })
    },
  }
  Remote(method)(proto[method], context)
}

function runRemoteMarks(instance) {
  const proto = Object.getPrototypeOf(instance)
  for (const mark of remoteMarks) {
    if (mark.proto === proto) mark.fn.call(instance)
  }
}

for (const method of ['readGlobalRules', 'writeGlobalRules']) {
  markRemote(MyRulesGateway.prototype, method)
}

export default MyRulesGateway
