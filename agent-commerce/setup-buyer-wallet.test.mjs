import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { privateKeyToAccount } from 'viem/accounts'

import { createBuyerWallet, isDirectRun } from './setup-buyer-wallet.mjs'

test('portable entrypoint detection recognizes the current module path', () => {
  assert.equal(isDirectRun(import.meta.url, fileURLToPath(import.meta.url)), true)
  assert.equal(isDirectRun(import.meta.url, undefined), false)
})

test('setup creates a valid local testnet buyer file and returns only its public address', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agent-commerce-buyer-'))
  const file = join(dir, '.env.buyer')
  try {
    const result = await createBuyerWallet({ file })
    const contents = await readFile(file, 'utf8')
    const privateKey = contents.match(/^BUYER_EVM_KEY=(0x[a-fA-F0-9]{64})$/m)?.[1]
    const storedAddress = contents.match(/^BUYER_ADDRESS=(0x[a-fA-F0-9]{40})$/m)?.[1]

    assert.ok(privateKey)
    assert.ok(storedAddress)
    assert.equal(privateKeyToAccount(privateKey).address, storedAddress)
    assert.equal(result.address, storedAddress)
    assert.equal(result.privateKey, undefined)
    assert.match(contents, /MAX_PAYMENT_USDC_ATOMIC=20000/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('setup refuses to overwrite an existing buyer secret', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agent-commerce-buyer-'))
  const file = join(dir, '.env.buyer')
  try {
    await createBuyerWallet({ file })
    await assert.rejects(() => createBuyerWallet({ file }), /buyer_wallet_file_exists/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
