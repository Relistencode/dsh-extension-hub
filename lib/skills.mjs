// Structured create / read / update for DSH skills (SKILL.md frontmatter +
// body). The frontmatter subset this manager owns is preserved exactly;
// unknown keys in an existing file are kept on update through the merge path
// in updateSkill (read → merge → rewrite), so a hand-written file loses
// nothing the manager does not understand.
import fs from 'node:fs'
import path from 'node:path'
import { emit } from './emit.mjs'
import { splitFrontmatter } from './yaml.mjs'
import { skillTargetDir, findSkillFile } from './install.mjs'

export function kebab(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Render a skill into a DSH-compatible SKILL.md document. Input fields mirror
// the readSkill output so save-round-trips are lossless for owned keys.
export function renderSkillMd(input) {
  const fm = {}
  fm.name = input.name
  if (input.description) fm.description = input.description
  if (input.whenToUse) fm.whenToUse = input.whenToUse
  if (input.userInvocable !== undefined) fm['user-invocable'] = !!input.userInvocable
  if (input.disableModelInvocation !== undefined) fm['disable-model-invocation'] = !!input.disableModelInvocation
  const meta = {}
  if (input.license) meta.license = input.license
  if (input.allowedTools !== undefined && input.allowedTools !== null && input.allowedTools !== '') meta['allowed-tools'] = input.allowedTools
  if (Object.keys(meta).length) fm.metadata = meta
  const header = '---\n' + emit(fm) + '\n---\n\n'
  return header + (input.body || '')
}

export function createSkill(input, scope, cwd = process.cwd()) {
  const name = kebab(input && input.name)
  if (!name) throw new Error('skill name is required')
  const existing = findSkillFile(name, scope, cwd)
  if (existing) throw new Error(`skill already exists: ${name} (${scope}) -> ${existing}`)
  const dir = path.join(skillTargetDir(scope, cwd), name)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'SKILL.md')
  fs.writeFileSync(file, renderSkillMd({ ...input, name }), 'utf8')
  return { file, name, scope }
}

export function readSkill(name, scope, cwd = process.cwd()) {
  const file = findSkillFile(name, scope, cwd)
  if (!file) throw new Error(`skill not found: ${name} (${scope})`)
  const text = fs.readFileSync(file, 'utf8')
  const { frontmatter, body } = splitFrontmatter(text)
  const fm = frontmatter || {}
  const meta = (fm.metadata && typeof fm.metadata === 'object') ? fm.metadata : {}
  return {
    kind: 'skill',
    name: kebab(String(fm.name || name)),
    file,
    description: typeof fm.description === 'string' ? fm.description : '',
    whenToUse: typeof fm.whenToUse === 'string' ? fm.whenToUse : '',
    license: typeof meta.license === 'string' ? meta.license : '',
    allowedTools: meta['allowed-tools'],
    userInvocable: fm['user-invocable'] === undefined ? true : !!fm['user-invocable'],
    disableModelInvocation: !!fm['disable-model-invocation'],
    body: body || '',
  }
}

// Update an existing skill. Fields present in `input` replace the current
// value; absent fields keep the current value. A `newName` renames the file.
export function updateSkill(name, input, scope, cwd = process.cwd()) {
  const current = readSkill(name, scope, cwd)
  const nextName = input.newName ? kebab(input.newName) : current.name
  const pick = (field) => (input[field] !== undefined ? input[field] : current[field])
  const next = {
    name: nextName,
    description: pick('description'),
    whenToUse: pick('whenToUse'),
    license: pick('license'),
    allowedTools: pick('allowedTools'),
    userInvocable: pick('userInvocable'),
    disableModelInvocation: pick('disableModelInvocation'),
    body: pick('body'),
  }
  if (nextName !== name) {
    const target = findSkillFile(nextName, scope, cwd)
    if (target) throw new Error(`skill already exists: ${nextName} (${scope})`)
  }
  const content = renderSkillMd(next)
  if (nextName === name) {
    fs.writeFileSync(current.file, content, 'utf8')
    return { file: current.file, name, scope }
  }
  const dir = path.join(skillTargetDir(scope, cwd), nextName)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'SKILL.md')
  fs.writeFileSync(file, content, 'utf8')
  const oldDir = path.join(skillTargetDir(scope, cwd), name)
  if (fs.existsSync(oldDir)) fs.rmSync(oldDir, { recursive: true, force: true })
  const oldFlat = path.join(skillTargetDir(scope, cwd), `${name}.md`)
  if (fs.existsSync(oldFlat)) fs.rmSync(oldFlat)
  return { file, name: nextName, scope }
}
