import { createHash } from 'node:crypto'
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { mkdir, open, readFile } from 'node:fs/promises'
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
    const digest = digestKey(key)
    const path = join(this.#dir, `${digest}.claim`)
    let fd
    try {
      fd = openSync(path, 'wx', 0o600)
      writeFileSync(fd, JSON.stringify({ digest, claimedAt: new Date().toISOString() }))
      fsyncSync(fd)
      return true
    } catch (error) {
      if (error?.code === 'EEXIST') return false
      throw error
    } finally {
      if (fd !== undefined) closeSync(fd)
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
 * Append-only JSONL audit sink with redaction before persistence and datasync
 * before acknowledgement. Suitable as a durable reference adapter for one
 * host/shared filesystem. Production deployments can swap the same contract
 * for a database or log bus.
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
    const handle = await open(this.#path, 'a', 0o600)
    try {
      await handle.writeFile(`${JSON.stringify(safe)}\n`, 'utf8')
      await handle.datasync()
    } finally {
      await handle.close()
    }
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
