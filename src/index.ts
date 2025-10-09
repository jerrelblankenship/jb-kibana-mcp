#!/usr/bin/env node

/**
 * MCP Server Entry Point (stdio transport)
 * This is for local development and testing with stdio transport
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as dotenv from 'dotenv';
import { createMcpServer, ServerConfig } from './server.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.KIBANA_URL) {
  console.error('Error: KIBANA_URL environment variable is required');
  process.exit(1);
}

if (!process.env.KIBANA_API_KEY && !(process.env.KIBANA_USERNAME && process.env.KIBANA_PASSWORD)) {
  console.error(
    'Error: Either KIBANA_API_KEY or KIBANA_USERNAME/KIBANA_PASSWORD must be provided'
  );
  process.exit(1);
}

// Create server configuration
const config: ServerConfig = {
  kibana: {
    url: process.env.KIBANA_URL,
    apiKey: process.env.KIBANA_API_KEY,
    username: process.env.KIBANA_USERNAME,
    password: process.env.KIBANA_PASSWORD,
  },
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
};

// Create and start server
const server = createMcpServer(config);
const transport = new StdioServerTransport();

server.connect(transport).catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down MCP server...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down MCP server...');
  await server.close();
  process.exit(0);
});
