const PACK_FILES = ['intent.md','product-spec.md','architecture.md','constraints.md','golden-cases.md','verification.md'];

const PROJECTS = [
  { name: 'Digital Worker Factory', repo: 'mikelninh/digital-worker-factory', type: 'Core platform' },
  { name: 'GitLaw Pro', repo: 'mikelninh/gitlaw', type: 'Legal AI' },
  { name: 'CareOS', repo: 'mikelninh/care-os', type: 'Healthcare R&D' },
  { name: 'PrüfPilot', repo: 'mikelninh/pruefpilot', type: 'Document AI' },
  { name: 'TrustReady', repo: 'mikelninh/trustready', type: 'Trust infrastructure' },
  { name: 'Citizen Agents', repo: 'mikelninh/citizen-agents', type: 'Civic intelligence' },
];

async function inspectProject(project) {
  const url = `https://api.github.com/repos/${project.repo}/contents/architecture?ref=main`;
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'product-architect-os' }
    });
    if (!response.ok) {
      return { ...project, pack: { present: 0, total: PACK_FILES.length, missing: [...PACK_FILES], status: 'unavailable' }, source: url };
    }
    const entries = await response.json();
    const names = new Set(Array.isArray(entries) ? entries.map(entry => entry.name) : []);
    const missing = PACK_FILES.filter(name => !names.has(name));
    return {
      ...project,
      pack: {
        present: PACK_FILES.length - missing.length,
        total: PACK_FILES.length,
        missing,
        status: missing.length === 0 ? 'complete' : 'partial'
      },
      source: `https://github.com/${project.repo}/tree/main/architecture`
    };
  } catch (error) {
    return { ...project, pack: { present: 0, total: PACK_FILES.length, missing: [...PACK_FILES], status: 'error' }, source: url, error: error.message };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const projects = await Promise.all(PROJECTS.map(inspectProject));
  const complete = projects.filter(project => project.pack.status === 'complete').length;
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    contract: PACK_FILES,
    summary: { projects: projects.length, complete, incomplete: projects.length - complete },
    projects,
    notes: ['Repository architecture folders are the source of truth for pack completeness.', 'Pack completeness does not imply production readiness or real-world validation.']
  });
};
