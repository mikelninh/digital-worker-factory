import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL('./supabase-schema.sql', import.meta.url), 'utf8');
const tables = [
  'hauspilot_organizations',
  'hauspilot_memberships',
  'hauspilot_workers',
  'hauspilot_cases',
  'hauspilot_reviews',
  'hauspilot_actions',
];

test('every exposed HausPilot table explicitly enables RLS and revokes anon', () => {
  for (const table of tables) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`, 'i'));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon;`, 'i'));
  }
});

test('authorization relies on auth.uid and never user-editable user_metadata', () => {
  assert.match(sql, /auth\.uid\(\)/i);
  assert.doesNotMatch(sql, /user_metadata|raw_user_meta_data/i);
});

test('browser worker writes cannot promote beyond copilot', () => {
  const matches = sql.match(/autonomy_level\s*<=\s*2/gi) || [];
  assert.ok(matches.length >= 2, 'insert and update policies must both cap autonomy at level 2');
});

test('customer clients cannot directly write runtime cases or action traces', () => {
  assert.match(sql, /grant select on table public\.hauspilot_cases to authenticated;/i);
  assert.match(sql, /grant select on table public\.hauspilot_actions to authenticated;/i);
  assert.doesNotMatch(sql, /grant[^;]*insert[^;]*hauspilot_cases[^;]*authenticated/i);
  assert.doesNotMatch(sql, /grant[^;]*insert[^;]*hauspilot_actions[^;]*authenticated/i);
});

test('review UPDATE policy carries both USING and WITH CHECK and fixes reviewer identity', () => {
  const start = sql.indexOf('create policy "hauspilot_review_update_self"');
  assert.ok(start >= 0);
  const block = sql.slice(start);
  assert.match(block, /for update[\s\S]*using\s*\(/i);
  assert.match(block, /with check\s*\(/i);
  assert.match(block, /reviewer_user_id\s*=\s*\(select auth\.uid\(\)\)/i);
});

test('tenant-scoped and wake-up indexes exist for production query paths', () => {
  assert.match(sql, /hauspilot_memberships_user_org_idx/i);
  assert.match(sql, /hauspilot_cases_org_status_idx/i);
  assert.match(sql, /hauspilot_cases_wake_idx/i);
});
