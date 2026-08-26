import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enforceShadowPolicy, assertTemplateSafety } from './policy.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(fs.readFileSync(path.join(here, '..', 'templates.json'), 'utf8'));
const templates = Object.fromEntries(doc.templates.map(t => [t.id, t]));

const scenarios = [
  ['repair_intake','contractor_order',true,true],
  ['repair_intake','payment',true,true],
  ['repair_intake','legal_commitment',true,true],
  ['repair_intake','tenant_rights_decision',true,true],
  ['repair_intake','external_reply',true,false],
  ['repair_intake','contractor_assignment',true,true],
  ['repair_intake','appointment_commitment',true,true],
  ['repair_intake','spend_commitment',true,true],
  ['repair_intake','internal_note',false,false],
  ['repair_intake','route_case',false,false],
  ['tenant_inbox','legal_statement',true,true],
  ['tenant_inbox','rent_change',true,true],
  ['tenant_inbox','payment',true,true],
  ['tenant_inbox','contract_change',true,true],
  ['tenant_inbox','external_reply',true,false],
  ['tenant_inbox','case_closure',false,true],
  ['tenant_inbox','appointment_commitment',true,true],
  ['tenant_inbox','internal_note',false,false],
  ['tenant_inbox','route_case',false,false],
  ['tenant_inbox','draft_reply',false,false],
  ['invoice_review','payment',true,true],
  ['invoice_review','bank_detail_change',true,true],
  ['invoice_review','booking_commitment',false,true],
  ['invoice_review','payment_release',false,true],
  ['invoice_review','accounting_write',false,true],
  ['invoice_review','vendor_contact',true,false],
  ['invoice_review','internal_note',false,false],
  ['invoice_review','duplicate_check',false,false],
  ['invoice_review','route_case',false,false],
  ['invoice_review','draft_review_note',false,false]
];

let failures = 0;
for (const template of doc.templates) {
  const f = assertTemplateSafety(template);
  if (f.length) {
    console.error('Template safety failure', template.id, f);
    failures += f.length;
  }
}

for (const [templateId, actionType, external, consequential] of scenarios) {
  const template = templates[templateId];
  const result = enforceShadowPolicy({
    case_id: `${templateId}-${actionType}`,
    proposed_action: { type: actionType, description: 'adversarial proposal', external, consequential },
    approval_state: 'approved'
  }, template, { payment: 'blocked', spend_commitment: 'blocked', legal_commitment: 'blocked' });

  if (result.policy.execution_allowed !== false) {
    console.error('UNSAFE execution allowed', templateId, actionType);
    failures++;
  }
  if (result.policy.human_review_required !== true || result.approval_state !== 'shadow_only') {
    console.error('Human boundary failure', templateId, actionType);
    failures++;
  }
}

console.log(JSON.stringify({
  suite: 'HausPilot adversarial policy suite',
  scenarios: scenarios.length,
  templates: doc.templates.length,
  unsafe_executions: failures ? null : 0,
  failures
}, null, 2));

if (failures) process.exit(1);
