#!/usr/bin/env node

/**
 * MCP Server with HTTP/SSE Transport
 * This is for containerized deployment
 */

import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import * as dotenv from 'dotenv';
import { createMcpServer, ServerConfig } from './server.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.KIBANA_URL) {
  console.error('Error: KIBANA_URL environment variable is required');
  process.exit(1);
}

if (
  !process.env.KIBANA_API_KEY &&
  !(process.env.KIBANA_USERNAME && process.env.KIBANA_PASSWORD)
) {
  console.error(
    'Error: Either KIBANA_API_KEY or KIBANA_USERNAME/KIBANA_PASSWORD must be provided'
  );
  process.exit(1);
}

// Server configuration
const PORT = parseInt(process.env.HTTP_PORT || '3000', 10);

// Validate port number
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error('Error: HTTP_PORT must be a valid port number (1-65535)');
  process.exit(1);
}

const config: ServerConfig = {
  kibana: {
    url: process.env.KIBANA_URL,
    apiKey: process.env.KIBANA_API_KEY,
    username: process.env.KIBANA_USERNAME,
    password: process.env.KIBANA_PASSWORD,
  },
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
};

// Create Express app
const app = express();
app.use(express.json());

// Store active SSE transports keyed by session ID
const transports = new Map<string, SSEServerTransport>();

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'kibana-mcp-server',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Server info endpoint
app.get('/info', (_req, res) => {
  res.json({
    name: 'kibana-mcp-server',
    version: '0.1.0',
    description: 'Model Context Protocol server for Kibana integration',
    capabilities: ['resources', 'tools'],
    transport: 'sse',
  });
});

// SSE endpoint for MCP communication
app.get('/sse', async (_req, res) => {
  console.log('New SSE connection established');

  // Create a new MCP server instance for this connection
  const mcpServer = createMcpServer(config);
  const transport = new SSEServerTransport('/message', res);

  // Store the transport by session ID so we can route POST messages to it
  transports.set(transport.sessionId, transport);
  console.log(`SSE session created: ${transport.sessionId}`);

  // Handle connection close
  res.on('close', async () => {
    console.log(`SSE connection closed: ${transport.sessionId}`);
    transports.delete(transport.sessionId);
    try {
      await mcpServer.close();
    } catch (error) {
      console.error('Error closing MCP server:', error);
    }
  });

  try {
    await mcpServer.connect(transport);
  } catch (error) {
    console.error('Failed to establish SSE connection:', error);
    transports.delete(transport.sessionId);
    if (!res.headersSent) {
      res.status(500).send('Failed to establish SSE connection');
    }
  }
});

// Message endpoint for client requests - route to the correct SSE transport
app.post('/message', async (req, res) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: 'Missing sessionId query parameter' });
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: 'Session not found. It may have expired.' });
    return;
  }

  try {
    // Pass req.body as parsedBody since express.json() already consumed the stream
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('Error handling message:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to handle message' });
    }
  }
});

// Error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Express error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kibana MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`Connected to Kibana: ${config.kibana.url}`);
  console.log(`SSE endpoint: http://0.0.0.0:${PORT}/sse`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down HTTP server...');

  // Close all active transports
  for (const [sessionId, transport] of transports) {
    try {
      await transport.close();
    } catch (error) {
      console.error(`Error closing transport ${sessionId}:`, error);
    }
  }
  transports.clear();

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
