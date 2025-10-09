/**
 * Unit tests for Kibana API Client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { KibanaClient } from './client.js';
import { KibanaConfig } from './types.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('KibanaClient', () => {
  let client: KibanaClient;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockPost: ReturnType<typeof vi.fn>;

  const config: KibanaConfig = {
    url: 'https://kibana.example.com',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGet = vi.fn();
    mockPost = vi.fn();

    mockCreate = vi.fn().mockReturnValue({
      get: mockGet,
      post: mockPost,
      interceptors: {
        response: {
          use: vi.fn((success, error) => {
            // Store the error handler for testing
            (mockGet as any).errorHandler = error;
            (mockPost as any).errorHandler = error;
          }),
        },
      },
    });

    mockedAxios.create = mockCreate;

    client = new KibanaClient(config);
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: config.url,
        headers: {
          'kbn-xsrf': 'true',
          'Content-Type': 'application/json',
          Authorization: 'ApiKey test-api-key',
        },
        timeout: 30000,
      });
    });

    it('should throw if config is invalid', () => {
      expect(() => new KibanaClient({ url: '' })).toThrow();
    });
  });

  describe('listDashboards', () => {
    it('should list dashboards without search', async () => {
      const mockResponse = {
        data: {
          total: 2,
          saved_objects: [
            {
              id: 'dash-1',
              attributes: { title: 'Dashboard 1', description: 'Test' },
            },
          ],
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.listDashboards();

      expect(mockGet).toHaveBeenCalledWith('/api/saved_objects/_find', {
        params: {
          type: 'dashboard',
          per_page: 20,
          page: 1,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should list dashboards with search term', async () => {
      const mockResponse = {
        data: {
          total: 1,
          saved_objects: [],
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      await client.listDashboards('security', 2, 50);

      expect(mockGet).toHaveBeenCalledWith('/api/saved_objects/_find', {
        params: {
          type: 'dashboard',
          per_page: 50,
          page: 2,
          search: 'security',
          search_fields: 'title',
        },
      });
    });
  });

  describe('getDashboard', () => {
    it('should get dashboard by ID', async () => {
      const mockResponse = {
        data: {
          id: 'dash-1',
          attributes: { title: 'Dashboard 1' },
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.getDashboard('dash-1');

      expect(mockGet).toHaveBeenCalledWith('/api/saved_objects/dashboard/dash-1');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('exportDashboard', () => {
    it('should export dashboard with dependencies', async () => {
      const ndjsonData = Buffer.from(
        '{"id":"dash-1","type":"dashboard"}\n{"id":"vis-1","type":"visualization"}\n'
      );

      mockPost.mockResolvedValue({
        data: ndjsonData,
      });

      const result = await client.exportDashboard('dash-1', true);

      expect(mockPost).toHaveBeenCalledWith(
        '/api/saved_objects/_export',
        {
          objects: [{ type: 'dashboard', id: 'dash-1' }],
          includeReferencesDeep: true,
        },
        { responseType: 'arraybuffer' }
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'dash-1', type: 'dashboard' });
      expect(result[1]).toEqual({ id: 'vis-1', type: 'visualization' });
    });
  });

  describe('listVisualizations', () => {
    it('should list visualizations', async () => {
      const mockResponse = {
        data: {
          total: 5,
          saved_objects: [],
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.listVisualizations('chart');

      expect(mockGet).toHaveBeenCalledWith('/api/saved_objects/_find', {
        params: {
          type: 'visualization',
          per_page: 20,
          page: 1,
          search: 'chart',
          search_fields: 'title',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getVisualization', () => {
    it('should get visualization by ID', async () => {
      const mockResponse = {
        data: {
          id: 'vis-1',
          attributes: { title: 'Visualization 1' },
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.getVisualization('vis-1');

      expect(mockGet).toHaveBeenCalledWith(
        '/api/saved_objects/visualization/vis-1'
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('listDataViews', () => {
    it('should list data views', async () => {
      const mockResponse = {
        data: {
          total: 3,
          saved_objects: [],
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.listDataViews();

      expect(mockGet).toHaveBeenCalledWith('/api/saved_objects/_find', {
        params: {
          type: 'index-pattern',
          per_page: 100,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getDataView', () => {
    it('should get data view by ID', async () => {
      const mockResponse = {
        data: {
          id: 'dv-1',
          attributes: { title: 'logs-*' },
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.getDataView('dv-1');

      expect(mockGet).toHaveBeenCalledWith(
        '/api/saved_objects/index-pattern/dv-1'
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('listSavedSearches', () => {
    it('should list saved searches', async () => {
      const mockResponse = {
        data: {
          total: 4,
          saved_objects: [],
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.listSavedSearches();

      expect(mockGet).toHaveBeenCalledWith('/api/saved_objects/_find', {
        params: {
          type: 'search',
          per_page: 20,
          page: 1,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('searchLogs', () => {
    it('should search Elasticsearch logs', async () => {
      const mockResponse = {
        data: {
          took: 5,
          hits: {
            total: { value: 100 },
            hits: [{ _id: '1', _source: { message: 'test' } }],
          },
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await client.searchLogs({
        index: 'logs-*',
        body: {
          query: { match_all: {} },
          size: 10,
        },
      });

      expect(mockPost).toHaveBeenCalledWith('/internal/search/es', {
        params: {
          index: 'logs-*',
          body: {
            query: { match_all: {} },
            size: 10,
          },
        },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('healthCheck', () => {
    it('should return true if Kibana is healthy', async () => {
      mockGet.mockResolvedValue({ status: 200 });

      const result = await client.healthCheck();

      expect(mockGet).toHaveBeenCalledWith('/api/status');
      expect(result).toBe(true);
    });

    it('should return false if Kibana is unhealthy', async () => {
      mockGet.mockRejectedValue(new Error('Connection failed'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle 401 authentication errors', async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
        message: 'Request failed',
      });

      await expect(client.getDashboard('test')).rejects.toThrow();
    });

    it('should handle 403 permission errors', async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Access denied' },
        },
        message: 'Request failed',
      });

      await expect(client.getDashboard('test')).rejects.toThrow();
    });

    it('should handle 404 not found errors', async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
        message: 'Request failed',
      });

      await expect(client.getDashboard('test')).rejects.toThrow();
    });

    it('should handle connection errors', async () => {
      mockGet.mockRejectedValue({
        request: {},
        message: 'Network error',
      });

      await expect(client.getDashboard('test')).rejects.toThrow();
    });
  });
});
