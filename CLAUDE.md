# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server enabling AI assistants to interact with Kibana dashboards, visualizations, and Elasticsearch data. Wraps the Kibana REST API and exposes it via the MCP protocol over two transports: stdio (local) and HTTP/SSE (containerized).

## Development Commands

```bash
npm install                    # Install dependencies
npm run build                  # Compile TypeScript to dist/
npm run dev                    # Run stdio server via tsx
npm run dev:http               # Run HTTP server via tsx
npm run start:http             # Run HTTP server (production, from dist/)
npm run watch                  # TypeScript watch mode

# Testing (vitest)
npm test                       # Run all tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
```

## Architecture

```
AI Assistant → MCP Protocol → MCP Server (this project) → Kibana REST API → Elasticsearch
```

**Two transport entry points share one core server:**
- `src/index.ts` — Stdio transport (local/Claude Desktop). Reads env vars, creates server, connects to stdio.
- `src/http-server.ts` — HTTP/SSE transport (containerized). Express app with `/health`, `/info`, `/sse`, `/message` endpoints. Creates a new MCP server per SSE connection.
- `src/server.ts` — `createMcpServer(config)` factory. Initializes `KibanaClient`, registers MCP resources and tools, returns a `Server` instance.

**Kibana integration layer (`src/kibana/`):**
- `client.ts` — `KibanaClient` class using axios. Methods: `listDashboards`, `getDashboard`, `exportDashboard`, `listVisualizations`, `getVisualization`, `listDataViews`, `listSavedSearches`, `searchLogs`, `healthCheck`. Axios response interceptor handles 401/403/404 errors.
- `auth.ts` — `getAuthHeaders()` (API key preferred over basic auth) and `validateAuthConfig()`. All requests include `kbn-xsrf: true`.
- `types.ts` — TypeScript interfaces for Kibana objects and Elasticsearch search params/responses.

**MCP capability registration:**
- `src/resources/index.ts` — Read-only resources via `kibana://` URIs. Handlers for `resources/list` and `resources/read`.
- `src/tools/index.ts` — 7 executable tools with JSON Schema input definitions. Handlers for `tools/list` and `tools/call`. Pagination enforced at max 100.

## Key Conventions

- **ESM project** — `"type": "module"` in package.json. All imports must use `.js` extensions (e.g., `import { foo } from './bar.js'`), even when importing `.ts` files.
- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- **Module**: ES2022 with `node` moduleResolution. Output to `dist/`.
- **Logging uses stderr** (`console.error`) since stdout is reserved for MCP protocol in stdio mode.

## Testing

Tests use **vitest** with globals enabled (no need to import `describe`/`it`/`expect`).

**Unit tests** (`npm test`): Co-located with source (`src/foo.test.ts` alongside `src/foo.ts`). Config: `vitest.config.ts`. Excludes `src/integration/`.

**Integration tests** (`npm run test:integration`): Live end-to-end tests against a real Kibana instance. Located in `src/integration/`. Config: `vitest.integration.config.ts`. Loads `.env` via dotenv. Skips automatically if `KIBANA_URL` or auth credentials are missing.

**Mocking pattern** (unit tests): `vi.mock()` at module level for external dependencies (axios, MCP SDK). Kibana client methods are mocked in resource/tool tests. HTTP server tests use `supertest` against the Express app.

## Adding New Capabilities

**New tool:**
1. Add tool definition (name + inputSchema) to `tools/list` handler in `src/tools/index.ts`
2. Add case to `tools/call` switch statement in same file
3. Add corresponding method to `KibanaClient` in `src/kibana/client.ts` if needed
4. Add types in `src/kibana/types.ts` if needed

**New resource:**
1. Add resource to `resources/list` handler in `src/resources/index.ts`
2. Add URI handling to `resources/read` handler
3. Implement data fetching via `KibanaClient`

## Environment Variables

Required: `KIBANA_URL` + either `KIBANA_API_KEY` or (`KIBANA_USERNAME` + `KIBANA_PASSWORD`). Optional: `MCP_TRANSPORT` (http/stdio), `HTTP_PORT` (default 3000), `LOG_LEVEL` (default info). See `.env.example`.
