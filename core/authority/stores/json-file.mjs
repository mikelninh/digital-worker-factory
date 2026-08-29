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

  set(key, value) {
    this.#records[String(key)] = value
    atomicWriteJson(this.#filePath, this.#records)
    return value
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
