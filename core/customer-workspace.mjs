import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

function safeId(value) {
  const result = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '')
  if (!result) throw new TypeError('workspace id is required')
  return result
}

export async function createCustomerWorkspace({ root, record, product, now = new Date() } = {}) {
  if (!root) throw new TypeError('root is required')
  if (!record?.id) throw new TypeError('record is required')
  if (record.stage !== 'paid') throw new Error('workspace can only be created after required payment is recorded')
  if (!product?.id) throw new TypeError('product is required')

  const id = safeId(record.id)
  const workspace = join(root, id)
  await mkdir(join(workspace, 'input'), { recursive: true })
  await mkdir(join(workspace, 'delivery'), { recursive: true })
  await mkdir(join(workspace, 'proof'), { recursive: true })

  const timestamp = typeof now === 'string' ? now : now.toISOString()
  const manifest = {
    schema: 'customer-workspace-v1',
    commercialRecordId: record.id,
    account: record.account,
    productId: product.id,
    deliveryTemplate: product.deliveryTemplate,
    createdAt: timestamp,
    authority: {
      externalActionsRequireApproval: true,
      productionWritesRequirePolicyGate: true,
    },
    successMetric: record.successMetric ?? null,
    requiredInputs: ['named_reviewer', 'success_metric', 'bounded_sample'],
    status: 'ONBOARDING_READY',
  }

  await writeFile(join(workspace, 'workspace.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  await writeFile(join(workspace, 'input', 'README.md'), '# Customer inputs\n\nPlace only the agreed bounded sample and required reference data here.\n', 'utf8')
  await writeFile(join(workspace, 'delivery', 'README.md'), '# Delivery\n\nGenerated governed worker outputs belong here. Consequential actions remain approval-gated.\n', 'utf8')
  await writeFile(join(workspace, 'proof', 'README.md'), '# Proof\n\nStore before/after measurements, review evidence, failures and customer-visible outcome proof here.\n', 'utf8')

  return { workspace, manifest }
}
