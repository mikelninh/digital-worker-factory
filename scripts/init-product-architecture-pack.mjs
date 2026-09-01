#!/usr/bin/env node

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const target = process.argv[2] || 'architecture';
const today = new Date().toISOString().slice(0, 10);

const files = {
  'intent.md': `<!-- paos:reviewed=${today} -->\n# Intent\n\n## One sentence\n\n<What valuable outcome should exist?>\n\n## Primary user\n\n<Who has the painful job?>\n\n## Problem\n\n<What is difficult today, in observable terms?>\n\n## Desired outcome\n\n<What becomes meaningfully better?>\n\n## Non-goals\n\n- <What are we explicitly not solving?>\n\n## Success looks like\n\n<How will a user or reviewer know this worked?>\n`,
  'product-spec.md': `<!-- paos:reviewed=${today} -->\n# Product specification\n\n## Core workflows\n\n1. <Workflow one>\n2. <Workflow two>\n3. <Workflow three>\n\n## Failure states\n\n- <What must never happen?>\n\n## Acceptance criteria\n\n- [ ] <Observable criterion>\n\n## Human experience\n\n<What should be understandable in seconds? What should require deliberate review?>\n`,
  'architecture.md': `<!-- paos:reviewed=${today} -->\n# Architecture\n\n## System shape\n\n\`\`\`text\n<input> -> <system boundaries> -> <verified outcome>\n\`\`\`\n\n## Data ownership\n\n<Where does data live and who controls it?>\n\n## Capabilities / APIs\n\n- <Capability and authority>\n\n## Trust boundaries\n\n- <Boundary>\n\n## Decisions\n\n- GREEN: <reversible decisions agents may make>\n- AMBER: <expensive decisions requiring approval>\n- RED: <hard-to-reverse / consequential human decisions>\n`,
  'constraints.md': `<!-- paos:reviewed=${today} -->\n# Constraints\n\n## Human authority\n\n- <What always remains a human decision?>\n\n## Security / privacy\n\n- <Sensitive-data and access rules>\n\n## Compliance / domain rules\n\n- <Relevant boundaries>\n\n## Cost / performance\n\n- <Envelope>\n\n## Product truth\n\n- Do not claim a stronger proof level than the evidence supports.\n`,
  'golden-cases.md': `<!-- paos:reviewed=${today} -->\n# Golden cases\n\n## Golden case 1 — <name>\n\n**Starting situation:** <realistic input>\n\n**Expected outcome:** <user-level result>\n\n**Evidence required:** <sources / trace / test>\n\n**Failure conditions:** <what fails the case>\n\n**Authority rule:** <what requires human review>\n\n**Status:** UNPROVEN\n\n---\n\n## Golden case 2 — <name>\n\n**Starting situation:** <realistic input>\n\n**Expected outcome:** <user-level result>\n\n**Evidence required:** <sources / trace / test>\n\n**Failure conditions:** <what fails the case>\n\n**Authority rule:** <what requires human review>\n\n**Status:** UNPROVEN\n\n---\n\n## Golden case 3 — <name>\n\n**Starting situation:** <realistic input>\n\n**Expected outcome:** <user-level result>\n\n**Evidence required:** <sources / trace / test>\n\n**Failure conditions:** <what fails the case>\n\n**Authority rule:** <what requires human review>\n\n**Status:** UNPROVEN\n`,
  'verification.md': `<!-- paos:reviewed=${today} -->\n# Verification\n\n## Evidence levels\n\nDECLARED -> STATIC -> AUTOMATED -> E2E -> SHADOW -> PILOT -> PRODUCTION\n\n## Verification checklist\n\n- [ ] Product behaviour matches the spec.\n- [ ] Three golden cases have inspectable evidence.\n- [ ] Trust / authority boundaries fail closed.\n- [ ] Known limitations are visible.\n- [ ] Public claims do not exceed evidence.\n\n## Known gaps\n\n- <Gap>\n\n## Next proof level\n\n<What evidence would materially increase confidence?>\n`,
};

await mkdir(target, { recursive: true });

for (const [name, content] of Object.entries(files)) {
  const path = join(target, name);
  try {
    await access(path);
    console.log(`skip ${path} (already exists)`);
  } catch {
    await writeFile(path, content, 'utf8');
    console.log(`create ${path}`);
  }
}

console.log(`\nProduct Architecture Pack ready at ${target}`);
