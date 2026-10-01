import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAuditUrl, isNonPublicIp, assertPublicUrl, inspectHtml, auditWebsite } from '../engine/launchcheck.mjs';

const publicDns = async () => ['93.184.216.34'];

function mockFetch(routes) {
  return async (input, init={}) => {
    const url = typeof input === 'string' ? input : input.href;
    const key = `${(init.method || 'GET').toUpperCase()} ${url}`;
    const route = routes[key] ?? routes[url];
    if (!route) throw new Error(`No mock route for ${key}`);
    return new Response(init.method === 'HEAD' ? null : (route.body ?? ''), {
      status:route.status ?? 200,
      headers:route.headers ?? {'content-type':'text/html; charset=utf-8'},
    });
  };
}

test('normalizes bare domains to https', () => {
  assert.equal(normalizeAuditUrl('example.com/path').href, 'https://example.com/path');
});

test('blocks private and reserved IP ranges', () => {
  for (const ip of ['127.0.0.1','10.2.3.4','169.254.1.1','172.16.1.1','192.168.1.1','100.64.0.1','::1','fc00::1','fe80::1','2001:db8::1']) {
    assert.equal(isNonPublicIp(ip), true, ip);
  }
  assert.equal(isNonPublicIp('93.184.216.34'), false);
});

test('blocks local hostnames and DNS answers that resolve privately', async () => {
  await assert.rejects(() => assertPublicUrl('http://localhost'), /Private or local/);
  await assert.rejects(() => assertPublicUrl('https://safe.example', {resolveHost:async()=>['10.0.0.4']}), /private or reserved/i);
});

test('extracts launch signals from HTML', () => {
  const doc = inspectHtml('<!doctype html><html lang="en"><head><title>Hello</title><meta name="description" content="desc"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://example.com"><meta property="og:title" content="Hello"><meta property="og:description" content="D"><meta property="og:image" content="/og.png"></head><body><h1>Launch</h1><img src="x" alt=""><a href="/pricing">Pricing</a></body></html>', 'https://example.com/');
  assert.equal(doc.title, 'Hello');
  assert.equal(doc.h1Count, 1);
  assert.equal(doc.imagesMissingAlt, 0);
  assert.deepEqual(doc.resolvedLinks, ['https://example.com/pricing']);
});

test('audit catches a broken internal link and missing launch basics', async () => {
  const fetchImpl = mockFetch({
    'GET https://example.com/': {body:'<html><head><title>Test</title></head><body><h1>Hi</h1><a href="/dead">Dead</a><img src="x"></body></html>', headers:{'content-type':'text/html'}},
    'HEAD https://example.com/dead': {status:404, headers:{'content-type':'text/html'}},
  });
  const result = await auditWebsite({url:'https://example.com/', maxLinks:5}, {fetchImpl, resolveHost:publicDns});
  assert.equal(result.verdict, 'BLOCKED');
  assert.equal(result.blockers.some(x => x.code === 'broken_internal_link'), true);
  assert.equal(result.warnings.some(x => x.code === 'mobile_viewport'), true);
  assert.equal(result.warnings.some(x => x.code === 'image_alt'), true);
});

test('audit passes a healthy static launch surface', async () => {
  const body='<!doctype html><html lang="en"><head><title>LaunchCheck Demo</title><meta name="description" content="Ready"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://example.com/"><meta property="og:title" content="LaunchCheck Demo"><meta property="og:description" content="Ready"><meta property="og:image" content="https://example.com/og.png"></head><body><h1>Ready</h1><a href="/pricing">Pricing</a><img src="x" alt="Decorative"></body></html>';
  const secureHeaders={'content-type':'text/html','strict-transport-security':'max-age=31536000','content-security-policy':"default-src 'self'",'x-content-type-options':'nosniff'};
  const fetchImpl=mockFetch({
    'GET https://example.com/':{body,headers:secureHeaders},
    'HEAD https://example.com/pricing':{status:200,headers:{'content-type':'text/html'}},
  });
  const result=await auditWebsite({url:'https://example.com/', maxLinks:5},{fetchImpl,resolveHost:publicDns});
  assert.equal(result.blockers.length,0);
  assert.ok(result.score>=90);
});
