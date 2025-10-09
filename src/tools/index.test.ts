/**
 * Unit tests for MCP Tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerTools } from './index.js';
import { KibanaClient } from '../kibana/client.js';

describe('MCP Tools', () => {
  let mockServer: any;
  let mockKibanaClient: any;
  let toolsListHandler: any;
  let toolsCallHandler: any;

  beforeEach(() => {
    mockServer = {
      setRequestHandler: vi.fn((type, handler) => {
        if (type === 'tools/list') {
          toolsListHandler = handler;
        } else if (type === 'tools/call') {
          toolsCallHandler = handler;
        }
      }),
    };

    mockKibanaClient = {
      listDashboards: vi.fn(),
      getDashboard: vi.fn(),
      exportDashboard: vi.fn(),
      listVisualizations: vi.fn(),
      getVisualization: vi.fn(),
      listDataViews: vi.fn(),
      searchLogs: vi.fn(),
    };

    registerTools(mockServer, mockKibanaClient);
  });

  describe('tools/list', () => {
    it('should return list of available tools', async () => {
      const result = await toolsListHandler();

      expect(result.tools).toHaveLength(7);

      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('list_dashboards');
      expect(toolNames).toContain('get_dashboard');
      expect(toolNames).toContain('export_dashboard');
      expect(toolNames).toContain('list_visualizations');
      expect(toolNames).toContain('get_visualization');
      expect(toolNames).toContain('list_data_views');
      expect(toolNames).toContain('search_logs');

      // Check that all tools have required properties
      result.tools.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });
  });

  describe('tools/call - list_dashboards', () => {
    it('should list dashboards without filters', async () => {
      const mockDashboards = {
        total: 10,
        per_page: 20,
        saved_objects: [
          {
            id: 'dash-1',
            attributes: { title: 'Dashboard 1', description: 'Test' },
            updated_at: '2025-01-01',
          },
        ],
      };

      mockKibanaClient.listDashboards.mockResolvedValue(mockDashboards);

      const result = await toolsCallHandler({
        params: {
          name: 'list_dashboards',
          arguments: {},
        },
      });

      expect(mockKibanaClient.listDashboards).toHaveBeenCalledWith(
        undefined,
        1,
        20
      );
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const data = JSON.parse(result.content[0].text);
      expect(data.total).toBe(10);
      expect(data.dashboards).toHaveLength(1);
    });

    it('should list dashboards with search and pagination', async () => {
      const mockDashboards = {
        total: 5,
        per_page: 10,
        saved_objects: [],
      };

      mockKibanaClient.listDashboards.mockResolvedValue(mockDashboards);

      await toolsCallHandler({
        params: {
          name: 'list_dashboards',
          arguments: {
            search: 'security',
            page: 2,
            perPage: 10,
          },
        },
      });

      expect(mockKibanaClient.listDashboards).toHaveBeenCalledWith(
        'security',
        2,
        10
      );
    });

    it('should enforce max perPage limit', async () => {
      mockKibanaClient.listDashboards.mockResolvedValue({
        total: 0,
        saved_objects: [],
      });

      await toolsCallHandler({
        params: {
          name: 'list_dashboards',
          arguments: { perPage: 200 },
        },
      });

      expect(mockKibanaClient.listDashboards).toHaveBeenCalledWith(
        undefined,
        1,
        100
      );
    });
  });

  describe('tools/call - get_dashboard', () => {
    it('should get dashboard by ID', async () => {
      const mockDashboard = {
        id: 'dash-1',
        attributes: { title: 'Dashboard 1' },
      };

      mockKibanaClient.getDashboard.mockResolvedValue(mockDashboard);

      const result = await toolsCallHandler({
        params: {
          name: 'get_dashboard',
          arguments: { id: 'dash-1' },
        },
      });

      expect(mockKibanaClient.getDashboard).toHaveBeenCalledWith('dash-1');

      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('dash-1');
    });
  });

  describe('tools/call - export_dashboard', () => {
    it('should export dashboard with references', async () => {
      const mockExport = [
        { id: 'dash-1', type: 'dashboard' },
        { id: 'vis-1', type: 'visualization' },
      ];

      mockKibanaClient.exportDashboard.mockResolvedValue(mockExport);

      const result = await toolsCallHandler({
        params: {
          name: 'export_dashboard',
          arguments: {
            id: 'dash-1',
            includeReferences: true,
          },
        },
      });

      expect(mockKibanaClient.exportDashboard).toHaveBeenCalledWith(
        'dash-1',
        true
      );

      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveLength(2);
    });
  });

  describe('tools/call - list_visualizations', () => {
    it('should list visualizations', async () => {
      const mockVisualizations = {
        total: 15,
        per_page: 20,
        saved_objects: [],
      };

      mockKibanaClient.listVisualizations.mockResolvedValue(mockVisualizations);

      const result = await toolsCallHandler({
        params: {
          name: 'list_visualizations',
          arguments: { search: 'pie' },
        },
      });

      expect(mockKibanaClient.listVisualizations).toHaveBeenCalledWith(
        'pie',
        1,
        20
      );

      const data = JSON.parse(result.content[0].text);
      expect(data.total).toBe(15);
    });
  });

  describe('tools/call - get_visualization', () => {
    it('should get visualization by ID', async () => {
      const mockVisualization = {
        id: 'vis-1',
        attributes: { title: 'Pie Chart' },
      };

      mockKibanaClient.getVisualization.mockResolvedValue(mockVisualization);

      const result = await toolsCallHandler({
        params: {
          name: 'get_visualization',
          arguments: { id: 'vis-1' },
        },
      });

      expect(mockKibanaClient.getVisualization).toHaveBeenCalledWith('vis-1');

      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('vis-1');
    });
  });

  describe('tools/call - list_data_views', () => {
    it('should list data views', async () => {
      const mockDataViews = {
        total: 5,
        saved_objects: [
          {
            id: 'dv-1',
            attributes: { title: 'logs-*', timeFieldName: '@timestamp' },
          },
        ],
      };

      mockKibanaClient.listDataViews.mockResolvedValue(mockDataViews);

      const result = await toolsCallHandler({
        params: {
          name: 'list_data_views',
          arguments: {},
        },
      });

      expect(mockKibanaClient.listDataViews).toHaveBeenCalled();

      const data = JSON.parse(result.content[0].text);
      expect(data.total).toBe(5);
      expect(data.dataViews).toHaveLength(1);
    });
  });

  describe('tools/call - search_logs', () => {
    it('should search logs with default query', async () => {
      const mockSearchResult = {
        took: 10,
        hits: {
          total: { value: 100 },
          hits: [
            {
              _id: '1',
              _index: 'logs-2025.01.01',
              _score: 1.0,
              _source: { message: 'test log' },
            },
          ],
        },
      };

      mockKibanaClient.searchLogs.mockResolvedValue(mockSearchResult);

      const result = await toolsCallHandler({
        params: {
          name: 'search_logs',
          arguments: {
            index: 'logs-*',
          },
        },
      });

      expect(mockKibanaClient.searchLogs).toHaveBeenCalledWith({
        index: 'logs-*',
        body: {
          query: { match_all: {} },
          size: 10,
          from: 0,
        },
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.took).toBe(10);
      expect(data.hits).toHaveLength(1);
    });

    it('should search logs with custom query and pagination', async () => {
      mockKibanaClient.searchLogs.mockResolvedValue({
        took: 5,
        hits: { total: { value: 0 }, hits: [] },
      });

      await toolsCallHandler({
        params: {
          name: 'search_logs',
          arguments: {
            index: 'logs-*',
            query: { match: { level: 'error' } },
            size: 50,
            from: 20,
            sort: [{ '@timestamp': 'desc' }],
          },
        },
      });

      expect(mockKibanaClient.searchLogs).toHaveBeenCalledWith({
        index: 'logs-*',
        body: {
          query: { match: { level: 'error' } },
          size: 50,
          from: 20,
          sort: [{ '@timestamp': 'desc' }],
        },
      });
    });

    it('should enforce max size limit', async () => {
      mockKibanaClient.searchLogs.mockResolvedValue({
        took: 5,
        hits: { total: { value: 0 }, hits: [] },
      });

      await toolsCallHandler({
        params: {
          name: 'search_logs',
          arguments: {
            index: 'logs-*',
            size: 200,
          },
        },
      });

      const call = mockKibanaClient.searchLogs.mock.calls[0][0];
      expect(call.body.size).toBe(100);
    });
  });

  describe('tools/call - error handling', () => {
    it('should return error for unknown tool', async () => {
      const result = await toolsCallHandler({
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
    });

    it('should handle Kibana client errors', async () => {
      mockKibanaClient.listDashboards.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await toolsCallHandler({
        params: {
          name: 'list_dashboards',
          arguments: {},
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Connection failed');
    });
  });
});
