import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { auditWebsite, formatAudit } from './launchcheck.mjs';

const TOOL_DESCRIPTION = `Audit a public website, landing page, signup page, or web app URL before launch. Use when the user asks to test, smoke-check, preflight, verify, or find launch blockers such as HTTP failures, broken internal links, missing mobile viewport or metadata, basic accessibility signals, and important security headers. This v0.1 tool performs a bounded static HTTP audit; it does not execute JavaScript, click controls, submit forms, or inspect private/internal URLs. Do not use it to build a website, write marketing copy, perform keyword research, or access authenticated/private environments.`;

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'LaunchCheck', version: '0.1.0' });
  server.registerTool('audit_website', {
    title: 'Audit a public website before launch',
    description: TOOL_DESCRIPTION,
    inputSchema: z.object({
      url: z.string().min(3).describe('Public HTTP(S) website URL to audit, for example https://example.com.'),
      max_links: z.number().int().min(0).max(12).optional().describe('Maximum same-origin links to sample for HTTP failures. Defaults to 8; maximum 12.'),
    }),
    outputSchema: z.object({
      schema: z.string(), target: z.string(), finalUrl: z.string().optional(), status: z.number().optional(),
      contentType: z.string().optional(), score: z.number(), verdict: z.string(),
      blockers: z.array(z.any()), warnings: z.array(z.any()), passes: z.array(z.any()),
      checkedUrls: z.array(z.any()), redirects: z.array(z.any()), pageSignals: z.any().optional(),
      limitations: z.array(z.string()),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
  }, async ({ url, max_links }) => {
    const result = await auditWebsite({ url, maxLinks: max_links ?? 8 });
    return { structuredContent: result, content: [{ type: 'text', text: formatAudit(result) }] };
  });
  return server;
});

Deno.serve((request: Request) => handler.fetch(request));
