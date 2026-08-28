import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

function safeId(value) {
  const id = String(value || '');
  if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error('invalid_case_id');
  return id;
}

export function createJsonCaseStore(rootDir) {
  if (!rootDir) throw new Error('store_root_required');
  const casesDir = path.join(rootDir, 'cases');

  async function ensure() { await mkdir(casesDir, { recursive: true }); }
  function fileFor(caseId) { return path.join(casesDir, `${safeId(caseId)}.json`); }

  return {
    async get(caseId) {
      await ensure();
      try { return JSON.parse(await readFile(fileFor(caseId), 'utf8')); }
      catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
    },
    async put(caseState, { expectedVersion = null } = {}) {
      await ensure();
      if (!caseState?.case_id) throw new Error('case_id_required');
      const current = await this.get(caseState.case_id);
      if (expectedVersion != null && Number(current?.version) !== Number(expectedVersion)) throw new Error('case_version_conflict');
      if (current && Number(caseState.version) < Number(current.version)) throw new Error('case_version_regression');
      const target = fileFor(caseState.case_id);
      const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temp, JSON.stringify(caseState, null, 2), { encoding: 'utf8', mode: 0o600 });
      await rename(temp, target);
      return caseState;
    },
    async list() {
      await ensure();
      const names = (await readdir(casesDir)).filter((name) => name.endsWith('.json')).sort();
      const out = [];
      for (const name of names) out.push(JSON.parse(await readFile(path.join(casesDir, name), 'utf8')));
      return out;
    },
  };
}
