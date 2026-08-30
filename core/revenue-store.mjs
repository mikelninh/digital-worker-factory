import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const SCHEMA = 'revenue-os-ledger-v1'

function validateDocument(document) {
  if (!document || typeof document !== 'object') throw new TypeError('Revenue ledger must be an object')
  if (document.schema !== SCHEMA) throw new Error(`Unsupported revenue ledger schema: ${document.schema}`)
  if (!Array.isArray(document.records)) throw new TypeError('Revenue ledger records must be an array')
  return document
}

export async function loadRevenueLedger(path) {
  try {
    const raw = await readFile(path, 'utf8')
    const document = validateDocument(JSON.parse(raw))
    return {
      schema: document.schema,
      updatedAt: document.updatedAt ?? null,
      records: document.records,
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { schema: SCHEMA, updatedAt: null, records: [] }
    }
    throw error
  }
}

export async function saveRevenueLedger(path, records, { now = new Date() } = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array')
  await mkdir(dirname(path), { recursive: true })

  const document = {
    schema: SCHEMA,
    updatedAt: typeof now === 'string' ? now : now.toISOString(),
    records,
  }

  const temporary = `${path}.tmp-${process.pid}`
  await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
  await rename(temporary, path)
  return document
}

export const REVENUE_LEDGER_SCHEMA = SCHEMA
