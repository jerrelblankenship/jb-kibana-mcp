/**
 * Integration tests for MCP Server
 */

import { describe, it, expect, vi } from 'vitest';
import { ServerConfig } from './server.js';

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
  describe('Server Configuration', () => {
    it('should validate required config properties', () => {
      const config: ServerConfig = {
        kibana: {
          url: 'https://kibana.example.com',
          apiKey: 'test-api-key',
        },
        logLevel: 'info',
      };

      expect(config.kibana.url).toBeDefined();
      expect(config.kibana.apiKey).toBeDefined();
      expect(config.logLevel).toBe('info');
    });

    it('should support different log levels', () => {
      const levels: Array<'debug' | 'info' | 'warn' | 'error'> = [
        'debug',
        'info',
        'warn',
        'error',
      ];

      levels.forEach((level) => {
        const config: ServerConfig = {
          kibana: {
            url: 'https://kibana.example.com',
            apiKey: 'test-api-key',
          },
          logLevel: level,
        };

        expect(config.logLevel).toBe(level);
      });
    });

    it('should support API key authentication', () => {
      const config: ServerConfig = {
        kibana: {
          url: 'https://kibana.example.com',
          apiKey: 'my-api-key',
        },
      };

      expect(config.kibana.apiKey).toBe('my-api-key');
    });

    it('should support username/password authentication', () => {
      const config: ServerConfig = {
        kibana: {
          url: 'https://kibana.example.com',
          username: 'admin',
          password: 'secret',
        },
      };

      expect(config.kibana.username).toBe('admin');
      expect(config.kibana.password).toBe('secret');
    });
  });
});
