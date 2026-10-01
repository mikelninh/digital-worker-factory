import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const plugin = JSON.parse(fs.readFileSync(new URL('plugin/plugin.json', root), 'utf8'));
const mcp = JSON.parse(fs.readFileSync(new URL('plugin/mcp.json', root), 'utf8'));
const openai = plugin.extensions?.['com.openai'];
const ui = openai?.interface;
const review = openai?.review;

test('public-submission listing metadata is complete', () => {
  assert.equal(plugin.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.match(plugin.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(ui.displayName && ui.displayName.length <= 30);
  assert.ok(ui.shortDescription && ui.shortDescription.length <= 30);
  assert.ok(ui.longDescription && ui.longDescription.length <= 4000);
  assert.ok(ui.developerName && ui.developerName.length <= 80);
  assert.ok(ui.category);
  for (const key of ['websiteURL','supportURL','privacyPolicyURL','termsOfServiceURL']) {
    assert.match(ui[key], /^https:\/\//, key);
  }
  for (const key of ['logo','composerIcon']) {
    assert.match(ui[key], /^\.\//, key);
    assert.ok(fs.existsSync(new URL(ui[key].slice(2), new URL('plugin/', root))), key);
  }
});

test('initial MCP review cases are complete', () => {
  assert.equal(review.test_cases.positive.length, 5);
  assert.equal(review.test_cases.negative.length, 3);
  for (const c of review.test_cases.positive) {
    assert.ok(c.description && c.prompt && c.tools_triggered && c.expected_behavior);
    assert.equal(c.tools_triggered, 'audit_website');
  }
  for (const c of review.test_cases.negative) assert.ok(c.description && c.prompt);
});

test('portable MCP config declares one HTTPS streamable server', () => {
  assert.equal(mcp.$schema, 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
  const entries = Object.entries(mcp.mcpServers || {});
  assert.equal(entries.length, 1);
  assert.equal(entries[0][1].type, 'streamable-http');
  assert.match(entries[0][1].url, /^https:\/\//);
});
