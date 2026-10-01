import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { auditWebsite, formatAudit } from './launchcheck.mjs';

const TOOL_DESCRIPTION = `Audit a public website, landing page, signup page, or web app URL before launch. Use when the user asks to test, smoke-check, preflight, verify, or find launch blockers such as HTTP failures, broken internal links, missing mobile viewport or metadata, basic accessibility signals, and important security headers. This v0.1 tool performs a bounded static HTTP audit; it does not execute JavaScript, click controls, submit forms, or inspect private/internal URLs. Do not use it to build a website, write marketing copy, perform keyword research, or access authenticated/private environments.`;

const issueSchema = z.object({
  severity: z.enum(['blocker', 'warning']),
  code: z.string(),
  title: z.string(),
  evidence: z.string(),
  recommendation: z.string(),
});

const passSchema = z.object({
  code: z.string(),
  title: z.string(),
  evidence: z.union([z.string(), z.array(z.string())]),
});

const checkedUrlSchema = z.object({
  url: z.string(),
  status: z.number().int().nullable(),
  finalUrl: z.string().nullable(),
  ok: z.boolean(),
  error: z.string().optional(),
});

const redirectSchema = z.object({
  from: z.string(),
  to: z.string(),
  status: z.number().int(),
});

const pageSignalsSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  h1: z.string().nullable(),
  h1Count: z.number().int().min(0),
  imageCount: z.number().int().min(0),
  imagesMissingAlt: z.number().int().min(0),
  formCount: z.number().int().min(0),
  buttonCount: z.number().int().min(0),
  linkCount: z.number().int().min(0),
  canonical: z.string().nullable(),
  viewport: z.string().nullable(),
  robots: z.string().nullable(),
});

const auditOutputSchema = z.object({
  schema: z.literal('launchcheck/audit-v0.1'),
  target: z.string(),
  finalUrl: z.string().optional(),
  status: z.number().int().min(100).max(599).optional(),
  contentType: z.string().optional(),
  score: z.number().min(0).max(100),
  verdict: z.enum(['CLEAR', 'LAUNCH_WITH_CAUTION', 'NEEDS_WORK', 'BLOCKED']),
  blockers: z.array(issueSchema),
  warnings: z.array(issueSchema),
  passes: z.array(passSchema),
  checkedUrls: z.array(checkedUrlSchema),
  redirects: z.array(redirectSchema),
  pageSignals: pageSignalsSchema.optional(),
  limitations: z.array(z.string()),
});

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'LaunchCheck', version: '0.1.0' });
  server.registerTool('audit_website', {
    title: 'Audit a public website before launch',
    description: TOOL_DESCRIPTION,
    inputSchema: z.object({
      url: z.string().min(3).describe('Public HTTP(S) website URL to audit, for example https://example.com.'),
      max_links: z.number().int().min(0).max(12).optional().describe('Maximum same-origin links to sample for HTTP failures. Defaults to 8; maximum 12.'),
    }),
    outputSchema: auditOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
  }, async ({ url, max_links }) => {
    const result = await auditWebsite({ url, maxLinks: max_links ?? 8 });
    return { structuredContent: result, content: [{ type: 'text', text: formatAudit(result) }] };
  });
  return server;
});

Deno.serve((request: Request) => handler.fetch(request));
