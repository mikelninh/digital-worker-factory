const DEFAULT_MAX_LINKS = 8;
const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;
const REQUEST_TIMEOUT_MS = 8_000;
const USER_AGENT = 'LaunchCheck/0.1 (+https://github.com/mikelninh/digital-worker-factory)';

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export function normalizeAuditUrl(input) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('A public website URL is required.');
  let candidate = input.trim();
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  let url;
  try { url = new URL(candidate); } catch { throw new Error('The URL is not valid.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http:// and https:// URLs are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
  url.hash = '';
  return url;
}

function ipv4Parts(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p))) return null;
  const nums = parts.map(Number);
  return nums.every(n => n >= 0 && n <= 255) ? nums : null;
}

export function isNonPublicIp(ip) {
  if (!ip) return true;
  const v4 = ipv4Parts(ip);
  if (v4) {
    const [a,b,c] = v4;
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  const s = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (!s.includes(':')) return true;
  if (s === '::' || s === '::1') return true;
  if (s.startsWith('fc') || s.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(s)) return true;
  if (s.startsWith('ff')) return true;
  if (s.startsWith('2001:db8')) return true;
  const mapped = s.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isNonPublicIp(mapped[1]);
  return false;
}

export async function defaultResolveHost(hostname, fetchImpl = fetch) {
  const lower = hostname.toLowerCase();
  const directV4 = ipv4Parts(lower);
  if (directV4 || lower.includes(':')) return [lower];

  const lookup = async (type) => {
    const endpoint = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(lower)}&type=${type}`;
    const response = await fetchImpl(endpoint, {
      headers: { accept: 'application/dns-json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout?.(4000),
    });
    if (!response.ok) return [];
    const json = await response.json();
    return (json.Answer ?? [])
      .filter(a => (type === 'A' ? a.type === 1 : a.type === 28))
      .map(a => String(a.data));
  };

  const [a, aaaa] = await Promise.all([lookup('A'), lookup('AAAA')]);
  return [...new Set([...a, ...aaaa])];
}

export async function assertPublicUrl(input, { resolveHost = defaultResolveHost, fetchImpl = fetch } = {}) {
  const url = input instanceof URL ? input : normalizeAuditUrl(input);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const blockedNames = ['localhost', 'localhost.localdomain'];
  const blockedSuffixes = ['.local', '.internal', '.lan', '.home', '.test', '.invalid', '.localhost'];
  if (blockedNames.includes(hostname) || blockedSuffixes.some(s => hostname.endsWith(s))) {
    throw new Error('Private or local network addresses are not allowed.');
  }

  if (ipv4Parts(hostname) || hostname.includes(':')) {
    if (isNonPublicIp(hostname)) throw new Error('Private, reserved, or local IP addresses are not allowed.');
    return url;
  }

  if (!hostname.includes('.')) throw new Error('Public hostnames must contain a domain suffix.');
  const answers = await resolveHost(hostname, fetchImpl);
  if (!answers.length) throw new Error('The hostname did not resolve to a public IP address.');
  if (answers.some(isNonPublicIp)) throw new Error('The hostname resolves to a private or reserved IP address.');
  return url;
}

async function readBodyLimited(response, maxBytes = MAX_HTML_BYTES) {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw new Error(`Response body is larger than ${Math.round(maxBytes/1_000_000)} MB.`);
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch {}
      throw new Error(`Response body is larger than ${Math.round(maxBytes/1_000_000)} MB.`);
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(all);
}

export async function safeRequest(input, {
  method = 'GET', fetchImpl = fetch, resolveHost = defaultResolveHost,
  timeoutMs = REQUEST_TIMEOUT_MS, maxRedirects = MAX_REDIRECTS, readBody = method !== 'HEAD'
} = {}) {
  let current = normalizeAuditUrl(input instanceof URL ? input.href : input);
  const redirects = [];

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    await assertPublicUrl(current, { resolveHost, fetchImpl });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(current, {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': USER_AGENT,
          'accept': method === 'HEAD' ? '*/*' : 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2',
        },
      });
    } catch (error) {
      throw new Error(error?.name === 'AbortError' ? 'Request timed out.' : `Request failed: ${error?.message ?? error}`);
    } finally { clearTimeout(timer); }

    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`Redirect ${response.status} did not include a Location header.`);
      const next = new URL(location, current);
      await assertPublicUrl(next, { resolveHost, fetchImpl });
      redirects.push({ from: current.href, to: next.href, status: response.status });
      current = next;
      continue;
    }

    const body = readBody ? await readBodyLimited(response) : '';
    return { response, body, finalUrl: current.href, redirects };
  }
  throw new Error(`Too many redirects (>${maxRedirects}).`);
}

function matchOne(html, regex) { return html.match(regex)?.[1]?.trim() ?? null; }
function countMatches(html, regex) { return [...html.matchAll(regex)].length; }
function stripTags(value='') { return value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); }
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:["']([^"']*)["']|([^\\s>]+))`, 'i'));
  return (m?.[1] ?? m?.[2] ?? null)?.trim() ?? null;
}
function hasAttr(tag, name) { return new RegExp(`\\s${name}(?:\\s|=|>|/)`, 'i').test(tag); }

export function inspectHtml(html, baseUrl) {
  const title = stripTags(matchOne(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? '');
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  const lang = attr(htmlTag, 'lang');
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  const links = [...html.matchAll(/<a\b[^>]*>/gi)].map(m => m[0]);
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => stripTags(m[1]));
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).find(t => (attr(t,'rel')||'').toLowerCase().split(/\s+/).includes('canonical'));
  const description = metas.find(t => (attr(t,'name')||'').toLowerCase() === 'description');
  const viewport = metas.find(t => (attr(t,'name')||'').toLowerCase() === 'viewport');
  const robots = metas.find(t => (attr(t,'name')||'').toLowerCase() === 'robots');
  const ogTitle = metas.find(t => (attr(t,'property')||'').toLowerCase() === 'og:title');
  const ogDescription = metas.find(t => (attr(t,'property')||'').toLowerCase() === 'og:description');
  const ogImage = metas.find(t => (attr(t,'property')||'').toLowerCase() === 'og:image');

  const resolvedLinks = [];
  for (const tag of links) {
    const href = attr(tag, 'href');
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try { resolvedLinks.push(new URL(href, baseUrl).href); } catch {}
  }

  return {
    title,
    lang,
    description: description ? attr(description, 'content') : null,
    canonical: canonicalTag ? attr(canonicalTag, 'href') : null,
    viewport: viewport ? attr(viewport, 'content') : null,
    robots: robots ? attr(robots, 'content') : null,
    og: {
      title: ogTitle ? attr(ogTitle, 'content') : null,
      description: ogDescription ? attr(ogDescription, 'content') : null,
      image: ogImage ? attr(ogImage, 'content') : null,
    },
    h1Count: headings.length,
    h1: headings[0] ?? null,
    imageCount: images.length,
    imagesMissingAlt: images.filter(t => !hasAttr(t, 'alt')).length,
    formCount: countMatches(html, /<form\b[^>]*>/gi),
    buttonCount: countMatches(html, /<button\b[^>]*>/gi),
    linkCount: links.length,
    resolvedLinks,
  };
}

function issue(severity, code, title, evidence, recommendation) {
  return { severity, code, title, evidence, recommendation };
}

export async function auditWebsite({ url, maxLinks = DEFAULT_MAX_LINKS }, deps = {}) {
  const max = clamp(Number.isFinite(Number(maxLinks)) ? Number(maxLinks) : DEFAULT_MAX_LINKS, 0, 12);
  let root;
  try {
    root = await safeRequest(url, deps);
  } catch (error) {
    return {
      schema: 'launchcheck/audit-v0.1',
      target: normalizeAuditUrl(url).href,
      score: 0,
      verdict: 'BLOCKED',
      blockers: [issue('blocker','root_unreachable','The page could not be reached safely.', error.message, 'Confirm the public URL is reachable over HTTP(S) and try again.')],
      warnings: [], passes: [], checkedUrls: [], redirects: [],
      limitations: ['Static fetch audit only; JavaScript rendering, clicks, form submission, visual layout, console errors, and network waterfalls are not executed in v0.1.'],
    };
  }

  const { response, body, finalUrl, redirects } = root;
  const contentType = response.headers.get('content-type') || '';
  const blockers = [], warnings = [], passes = [];
  if (response.status >= 400) blockers.push(issue('blocker','root_http_error',`Root page returned HTTP ${response.status}.`, finalUrl, 'Fix the production route or deployment before launch.'));
  else passes.push({ code:'root_reachable', title:`Root page responds with HTTP ${response.status}.`, evidence:finalUrl });
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) blockers.push(issue('blocker','not_html','The target did not return an HTML document.', contentType || 'No Content-Type header', 'Point LaunchCheck at a browser-facing HTML page.'));

  const doc = inspectHtml(body, finalUrl);
  if (!doc.title) warnings.push(issue('warning','missing_title','Missing page title.', finalUrl, 'Add a concise, descriptive <title>.'));
  else if (doc.title.length > 70) warnings.push(issue('warning','long_title','Page title is unusually long.', `${doc.title.length} characters`, 'Keep the title focused and scannable.'));
  else passes.push({ code:'title_present', title:'Page title is present.', evidence:doc.title });

  if (!doc.description) warnings.push(issue('warning','missing_description','Missing meta description.', finalUrl, 'Add a useful meta description for link previews and search snippets.'));
  else passes.push({ code:'description_present', title:'Meta description is present.', evidence:doc.description.slice(0,180) });

  if (!doc.viewport || !/width\s*=\s*device-width/i.test(doc.viewport)) warnings.push(issue('warning','mobile_viewport','Mobile viewport is missing or not device-width.', doc.viewport || 'No viewport meta tag', 'Use width=device-width with an appropriate initial scale.'));
  else passes.push({ code:'mobile_viewport', title:'Mobile viewport is configured.', evidence:doc.viewport });

  if (!doc.lang) warnings.push(issue('warning','missing_lang','HTML language is not declared.', '<html> has no lang attribute', 'Set the page language on the <html lang="…"> element.'));
  else passes.push({ code:'lang_present', title:'Document language is declared.', evidence:doc.lang });

  if (doc.h1Count === 0) warnings.push(issue('warning','missing_h1','No H1 heading was found.', finalUrl, 'Give the page one clear primary heading.'));
  else if (doc.h1Count > 1) warnings.push(issue('warning','multiple_h1',`${doc.h1Count} H1 headings were found.`, doc.h1 || finalUrl, 'Check whether the heading hierarchy reflects one clear page topic.'));
  else passes.push({ code:'single_h1', title:'A single H1 heading is present.', evidence:doc.h1 });

  if (doc.imageCount && doc.imagesMissingAlt) warnings.push(issue('warning','image_alt',`${doc.imagesMissingAlt} of ${doc.imageCount} images have no alt attribute.`, finalUrl, 'Add meaningful alt text, or alt="" for decorative images.'));
  else if (doc.imageCount) passes.push({ code:'image_alt', title:'Every image has an alt attribute.', evidence:`${doc.imageCount} images checked` });

  if (/\bnoindex\b/i.test(doc.robots || '')) warnings.push(issue('warning','noindex','The page asks search engines not to index it.', doc.robots, 'Remove noindex before launch if this page should be discoverable.'));
  if (!doc.canonical) warnings.push(issue('warning','missing_canonical','No canonical URL was found.', finalUrl, 'Add a canonical URL when duplicate or parameterized variants are possible.'));
  if (!doc.og.title || !doc.og.description || !doc.og.image) warnings.push(issue('warning','open_graph','Open Graph metadata is incomplete.', JSON.stringify(doc.og), 'Add og:title, og:description, and og:image for reliable sharing previews.'));

  const hdr = (name) => response.headers.get(name);
  if (new URL(finalUrl).protocol === 'https:' && !hdr('strict-transport-security')) warnings.push(issue('warning','missing_hsts','HSTS header is missing.', finalUrl, 'Consider Strict-Transport-Security after confirming HTTPS-only operation.'));
  else if (hdr('strict-transport-security')) passes.push({ code:'hsts', title:'HSTS is enabled.', evidence:hdr('strict-transport-security') });
  if (!hdr('content-security-policy')) warnings.push(issue('warning','missing_csp','Content-Security-Policy header is missing.', finalUrl, 'Add a CSP tailored to the site rather than a permissive placeholder.'));
  else passes.push({ code:'csp', title:'Content-Security-Policy is present.', evidence:hdr('content-security-policy').slice(0,180) });
  if ((hdr('x-content-type-options')||'').toLowerCase() !== 'nosniff') warnings.push(issue('warning','missing_nosniff','X-Content-Type-Options: nosniff is missing.', hdr('x-content-type-options') || 'Header absent', 'Set X-Content-Type-Options: nosniff.'));

  const origin = new URL(finalUrl).origin;
  const internal = [...new Set(doc.resolvedLinks.filter(href => {
    try { return new URL(href).origin === origin; } catch { return false; }
  }))].filter(href => href !== finalUrl).slice(0, max);
  const checkedUrls = [];
  for (const href of internal) {
    try {
      const result = await safeRequest(href, { ...deps, method:'HEAD', readBody:false, timeoutMs:5000 });
      checkedUrls.push({ url:href, status:result.response.status, finalUrl:result.finalUrl, ok:result.response.status < 400 });
      if (result.response.status >= 400) blockers.push(issue('blocker','broken_internal_link',`Internal link returned HTTP ${result.response.status}.`, href, 'Fix or remove the broken destination before launch.'));
    } catch (error) {
      checkedUrls.push({ url:href, status:null, finalUrl:null, ok:false, error:error.message });
      blockers.push(issue('blocker','broken_internal_link','An internal link could not be reached safely.', `${href}: ${error.message}`, 'Fix or remove the broken destination before launch.'));
    }
  }
  if (internal.length && checkedUrls.every(x => x.ok)) passes.push({ code:'sampled_internal_links', title:`Sampled ${checkedUrls.length} internal links without HTTP errors.`, evidence:checkedUrls.map(x=>x.url) });

  const blockerPenalty = Math.min(70, blockers.length * 22);
  const warningPenalty = Math.min(45, warnings.length * 4);
  const score = clamp(100 - blockerPenalty - warningPenalty, 0, 100);
  const verdict = blockers.length ? 'BLOCKED' : warnings.length >= 6 ? 'NEEDS_WORK' : warnings.length ? 'LAUNCH_WITH_CAUTION' : 'CLEAR';

  return {
    schema:'launchcheck/audit-v0.1',
    target:normalizeAuditUrl(url).href,
    finalUrl,
    status:response.status,
    contentType,
    score,
    verdict,
    blockers,
    warnings,
    passes,
    checkedUrls,
    redirects,
    pageSignals:{
      title:doc.title || null, description:doc.description || null, h1:doc.h1 || null,
      h1Count:doc.h1Count, imageCount:doc.imageCount, imagesMissingAlt:doc.imagesMissingAlt,
      formCount:doc.formCount, buttonCount:doc.buttonCount, linkCount:doc.linkCount,
      canonical:doc.canonical, viewport:doc.viewport, robots:doc.robots,
    },
    limitations:['Static fetch audit only; JavaScript rendering, clicks, form submission, visual layout, console errors, and network waterfalls are not executed in v0.1.'],
  };
}

export function formatAudit(result) {
  const lines = [
    `LaunchCheck: ${result.verdict} — ${result.score}/100`,
    `Target: ${result.finalUrl ?? result.target}`,
    '',
  ];
  if (result.blockers.length) {
    lines.push(`Blockers (${result.blockers.length})`);
    result.blockers.slice(0,8).forEach(x => lines.push(`- ${x.title} Evidence: ${x.evidence}`));
    lines.push('');
  }
  if (result.warnings.length) {
    lines.push(`Warnings (${result.warnings.length})`);
    result.warnings.slice(0,10).forEach(x => lines.push(`- ${x.title} ${x.recommendation}`));
    lines.push('');
  }
  if (result.passes.length) {
    lines.push(`Passed checks (${result.passes.length})`);
    result.passes.slice(0,8).forEach(x => lines.push(`- ${x.title}`));
    lines.push('');
  }
  lines.push(`Limit: ${result.limitations[0]}`);
  return lines.join('\n');
}
