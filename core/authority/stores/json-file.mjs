import fs from 'node:fs'
import path from 'node:path'

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback
    throw error
  }
}

function atomicWriteJson(filePath, value) {
  ensureParent(filePath)
  const temp = `${filePath}.${process.pid}.tmp`
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  fs.renameSync(temp, filePath)
}

export class JsonFileIdempotencyStore {
  #filePath
  #records

  constructor(filePath) {
    if (!filePath) throw new Error('idempotency_store_path_required')
    this.#filePath = filePath
    this.#records = readJson(filePath, {})
  }

  get(key) {
    return this.#records[String(key)] ?? null
  }

  claim(key, value = {}) {
    const normalized = String(key)
    const existing = this.get(normalized)
    if (existing) return { claimed: false, record: existing }
    const record = { state: 'pending', ...value }
    this.#records[normalized] = record
    atomicWriteJson(this.#filePath, this.#records)
    return { claimed: true, record }
  }

  complete(key, value = {}) {
    const record = { state: 'completed', ...value }
    this.#records[String(key)] = record
    atomicWriteJson(this.#filePath, this.#records)
    return record
  }

  fail(key, value = {}) {
    const record = { state: 'failed', ...value }
    this.#records[String(key)] = record
    atomicWriteJson(this.#filePath, this.#records)
    return record
  }

  set(key, value) {
    return this.complete(key, value)
  }
}

export class JsonLinesReceiptStore {
  #filePath

  constructor(filePath) {
    if (!filePath) throw new Error('receipt_store_path_required')
    this.#filePath = filePath
  }

  append(receipt) {
    ensureParent(this.#filePath)
    fs.appendFileSync(this.#filePath, `${JSON.stringify(receipt)}\n`, { mode: 0o600 })
    return receipt
  }

  list() {
    try {
      return fs.readFileSync(this.#filePath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    } catch (error) {
      if (error?.code === 'ENOENT') return []
      throw error
    }
  }
}

export class JsonFileRevocationStore {
  #filePath
  #records

  constructor(filePath) {
    if (!filePath) throw new Error('revocation_store_path_required')
    this.#filePath = filePath
    this.#records = readJson(filePath, {})
  }

  get(delegationId) {
    return this.#records[String(delegationId)] ?? null
  }

  isRevoked(delegationId) {
    return Boolean(this.get(delegationId))
  }

  revoke(delegationId, metadata = {}) {
    if (!delegationId) throw new Error('delegation_id_required')
    const key = String(delegationId)
    const existing = this.get(key)
    if (existing) return existing
    const record = {
      delegationId: key,
      revokedAt: metadata.revokedAt ?? new Date().toISOString(),
      revokedBy: metadata.revokedBy ?? null,
      reason: metadata.reason ?? null,
    }
    this.#records[key] = record
    atomicWriteJson(this.#filePath, this.#records)
    return record
  }
}
