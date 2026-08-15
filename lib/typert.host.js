// Typert host manifest for dsh-extension-hub (hand-written, mirroring the
// shape emitted by @deepseek-ai/dsh-typert-generator).
//
// Exporting `./typert` lets @deepseek-ai/dsh-typert-loader register STRICT
// descriptors for every Remote method of the `extensionHub` namespace. Strict
// descriptors make the api-gateway claims table answer from the registry
// (`typert.local`) instead of the SRC marker fallback, which is immune to
// module-duplication issues that can split the private marker table in
// `dsh-typert-protocol` (e.g. a profile node_modules copy vs the npx-cache
// instance). Every method is a thin `input` JSON seam over the persistence
// core, so one permissive schema pair covers the whole surface.
import { z } from 'zod'

const inputSchema = z.custom(() => true)
const resultSchema = z.custom(() => true)

const methods = [
  'list',
  'getSkill',
  'createSkill',
  'updateSkill',
  'removeSkill',
  'toggleSkill',
  'getMcp',
  'upsertMcp',
  'removeMcp',
  'toggleMcp',
  'discover',
  'importItems',
  'projectInfo',
  'getState',
  'setState',
  'pickProjectFolder',
  'listDirectory',
  'createDirectory',
  'listPlugins',
  'listFeatures',
  'setPluginEnabled',
  'removePlugin',
  'discoverPlugins',
  'curatedPlugins',
  'installPlugin',
  'checkPluginUpdates',
  'updatePluginItem',
  'checkUpdates',
  'updatePlugin',
]

export const TYPERT = {
  package: 'dsh-extension-hub',
  face: 'host',
  schemas: [],
  invocations: methods.map((method) => ({
    id: `dsh-extension-hub#extensionHub/${method}`,
    service: 'extensionHub',
    namespace: 'extensionHub',
    method,
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'input',
        wire: 'input',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-extension-hub/types#Input',
          schema: inputSchema,
        },
      },
    ],
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-extension-hub/types#JsonValue',
      schema: resultSchema,
    },
  })),
  model: {
    services: [],
    events: [],
    objects: [],
  },
}
