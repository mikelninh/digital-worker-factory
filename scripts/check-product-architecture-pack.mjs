#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const target = process.argv[2] || 'architecture';
const required = [
  'intent.md',
  'product-spec.md',
  'architecture.md',
  'constraints.md',
  'golden-cases.md',
  'verification.md',
];

const failures = [];
const freshnessPattern = /<!--\s*paos:reviewed=(\d{4}-\d{2}-\d{2})\s*-->/;

for (const name of required) {
  const path = join(target, name);
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    failures.push(`${path}: missing`);
    continue;
  }

  const freshness = text.match(freshnessPattern);
  if (!freshness) failures.push(`${path}: missing paos:reviewed marker`);
  if (text.trim().length < 120) failures.push(`${path}: suspiciously empty`);
}

try {
  const golden = await readFile(join(target, 'golden-cases.md'), 'utf8');
  const matches = golden.match(/^## Golden case [123]\b/gm) || [];
  if (matches.length !== 3) {
    failures.push(`${join(target, 'golden-cases.md')}: expected exactly 3 flagship golden cases, found ${matches.length}`);
  }
} catch {
  // Missing file already reported above.
}

if (failures.length) {
  console.error('Product Architecture Pack check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Product Architecture Pack OK: ${target}`);
