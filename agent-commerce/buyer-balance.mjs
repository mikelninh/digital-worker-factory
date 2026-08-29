import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createPublicClient, formatEther, formatUnits, http, parseAbi } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

import { BASE_SEPOLIA_USDC } from './buyer-smoke.mjs'

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
])

export function isDirectRun(metaUrl = import.meta.url, argv1) {
  const candidate = arguments.length < 2 ? process.argv[1] : argv1
  return Boolean(candidate) && metaUrl === pathToFileURL(resolve(candidate)).href
}

export function resolveBuyerAddress(env = process.env) {
  if (/^0x[a-fA-F0-9]{40}$/.test(env.BUYER_ADDRESS ?? '')) return env.BUYER_ADDRESS
  if (/^0x[a-fA-F0-9]{64}$/.test(env.BUYER_EVM_KEY ?? '')) return privateKeyToAccount(env.BUYER_EVM_KEY).address
  throw new Error('BUYER_ADDRESS_or_BUYER_EVM_KEY_required')
}

export async function readBuyerBalance({ env = process.env } = {}) {
  const address = resolveBuyerAddress(env)
  const rpcUrl = env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'
  const client = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) })
  const [usdcAtomic, ethWei] = await Promise.all([
    client.readContract({ address: BASE_SEPOLIA_USDC, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }),
    client.getBalance({ address }),
  ])
  return {
    address,
    network: 'eip155:84532',
    usdc: formatUnits(usdcAtomic, 6),
    usdcAtomic: usdcAtomic.toString(),
    eth: formatEther(ethWei),
    note: 'Public balances only. No private key is printed or transmitted by this command.',
  }
}

async function main() {
  console.log(JSON.stringify(await readBuyerBalance(), null, 2))
}

if (isDirectRun()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
