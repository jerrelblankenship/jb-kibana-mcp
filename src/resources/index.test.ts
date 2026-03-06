/**
 * Unit tests for MCP Resources
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerResources } from './index.js';

describe('MCP Resources', () => {
  let mockServer: any;
  let mockKibanaClient: any;
  let resourcesListHandler: any;
  let resourcesReadHandler: any;

  beforeEach(() => {
    mockServer = {
      setRequestHandler: vi.fn((type, handler) => {
        if (type === 'resources/list') {
          resourcesListHandler = handler;
        } else if (type === 'resources/read') {
          resourcesReadHandler = handler;
        }
      }),
    };

    mockKibanaClient = {
      listDashboards: vi.fn(),
      getDashboard: vi.fn(),
      listVisualizations: vi.fn(),
      listDataViews: vi.fn(),
      listSavedSearches: vi.fn(),
    };

    registerResources(mockServer, mockKibanaClient);
  });

  describe('resources/list', () => {
    it('should return list of available resources', async () => {
      const result = await resourcesListHandler();

      expect(result.resources).toHaveLength(4);
      expect(result.resources[0]).toEqual({
        uri: 'kibana://dashboards',
        name: 'Kibana Dashboards',
        description: 'List of all available Kibana dashboards',
        mimeType: 'application/json',
      });
      expect(result.resources[1]).toEqual({
        uri: 'kibana://visualizations',
        name: 'Kibana Visualizations',
        description: 'List of all available Kibana visualizations',
        mimeType: 'application/json',
      });
      expect(result.resources[2]).toEqual({
        uri: 'kibana://data-views',
        name: 'Kibana Data Views',
        description: 'List of all available data views (index patterns)',
        mimeType: 'application/json',
      });
      expect(result.resources[3]).toEqual({
        uri: 'kibana://saved-searches',
        name: 'Kibana Saved Searches',
        description: 'List of all saved searches',
        mimeType: 'application/json',
      });
    });
  });

  describe('resources/read', () => {
    it('should read dashboards resource', async () => {
      const mockDashboards = {
        total: 2,
        saved_objects: [
          {
            id: 'dash-1',
            attributes: { title: 'Dashboard 1', description: 'Test' },
            updated_at: '2025-01-01',
          },
          {
            id: 'dash-2',
            attributes: { title: 'Dashboard 2', description: null },
            updated_at: '2025-01-02',
          },
        ],
      };

      mockKibanaClient.listDashboards.mockResolvedValue(mockDashboards);

      const result = await resourcesReadHandler({
        params: { uri: 'kibana://dashboards' },
      });

      expect(mockKibanaClient.listDashboards).toHaveBeenCalledWith(
        undefined,
        1,
        100
      );
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('kibana://dashboards');
      expect(result.contents[0].mimeType).toBe('application/json');

      const data = JSON.parse(result.contents[0].text);
      expect(data.total).toBe(2);
      expect(data.dashboards).toHaveLength(2);
      expect(data.dashboards[0]).toEqual({
        id: 'dash-1',
        title: 'Dashboard 1',
        description: 'Test',
        updated_at: '2025-01-01',
      });
    });

    it('should read visualizations resource', async () => {
      const mockVisualizations = {
        total: 1,
        saved_objects: [
          {
            id: 'vis-1',
            attributes: { title: 'Visualization 1', description: 'Test vis' },
            updated_at: '2025-01-01',
          },
        ],
      };

      mockKibanaClient.listVisualizations.mockResolvedValue(mockVisualizations);

      const result = await resourcesReadHandler({
        params: { uri: 'kibana://visualizations' },
      });

      expect(mockKibanaClient.listVisualizations).toHaveBeenCalledWith(
        undefined,
        1,
        100
      );
      expect(result.contents[0].uri).toBe('kibana://visualizations');

      const data = JSON.parse(result.contents[0].text);
      expect(data.total).toBe(1);
      expect(data.visualizations).toHaveLength(1);
    });

    it('should read data views resource', async () => {
      const mockDataViews = {
        total: 3,
        saved_objects: [
          {
            id: 'dv-1',
            attributes: { title: 'logs-*', timeFieldName: '@timestamp' },
          },
        ],
      };

      mockKibanaClient.listDataViews.mockResolvedValue(mockDataViews);

      const result = await resourcesReadHandler({
        params: { uri: 'kibana://data-views' },
      });

      expect(mockKibanaClient.listDataViews).toHaveBeenCalled();
      expect(result.contents[0].uri).toBe('kibana://data-views');

      const data = JSON.parse(result.contents[0].text);
      expect(data.total).toBe(3);
      expect(data.dataViews).toHaveLength(1);
      expect(data.dataViews[0].timeFieldName).toBe('@timestamp');
    });

    it('should read saved searches resource', async () => {
      const mockSearches = {
        total: 2,
        saved_objects: [
          {
            id: 'search-1',
            attributes: { title: 'Search 1', description: 'Test search' },
            updated_at: '2025-01-01',
          },
        ],
      };

      mockKibanaClient.listSavedSearches.mockResolvedValue(mockSearches);

      const result = await resourcesReadHandler({
        params: { uri: 'kibana://saved-searches' },
      });

      expect(mockKibanaClient.listSavedSearches).toHaveBeenCalledWith(
        undefined,
        1,
        100
      );
      expect(result.contents[0].uri).toBe('kibana://saved-searches');

      const data = JSON.parse(result.contents[0].text);
      expect(data.total).toBe(2);
      expect(data.searches).toHaveLength(1);
    });

    it('should read specific dashboard by ID', async () => {
      const mockDashboard = {
        id: 'dash-1',
        attributes: { title: 'Dashboard 1' },
      };

      mockKibanaClient.getDashboard.mockResolvedValue(mockDashboard);

      const result = await resourcesReadHandler({
        params: { uri: 'kibana://dashboard/dash-1' },
      });

      expect(mockKibanaClient.getDashboard).toHaveBeenCalledWith('dash-1');
      expect(result.contents[0].uri).toBe('kibana://dashboard/dash-1');

      const data = JSON.parse(result.contents[0].text);
      expect(data.id).toBe('dash-1');
    });

    it('should throw error for unknown resource URI', async () => {
      await expect(
        resourcesReadHandler({
          params: { uri: 'kibana://unknown' },
        })
      ).rejects.toThrow('Unknown resource URI');
    });

    it('should handle Kibana client errors', async () => {
      mockKibanaClient.listDashboards.mockRejectedValue(
        new Error('API error')
      );

      await expect(
        resourcesReadHandler({
          params: { uri: 'kibana://dashboards' },
        })
      ).rejects.toThrow('Failed to read resource: API error');
    });
  });
});
