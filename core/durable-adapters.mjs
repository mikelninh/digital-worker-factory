import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import { redactSensitive } from './production-boundary.mjs'

function digestKey(key) {
  return createHash('sha256').update(String(key)).digest('hex')
}

/**
 * Durable, cross-process idempotency on a shared local filesystem.
 * Atomic `wx` creation makes the first claimant win without a race on one host.
 * For multi-host production, replace this adapter with a transactional store.
 */
export class FileIdempotencyStore {
  durable = true
  #dir

  constructor({ directory = '.runtime/idempotency' } = {}) {
    this.#dir = resolve(directory)
    mkdirSync(this.#dir, { recursive: true, mode: 0o700 })
  }

  claim(key) {
    if (!key) throw new TypeError('idempotency key is required')
    const path = join(this.#dir, `${digestKey(key)}.claim`)
    try {
      writeFileSync(
        path,
        JSON.stringify({ key: String(key), claimedAt: new Date().toISOString() }),
        { flag: 'wx', mode: 0o600 },
      )
      return true
    } catch (error) {
      if (error?.code === 'EEXIST') return false
      throw error
    }
  }

  release(key) {
    if (!key) return
    const path = join(this.#dir, `${digestKey(key)}.claim`)
    rmSync(path, { force: true })
  }

  has(key) {
    if (!key) return false
    return existsSync(join(this.#dir, `${digestKey(key)}.claim`))
  }
}

/**
 * Append-only JSONL audit sink with redaction before persistence.
 * Suitable as a durable reference adapter for one host/shared filesystem.
 * Production deployments can swap the same contract for a database or log bus.
 */
export class JsonlAuditSink {
  durable = true
  #path

  constructor({ path = '.runtime/audit/events.jsonl' } = {}) {
    this.#path = resolve(path)
    mkdirSync(dirname(this.#path), { recursive: true, mode: 0o700 })
  }

  async append(event) {
    await mkdir(dirname(this.#path), { recursive: true, mode: 0o700 })
    const safe = redactSensitive(event)
    await appendFile(this.#path, `${JSON.stringify(safe)}\n`, { encoding: 'utf8', mode: 0o600 })
  }

  async events() {
    try {
      const text = await readFile(this.#path, 'utf8')
      return text
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    } catch (error) {
      if (error?.code === 'ENOENT') return []
      throw error
    }
  }
}
