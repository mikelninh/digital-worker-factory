# LaunchCheck public front door

This Netlify shell owns the public MCP origin used by ChatGPT and OpenAI review.

- `/mcp` proxies requests to the proven Supabase LaunchCheck MCP runtime.
- `/.well-known/openai-apps-challenge` serves the exact OpenAI verification token from the `OPENAI_APPS_CHALLENGE` Netlify environment variable.

The front door deliberately contains no product logic. The audit engine remains in the versioned Supabase-backed LaunchCheck MCP implementation.
