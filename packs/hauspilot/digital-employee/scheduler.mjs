import { isWakeDue, wakeCase } from './case-state.mjs';

export async function runDueCases({ store, clock = new Date(), onWake = async () => {} } = {}) {
  if (!store?.list || !store?.put) throw new Error('case_store_required');
  const cases = await store.list();
  const due = cases.filter((item) => isWakeDue(item, clock));
  const results = [];
  for (const item of due) {
    const woken = wakeCase(item, { event: 'scheduler', clock });
    await store.put(woken, { expectedVersion: item.version });
    await onWake(woken);
    results.push(woken);
  }
  return results;
}
