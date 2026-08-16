// Atomic file writes: write to a sibling temp file, then rename over the
// target. A crash or power loss can never leave the target half-written —
// critical for composition files (cordis.patch.yml / agent.cordis.yml) whose
// corruption would break `dsh web` startup. Transient Windows file locks
// (antivirus scans, editors) are retried with backoff, mirroring the DSH
// loader's own write behavior.
import fs from 'node:fs'
import path from 'node:path'

const WRITE_RETRY_LIMIT = 10
const WRITE_RETRY_DELAY_MS = 50

function retryableWriteError(error) {
  const code = error && typeof error.code === 'string' ? error.code : null
  return code === 'EACCES' || code === 'EBUSY' || code === 'EPERM'
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/**
 * Write `content` to `filePath` atomically (temp file + rename). Retries
 * transient lock errors with increasing backoff, then rethrows.
 */
export function writeFileAtomic(filePath, content) {
  const tmp = path.join(path.dirname(filePath), `.${path.basename(filePath)}.tmp`)
  fs.writeFileSync(tmp, content, 'utf8')
  for (let retry = 0; ; retry++) {
    try {
      fs.renameSync(tmp, filePath)
      return
    } catch (error) {
      if (!retryableWriteError(error) || retry >= WRITE_RETRY_LIMIT) {
        try { fs.rmSync(tmp, { force: true }) } catch { /* keep going */ }
        throw error
      }
      sleepSync((retry + 1) * WRITE_RETRY_DELAY_MS)
    }
  }
}
