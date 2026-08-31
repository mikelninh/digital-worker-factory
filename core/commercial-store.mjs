import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const SCHEMA = 'commercial-ledger-v1'

export async function loadCommercialLedger(path) {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'))
    if (parsed.schema !== SCHEMA || !Array.isArray(parsed.records)) {
      throw new Error('unsupported commercial ledger schema')
    }
    return parsed
  } catch (error) {
    if (error?.code === 'ENOENT') return { schema: SCHEMA, updatedAt: null, records: [] }
    throw error
  }
}

export async function saveCommercialLedger(path, records, { now = new Date() } = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array')
  await mkdir(dirname(path), { recursive: true })
  const document = {
    schema: SCHEMA,
    updatedAt: typeof now === 'string' ? now : now.toISOString(),
    records,
  }
  const tmp = `${path}.tmp`
  await writeFile(tmp, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
  await rename(tmp, path)
  return document
}

export const COMMERCIAL_LEDGER_SCHEMA = SCHEMA
