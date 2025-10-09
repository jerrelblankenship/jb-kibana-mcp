/**
 * Core MCP Server Logic
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { KibanaClient } from './kibana/client.js';
import { KibanaConfig } from './kibana/types.js';
import { registerResources } from './resources/index.js';
import { registerTools } from './tools/index.js';

export interface ServerConfig {
  kibana: KibanaConfig;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export function createMcpServer(config: ServerConfig): Server {
  // Create Kibana client
  const kibanaClient = new KibanaClient(config.kibana);

  // Create MCP server
  const server = new Server(
    {
      name: 'kibana-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // Register resources and tools
  registerResources(server, kibanaClient);
  registerTools(server, kibanaClient);

  // Error handling
  server.onerror = (error) => {
    console.error('[MCP Error]', error);
  };

  // Log server info on initialization
  if (config.logLevel === 'debug' || config.logLevel === 'info') {
    console.error('[MCP Server] Initialized with Kibana URL:', config.kibana.url);
  }

  return server;
}
