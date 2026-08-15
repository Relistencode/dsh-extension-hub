// Typert host manifest for dsh-myrules (hand-written, mirroring the shape
// emitted by @deepseek-ai/dsh-typert-generator).
//
// Exporting `./typert` lets @deepseek-ai/dsh-typert-loader register STRICT
// descriptors for every Remote method of the `myRules` namespace. Strict
// descriptors make the api-gateway claims table answer from the registry
// (`typert.local`) instead of the SRC marker fallback, which is immune to
// module-duplication issues that can split the private marker table in
// `dsh-typert-protocol`. Every method is a thin `input` JSON seam over the
// persistence core, so one permissive schema pair covers the whole surface.
import { z } from 'zod'

const inputSchema = z.custom(() => true)
const resultSchema = z.custom(() => true)

const methods = ['readGlobalRules', 'writeGlobalRules']

export const TYPERT = {
  package: 'dsh-myrules',
  face: 'host',
  schemas: [],
  invocations: methods.map((method) => ({
    id: `dsh-myrules#myRules/${method}`,
    service: 'myRules',
    namespace: 'myRules',
    method,
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'input',
        wire: 'input',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-myrules/types#Input',
          schema: inputSchema,
        },
      },
    ],
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-myrules/types#JsonValue',
      schema: resultSchema,
    },
  })),
  model: {
    services: [],
    events: [],
    objects: [],
  },
}
