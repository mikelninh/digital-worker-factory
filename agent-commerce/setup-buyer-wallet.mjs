import { writeFile, access } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { resolve } from 'node:path'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const DEFAULT_FILE = resolve(process.cwd(), '.env.buyer')

async function fileExists(path) {
  try {
    await access(path, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function createBuyerWallet({ file = DEFAULT_FILE } = {}) {
  if (await fileExists(file)) throw new Error(`buyer_wallet_file_exists:${file}`)

  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  const body = [
    '# Testnet-only Agent Commerce buyer wallet. NEVER COMMIT OR SHARE THIS FILE.',
    `BUYER_EVM_KEY=${privateKey}`,
    `BUYER_ADDRESS=${account.address}`,
    'AGENT_COMMERCE_URL=http://127.0.0.1:4021',
    'MAX_PAYMENT_USDC_ATOMIC=20000',
    '',
  ].join('\n')

  await writeFile(file, body, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  return { file, address: account.address }
}

async function main() {
  const result = await createBuyerWallet()
  console.log(`Created testnet-only buyer wallet: ${result.address}`)
  console.log(`Secret stored locally in: ${result.file}`)
  console.log('Fund only the public address with Base Sepolia test USDC.')
  console.log('Do not paste the private key or .env.buyer contents into chat, GitHub, tickets, or browser code.')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
