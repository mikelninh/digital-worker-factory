import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const routing = path.resolve(here, '../routing');
const benchmark = JSON.parse(fs.readFileSync(path.join(routing, 'routing-benchmark.json'), 'utf8'));
const template = JSON.parse(fs.readFileSync(path.join(routing, 'routing-results.template.json'), 'utf8'));

test('routing gauntlet has exactly 20 stable cases', () => {
  assert.equal(benchmark.cases.length, 20);
  assert.equal(new Set(benchmark.cases.map(c => c.id)).size, 20);
  assert.equal(benchmark.cases.filter(c => c.should_call).length, 12);
  assert.equal(benchmark.cases.filter(c => !c.should_call).length, 8);
});

test('routing gauntlet covers direct, indirect, follow-up, negative and boundary intents', () => {
  const kinds = new Set(benchmark.cases.map(c => c.kind));
  for (const k of ['direct','indirect','follow_up','negative','boundary']) assert.equal(kinds.has(k), true, k);
});

test('results template stays aligned with the benchmark', () => {
  assert.deepEqual(template.cases.map(c => c.id), benchmark.cases.map(c => c.id));
});

test('positive cases expect audit_website and negative cases expect no tool', () => {
  for (const c of benchmark.cases) {
    if (c.should_call) {
      assert.equal(c.expected_tool, 'audit_website', c.id);
      assert.match(c.expected_url, /^https:\/\//, c.id);
    } else {
      assert.equal(c.expected_tool, null, c.id);
      assert.equal(c.expected_url, null, c.id);
    }
  }
});
