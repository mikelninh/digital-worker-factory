import fs from 'node:fs';
import path from 'node:path';
import {activateRetainer,newCycle} from './state.mjs';

function arg(name,fallback=null){const i=process.argv.indexOf(`--${name}`);return i>=0?process.argv[i+1]:fallback}
const id=arg('id'),customer=arg('customer'),workflow=arg('workflow','repair_intake'),reviewer=arg('reviewer'),operator=arg('operator'),cadence=arg('cadence','monthly'),fee=Number(arg('fee','1500'));
if(!id||!customer||!reviewer||!operator){console.error('Usage: node packs/hauspilot/retainer/new-retainer.mjs --id <slug> --customer "<name>" --reviewer "<name>" --operator "<name>" [--workflow repair_intake] [--cadence monthly] [--fee 1500]');process.exit(2)}
if(!/^[a-z0-9][a-z0-9-]{1,48}$/.test(id)) throw new Error('id must be lowercase slug');
const allowed=new Set(['repair_intake','tenant_inbox','invoice_review']);if(!allowed.has(workflow))throw new Error(`unknown workflow: ${workflow}`);
const root=path.resolve('retainers',id);if(fs.existsSync(root))throw new Error(`retainer exists: ${root}`);fs.mkdirSync(path.join(root,'cycles'),{recursive:true});
const draft={retainer_id:id,customer,pilot_verdict:'KEEP',workflow,customer_reviewer:reviewer,operations_owner:operator,cadence,monthly_fee_eur:fee,data_mode:'anonymised',privacy_scope_confirmed:true,retention_confirmed:true,status:'DRAFT'};
const retainer=activateRetainer(draft);fs.writeFileSync(path.join(root,'retainer.json'),JSON.stringify(retainer,null,2));
const cycleId=new Date().toISOString().slice(0,7);const cycle=newCycle(retainer,cycleId);const cycleDir=path.join(root,'cycles',cycleId);fs.mkdirSync(cycleDir,{recursive:true});
fs.writeFileSync(path.join(cycleDir,'cycle.json'),JSON.stringify(cycle,null,2));
fs.writeFileSync(path.join(cycleDir,'cases.json'),JSON.stringify({cases:[]},null,2));
fs.writeFileSync(path.join(cycleDir,'measurement.json'),JSON.stringify({reviewed_cases:0,accepted_without_edit:0,accepted_after_edit:0,rejected:0,notes:''},null,2));
fs.writeFileSync(path.join(root,'START_HERE.md'),`# ${customer} — Mara Managed Operations\n\nStatus: **ACTIVE_MANAGED_OPS**\n\nCurrent cycle: \`${cycleId}\`\nMonthly fee: **€${fee}**\n\nOperations flow:\n\n1. receive agreed input\n2. run customer/privacy preflight\n3. advance cycle to PREFLIGHT only when green\n4. run approved shadow/copilot workflow\n5. send exceptions to reviewer\n6. produce proof/report\n7. close as KEEP / FIX / ESCALATE\n\nNever bypass red gates. See \`packs/hauspilot/operator/RETAINER_PLAYBOOK.md\`.\n`);
console.log(JSON.stringify({ok:true,root,status:retainer.status,cycle:cycleId,monthly_fee_eur:fee},null,2));
