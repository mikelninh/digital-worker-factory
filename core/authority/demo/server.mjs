import path from 'node:path'
import { AuthorityGateway } from '../gateway.mjs'
import { createAuthorityHttpServer, listenAuthorityService } from '../service.mjs'
import { JsonFileIdempotencyStore, JsonFileRevocationStore, JsonLinesReceiptStore } from '../stores/json-file.mjs'
import { demoPolicy } from './policy.mjs'
import { createDemoExecutors } from './providers.mjs'

const token = process.env.AUTHORITY_TOKEN
if (!token) throw new Error('Set AUTHORITY_TOKEN before starting the authority demo service.')

const dataDir = path.resolve(process.env.AUTHORITY_DATA_DIR || '.authority-data')
const port = Number(process.env.PORT || 8787)
const published = []
const gateway = new AuthorityGateway({
  policy: demoPolicy,
  executors: createDemoExecutors({ published }),
  idempotencyStore: new JsonFileIdempotencyStore(path.join(dataDir, 'idempotency.json')),
  receiptStore: new JsonLinesReceiptStore(path.join(dataDir, 'receipts.jsonl')),
})
const revocationStore = new JsonFileRevocationStore(path.join(dataDir, 'revocations.json'))
const server = createAuthorityHttpServer({ gateway, token, revocationStore })
const address = await listenAuthorityService(server, { host: '127.0.0.1', port })

console.log(`Authority service listening on http://${address.host}:${address.port}`)
console.log('Endpoints: GET /health · POST /v1/preflight · POST /v1/invoke · GET /v1/receipts · POST /v1/delegations/:id/revoke')
console.log(`Durable reference state: ${dataDir}`)
