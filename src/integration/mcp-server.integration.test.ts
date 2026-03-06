/**
 * Integration tests for the Kibana MCP Server.
 *
 * These tests start a real HTTP/SSE MCP server, connect to it with a test
 * client, and exercise every tool and resource against a live Kibana instance.
 *
 * Prerequisites (environment variables):
 *   KIBANA_URL          – e.g. https://kibana-prod.example.com
 *   KIBANA_API_KEY      – OR KIBANA_USERNAME + KIBANA_PASSWORD
 *
 * Run:
 *   npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import http from 'http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer, ServerConfig } from '../server.js';
import { McpTestClient } from './mcp-test-client.js';

// ── env-var gate ────────────────────────────────────────────────────────

const KIBANA_URL = process.env.KIBANA_URL;
const hasAuth =
  process.env.KIBANA_API_KEY ||
  (process.env.KIBANA_USERNAME && process.env.KIBANA_PASSWORD);

const canRun = KIBANA_URL && hasAuth;

// ── server bootstrap ────────────────────────────────────────────────────

let server: http.Server;
let serverPort: number;
let client: McpTestClient;
const transports = new Map<string, SSEServerTransport>();

function startServer(): Promise<number> {
  const config: ServerConfig = {
    kibana: {
      url: KIBANA_URL!,
      apiKey: process.env.KIBANA_API_KEY,
      username: process.env.KIBANA_USERNAME,
      password: process.env.KIBANA_PASSWORD,
    },
    logLevel: 'warn',
  };

  const app = express();
  app.use(express.json());

  app.get('/sse', async (_req, res) => {
    const mcpServer = createMcpServer(config);
    const transport = new SSEServerTransport('/message', res);
    transports.set(transport.sessionId, transport);

    res.on('close', async () => {
      transports.delete(transport.sessionId);
      try { await mcpServer.close(); } catch { /* ignore */ }
    });

    await mcpServer.connect(transport);
  });

  app.post('/message', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    await transport.handlePostMessage(req, res, req.body);
  });

  return new Promise((resolve) => {
    // Port 0 = OS picks an available port
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve(addr.port);
    });
  });
}

// ── test suite ──────────────────────────────────────────────────────────

describe.skipIf(!canRun)('MCP Server Integration', () => {
  beforeAll(async () => {
    serverPort = await startServer();
    client = new McpTestClient(`http://127.0.0.1:${serverPort}`);
    await client.connect();
  }, 15_000);

  afterAll(async () => {
    await client?.disconnect();
    for (const t of transports.values()) {
      try { await t.close(); } catch { /* ignore */ }
    }
    transports.clear();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  });

  // ── tools/list ──────────────────────────────────────────────────────

  it('lists all 7 tools', async () => {
    const resp = await client.listTools();
    const tools: any[] = resp.result.tools;

    expect(tools).toHaveLength(7);

    const names = tools.map((t: any) => t.name);
    expect(names).toContain('list_dashboards');
    expect(names).toContain('get_dashboard');
    expect(names).toContain('export_dashboard');
    expect(names).toContain('list_visualizations');
    expect(names).toContain('get_visualization');
    expect(names).toContain('list_data_views');
    expect(names).toContain('search_logs');
  });

  // ── resources/list ──────────────────────────────────────────────────

  it('lists all 4 resources', async () => {
    const resp = await client.listResources();
    const resources: any[] = resp.result.resources;

    expect(resources).toHaveLength(4);

    const uris = resources.map((r: any) => r.uri);
    expect(uris).toContain('kibana://dashboards');
    expect(uris).toContain('kibana://visualizations');
    expect(uris).toContain('kibana://data-views');
    expect(uris).toContain('kibana://saved-searches');
  });

  // ── list_dashboards ─────────────────────────────────────────────────

  describe('list_dashboards', () => {
    it('returns dashboards from Kibana', async () => {
      const resp = await client.callTool('list_dashboards', { perPage: 3 });
      const data = JSON.parse(resp.result.content[0].text);

      expect(data.total).toBeGreaterThan(0);
      expect(data.dashboards.length).toBeGreaterThan(0);
      expect(data.dashboards.length).toBeLessThanOrEqual(3);

      const dash = data.dashboards[0];
      expect(dash).toHaveProperty('id');
      expect(dash).toHaveProperty('title');
    });

    it('supports search filtering', async () => {
      // First list without filter to get a title
      const allResp = await client.callTool('list_dashboards', { perPage: 1 });
      const allData = JSON.parse(allResp.result.content[0].text);
      if (allData.total === 0) return; // nothing to search

      const firstTitle: string = allData.dashboards[0].title;
      const searchTerm = firstTitle.split(' ')[0]; // first word

      const searchResp = await client.callTool('list_dashboards', {
        search: searchTerm,
        perPage: 5,
      });
      const searchData = JSON.parse(searchResp.result.content[0].text);

      // The search should return at least the dashboard we derived the term from
      expect(searchData.total).toBeGreaterThan(0);
    });
  });

  // ── get_dashboard ───────────────────────────────────────────────────

  it('get_dashboard returns a full dashboard by ID', async () => {
    // Grab an ID from the listing
    const listResp = await client.callTool('list_dashboards', { perPage: 1 });
    const listData = JSON.parse(listResp.result.content[0].text);
    if (listData.total === 0) return;

    const dashId = listData.dashboards[0].id;
    const resp = await client.callTool('get_dashboard', { id: dashId });
    const dash = JSON.parse(resp.result.content[0].text);

    expect(dash.id).toBe(dashId);
    expect(dash.attributes).toHaveProperty('title');
  });

  // ── export_dashboard ────────────────────────────────────────────────

  it('export_dashboard returns NDJSON objects', async () => {
    const listResp = await client.callTool('list_dashboards', { perPage: 1 });
    const listData = JSON.parse(listResp.result.content[0].text);
    if (listData.total === 0) return;

    const dashId = listData.dashboards[0].id;
    const resp = await client.callTool('export_dashboard', { id: dashId });
    const exported = JSON.parse(resp.result.content[0].text);

    expect(Array.isArray(exported)).toBe(true);
    expect(exported.length).toBeGreaterThan(0);
  }, 15_000);

  // ── list_visualizations ─────────────────────────────────────────────

  it('list_visualizations returns visualizations', async () => {
    const resp = await client.callTool('list_visualizations', { perPage: 3 });
    const data = JSON.parse(resp.result.content[0].text);

    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('visualizations');
    // Kibana may have 0 old-style visualizations in newer setups
    expect(data.total).toBeGreaterThanOrEqual(0);
  });

  // ── get_visualization (conditional) ─────────────────────────────────

  it('get_visualization returns a visualization by ID', async () => {
    const listResp = await client.callTool('list_visualizations', { perPage: 1 });
    const listData = JSON.parse(listResp.result.content[0].text);
    if (listData.total === 0) return; // skip if none exist

    const visId = listData.visualizations[0].id;
    const resp = await client.callTool('get_visualization', { id: visId });
    const vis = JSON.parse(resp.result.content[0].text);

    expect(vis.id).toBe(visId);
    expect(vis.attributes).toHaveProperty('title');
  });

  // ── list_data_views ─────────────────────────────────────────────────

  it('list_data_views returns data views', async () => {
    const resp = await client.callTool('list_data_views');
    const data = JSON.parse(resp.result.content[0].text);

    expect(data.total).toBeGreaterThan(0);
    expect(data.dataViews.length).toBeGreaterThan(0);

    const dv = data.dataViews[0];
    expect(dv).toHaveProperty('id');
    expect(dv).toHaveProperty('title');
  });

  // ── search_logs ─────────────────────────────────────────────────────

  describe('search_logs', () => {
    // Pick a data view that has a time field so sort tests work
    let indexPattern: string;
    let timeField: string;

    beforeAll(async () => {
      const resp = await client.callTool('list_data_views');
      const data = JSON.parse(resp.result.content[0].text);
      // Prefer a data view that has a time field and a wildcard
      const withTime = data.dataViews.find(
        (dv: any) => dv.timeFieldName && dv.title.includes('*'),
      );
      const fallback = data.dataViews.find((dv: any) => dv.title.includes('*'));
      const chosen = withTime ?? fallback ?? data.dataViews[0];
      indexPattern = chosen?.title ?? 'logs-*';
      timeField = chosen?.timeFieldName ?? '@timestamp';
    });

    it('searches with match_all and returns hits', async () => {
      const resp = await client.callTool('search_logs', {
        index: indexPattern,
        query: { match_all: {} },
        size: 2,
      });

      expect(resp.result.isError).toBeFalsy();
      const data = JSON.parse(resp.result.content[0].text);

      expect(data).toHaveProperty('took');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('hits');

      // total may be { value: N, relation: "eq" } or just a number
      const totalValue =
        typeof data.total === 'number' ? data.total : data.total?.value ?? 0;
      expect(totalValue).toBeGreaterThanOrEqual(0);
      expect(data.hits.length).toBeLessThanOrEqual(2);
    }, 30_000);

    it('respects size limit', async () => {
      const resp = await client.callTool('search_logs', {
        index: indexPattern,
        size: 1,
      });

      expect(resp.result.isError).toBeFalsy();
      const data = JSON.parse(resp.result.content[0].text);
      expect(data.hits.length).toBeLessThanOrEqual(1);
    }, 30_000);

    it('supports sort parameter', async () => {
      const resp = await client.callTool('search_logs', {
        index: indexPattern,
        size: 2,
        sort: [{ [timeField]: 'desc' }],
      });

      expect(resp.result.isError).toBeFalsy();
      const data = JSON.parse(resp.result.content[0].text);
      expect(data.hits.length).toBeLessThanOrEqual(2);
    }, 30_000);
  });

  // ── resources/read ──────────────────────────────────────────────────

  describe('resource reading', () => {
    it('reads kibana://dashboards', async () => {
      const resp = await client.readResource('kibana://dashboards');
      const content = resp.result.contents[0];

      expect(content.uri).toBe('kibana://dashboards');
      expect(content.mimeType).toBe('application/json');

      const data = JSON.parse(content.text);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('dashboards');
    });

    it('reads kibana://data-views', async () => {
      const resp = await client.readResource('kibana://data-views');
      const content = resp.result.contents[0];
      const data = JSON.parse(content.text);

      expect(data.total).toBeGreaterThan(0);
      expect(data.dataViews.length).toBeGreaterThan(0);
    });

    it('reads kibana://dashboard/{id}', async () => {
      const listResp = await client.readResource('kibana://dashboards');
      const listData = JSON.parse(listResp.result.contents[0].text);
      if (listData.total === 0) return;

      const dashId = listData.dashboards[0].id;
      const resp = await client.readResource(`kibana://dashboard/${dashId}`);
      const dash = JSON.parse(resp.result.contents[0].text);

      expect(dash.id).toBe(dashId);
    });
  });

  // ── error cases ─────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns isError for a nonexistent dashboard ID', async () => {
      const resp = await client.callTool('get_dashboard', {
        id: 'nonexistent-dashboard-id-12345',
      });

      expect(resp.result.isError).toBe(true);
      expect(resp.result.content[0].text).toContain('Error');
    });

    it('returns isError for an unknown tool name', async () => {
      const resp = await client.callTool('does_not_exist');

      expect(resp.result.isError).toBe(true);
      expect(resp.result.content[0].text).toContain('Unknown tool');
    });
  });
});
