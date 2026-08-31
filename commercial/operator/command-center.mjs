#!/usr/bin/env node

import http from 'node:http'
import { readFile } from 'node:fs/promises'

import {
  buildCommercialQueue,
  executeCommercialAction,
  getProduct,
  summarizeCommercialPortfolio,
  upsertCommercialRecord,
} from '../../core/commercial-os.mjs'
import { loadCommercialLedger, saveCommercialLedger } from '../../core/commercial-store.mjs'

const catalog = JSON.parse(await readFile(new URL('../products.json', import.meta.url), 'utf8'))

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function renderCommercialCommandCenter(records = []) {
  const portfolio = summarizeCommercialPortfolio(records)
  const queue = buildCommercialQueue(records, { maxActions: 20 })
  const cards = queue.map((item) => {
    const record = records.find((candidate) => candidate.id === item.id)
    const approval = item.approvalRequired
      ? `<form method="post" action="/approve"><input type="hidden" name="id" value="${escapeHtml(item.id)}"><input type="hidden" name="action" value="${escapeHtml(item.action)}"><input name="approvedBy" placeholder="Approver name" required><button type="submit">Approve</button></form>`
      : '<span class="automatic">Automatic / operator input</span>'
    const evidence = (record?.evidence || []).slice(0, 2).map((entry) => `<li>${escapeHtml(entry.fact || entry.source || entry)}</li>`).join('')
    return `<article><h2>${escapeHtml(item.account)}</h2><p><strong>${escapeHtml(item.productId)}</strong> · ${escapeHtml(item.stage)}</p><p>Next: <code>${escapeHtml(item.action)}</code></p><ul>${evidence}</ul>${approval}</article>`
  }).join('\n') || '<p>No commercial actions need attention.</p>'

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CommercialOS</title><style>body{font-family:system-ui,sans-serif;max-width:980px;margin:40px auto;padding:0 20px;background:#fafafa;color:#171717}header{display:flex;justify-content:space-between;gap:20px;align-items:end}section.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.metric,article{background:white;border:1px solid #e5e5e5;border-radius:16px;padding:18px}.metric strong{display:block;font-size:1.5rem}article{margin:12px 0}form{display:flex;gap:8px;margin-top:14px}input{padding:10px;border:1px solid #bbb;border-radius:10px;flex:1}button{padding:10px 16px;border:0;border-radius:10px;background:#111;color:white;font-weight:700}.automatic{font-size:.9rem;color:#666}code{background:#eee;padding:3px 6px;border-radius:6px}@media(max-width:700px){section.metrics{grid-template-columns:1fr 1fr}header{display:block}}</style></head><body><header><div><h1>CommercialOS</h1><p>Human authority where money or reputation leaves the system.</p></div><div>${queue.filter((item)=>item.approvalRequired).length} approval(s)</div></header><section class="metrics"><div class="metric">Cash<strong>€${portfolio.collectedCashEur}</strong></div><div class="metric">MRR<strong>€${portfolio.recurringMonthlyEur}</strong></div><div class="metric">Measured value<strong>€${portfolio.measuredCustomerValueEur}</strong></div><div class="metric">Paid customers<strong>${portfolio.paidCustomers}</strong></div></section><main>${cards}</main></body></html>`
}

function parseForm(body) {
  const params = new URLSearchParams(body)
  return Object.fromEntries(params.entries())
}

export function approvePreparedAction(record, { action, approvedBy } = {}) {
  const product = getProduct(catalog, record.productId)
  let outcome = {}
  if (action === 'send_renewal_offer') {
    outcome = { monthlyEur: record.renewalProposal?.monthlyEur }
  }
  return executeCommercialAction(record, { action, approvedBy, product, outcome })
}

export function createCommercialCommandCenter({ ledgerPath }) {
  if (!ledgerPath) throw new TypeError('ledgerPath is required')
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/') {
        const ledger = await loadCommercialLedger(ledgerPath)
        const html = renderCommercialCommandCenter(ledger.records)
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(html)
        return
      }

      if (req.method === 'POST' && req.url === '/approve') {
        let body = ''
        for await (const chunk of req) body += chunk
        const { id, action, approvedBy } = parseForm(body)
        const ledger = await loadCommercialLedger(ledgerPath)
        const record = ledger.records.find((candidate) => candidate.id === id)
        if (!record) throw new Error(`Record not found: ${id}`)
        const updated = approvePreparedAction(record, { action, approvedBy })
        await saveCommercialLedger(ledgerPath, upsertCommercialRecord(ledger.records, updated))
        res.writeHead(303, { location: '/' })
        res.end()
        return
      }

      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('Not found')
    } catch (error) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(error.message)
    }
  })
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const ledgerPath = process.argv[2] || '.commercial/ledger.json'
  const port = Number(process.env.PORT || 4310)
  createCommercialCommandCenter({ ledgerPath }).listen(port, '127.0.0.1', () => {
    console.log(`CommercialOS command center: http://127.0.0.1:${port}`)
  })
}
