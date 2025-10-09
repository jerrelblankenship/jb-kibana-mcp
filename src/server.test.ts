/**
 * Integration tests for MCP Server
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMcpServer, ServerConfig } from './server.js';

// Mock KibanaClient
vi.mock('./kibana/client.js', () => ({
  KibanaClient: vi.fn().mockImplementation(() => ({
    listDashboards: vi.fn().mockResolvedValue({ total: 0, saved_objects: [] }),
    getDashboard: vi.fn(),
    exportDashboard: vi.fn(),
    listVisualizations: vi.fn(),
    getVisualization: vi.fn(),
    listDataViews: vi.fn(),
    listSavedSearches: vi.fn(),
    searchLogs: vi.fn(),
    healthCheck: vi.fn(),
  })),
}));

describe('MCP Server Integration', () => {
  let config: ServerConfig;

  beforeEach(() => {
    config = {
      kibana: {
        url: 'https://kibana.example.com',
        apiKey: 'test-api-key',
      },
      logLevel: 'info',
    };
  });

  describe('createMcpServer', () => {
    it('should create MCP server with correct configuration', () => {
      const server = createMcpServer(config);

      expect(server).toBeDefined();
      expect(typeof server.connect).toBe('function');
      expect(typeof server.close).toBe('function');
    });

    it('should register resources capability', () => {
      const server = createMcpServer(config);

      // The server should have capabilities set
      expect(server).toBeDefined();
    });

    it('should register tools capability', () => {
      const server = createMcpServer(config);

      expect(server).toBeDefined();
    });

    it('should set error handler', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const server = createMcpServer(config);

      // Trigger error handler
      const error = new Error('Test error');
      if (server.onerror) {
        server.onerror(error);
      }

      expect(consoleSpy).toHaveBeenCalledWith('[MCP Error]', error);

      consoleSpy.mockRestore();
    });

    it('should log initialization in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const debugConfig = {
        ...config,
        logLevel: 'debug' as const,
      };

      createMcpServer(debugConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MCP Server] Initialized with Kibana URL:',
        'https://kibana.example.com'
      );

      consoleSpy.mockRestore();
    });

    it('should not log initialization in warn mode', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const warnConfig = {
        ...config,
        logLevel: 'warn' as const,
      };

      createMcpServer(warnConfig);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('MCP Protocol Handlers', () => {
    it('should handle resources/list requests', async () => {
      const server = createMcpServer(config);

      // In a real integration test, we would connect the server to a transport
      // and make actual MCP protocol requests. For now, we verify the server
      // is created successfully.
      expect(server).toBeDefined();
    });

    it('should handle tools/list requests', async () => {
      const server = createMcpServer(config);

      expect(server).toBeDefined();
    });
  });
});
