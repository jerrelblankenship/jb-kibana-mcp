# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that enables AI assistants to interact with Kibana dashboards, visualizations, and Elasticsearch data. The server provides a standardized interface for querying Kibana resources and executing searches through the MCP protocol.

**Key Features:**
- MCP server implementation for Kibana integration
- Dual transport support: stdio (local) and HTTP/SSE (containerized)
- Production-ready Docker/Podman containerization
- TypeScript implementation with full type safety
- Authentication via API keys or username/password

## Architecture

```
AI Assistant (Claude)
    ↓ MCP Protocol
MCP Server (This Project)
    ↓ REST API
Kibana
    ↓
Elasticsearch
```

**Core Components:**
- `src/server.ts` - Core MCP server logic shared by both transports
- `src/index.ts` - Stdio transport entry point for local/Claude Desktop usage
- `src/http-server.ts` - HTTP/SSE transport for containerized deployment
- `src/kibana/client.ts` - Kibana REST API client with authentication
- `src/resources/` - MCP resources (read-only data exposure)
- `src/tools/` - MCP tools (executable functions)

**Transport Modes:**
1. **Stdio**: For local Claude Desktop integration, uses process stdin/stdout
2. **HTTP/SSE**: For containerized deployment, exposes HTTP endpoints

## Development Commands

### Setup and Installation
```bash
npm install                    # Install dependencies
cp .env.example .env          # Configure environment
```

### Development
```bash
npm run dev                    # Run stdio server (for Claude Desktop)
npm run dev:http              # Run HTTP server (for testing)
npm run watch                 # Watch mode for TypeScript compilation
```

### Building
```bash
npm run build                 # Compile TypeScript to dist/
```

### Production
```bash
npm start                     # Run stdio server (production)
npm start:http               # Run HTTP server (production)
```

### Docker/Podman
```bash
# Build
docker build -t kibana-mcp .
podman build -t kibana-mcp .

# Run
docker-compose up --build
podman run -p 3000:3000 --env-file .env kibana-mcp

# Development with auto-reload
docker-compose up --build    # Rebuilds on changes
```

## Configuration

### Required Environment Variables
- `KIBANA_URL` - Kibana instance URL (required)
- `KIBANA_API_KEY` - API key for authentication (recommended)
- OR `KIBANA_USERNAME` + `KIBANA_PASSWORD` - Basic auth credentials

### Optional Environment Variables
- `MCP_TRANSPORT` - Transport mode: `http` or `stdio` (default: http in container)
- `HTTP_PORT` - Port for HTTP server (default: 3000)
- `LOG_LEVEL` - Logging level: debug, info, warn, error (default: info)

### Configuration File
See `.env.example` for full configuration template.

## MCP Capabilities

### Resources (Read-Only)
- `kibana://dashboards` - List all dashboards
- `kibana://dashboard/{id}` - Get specific dashboard
- `kibana://visualizations` - List visualizations
- `kibana://data-views` - List data views (index patterns)
- `kibana://saved-searches` - List saved searches

### Tools (Executable)
- `list_dashboards` - List/search dashboards with pagination
- `get_dashboard` - Get dashboard details by ID
- `export_dashboard` - Export dashboard with dependencies
- `list_visualizations` - List visualizations
- `get_visualization` - Get visualization details
- `list_data_views` - List available data views
- `search_logs` - Query Elasticsearch data using query DSL

## Code Structure

### TypeScript Configuration
- Target: ES2022
- Module: ESNext with bundler resolution
- Strict mode enabled
- Source maps and declarations generated
- Output: `dist/` directory

### Important Patterns

**Error Handling:**
All Kibana API calls are wrapped with try-catch and provide user-friendly error messages. The axios interceptor in `kibana/client.ts` handles common HTTP errors (401, 403, 404).

**Authentication:**
Authentication headers are generated in `kibana/auth.ts` based on available credentials. The server validates auth config on startup and fails fast if misconfigured.

**MCP Protocol:**
- Resources are registered via `server.setRequestHandler('resources/list')` and `resources/read`
- Tools are registered via `server.setRequestHandler('tools/list')` and `tools/call`
- Request handlers are defined in `src/resources/index.ts` and `src/tools/index.ts`

### Adding New Capabilities

**To add a new tool:**
1. Add tool definition to `tools/list` handler in `src/tools/index.ts`
2. Add case to `tools/call` switch statement
3. Add corresponding method to `KibanaClient` if needed (in `src/kibana/client.ts`)
4. Define types in `src/kibana/types.ts` if needed

**To add a new resource:**
1. Add resource to `resources/list` handler in `src/resources/index.ts`
2. Add URI handling to `resources/read` handler
3. Implement data fetching using `KibanaClient`

## Testing

### Manual Testing
```bash
# Health check (HTTP mode)
curl http://localhost:3000/health

# Server info
curl http://localhost:3000/info

# Test with MCP Inspector (stdio mode)
npx @modelcontextprotocol/inspector dist/index.js
```

### Integration Testing
```bash
# Start container
docker-compose up -d

# Check logs
docker-compose logs -f kibana-mcp

# Test endpoints
curl http://localhost:3000/health
```

## Security Considerations

- Container runs as non-root user (mcpuser, UID 1000)
- Minimal base image (node:20-slim) to reduce attack surface
- Credentials via environment variables only (never hardcoded)
- Respects Kibana RBAC permissions
- Health checks for container orchestration
- Resource limits in docker-compose.yml

## Common Issues

### "Authentication failed"
- Verify `KIBANA_API_KEY` or username/password are correct
- Test credentials directly against Kibana API
- Check that Kibana URL is accessible

### "Failed to connect to Kibana"
- Verify `KIBANA_URL` is correct and accessible
- Check network connectivity from container
- Ensure Kibana is running and healthy

### TypeScript errors
- Run `npm install` to ensure dependencies are installed
- Check `tsconfig.json` for correct paths
- Verify all imports use `.js` extension (ESM requirement)

## Key Files Reference

- `package.json:8-15` - Build and run scripts
- `src/index.ts:15-22` - Environment variable validation
- `src/kibana/client.ts:22-51` - Kibana API client initialization
- `src/resources/index.ts:10-28` - Resource registration
- `src/tools/index.ts:10-95` - Tool definitions
- `Dockerfile:1-40` - Multi-stage container build
- `docker-compose.yml:1-50` - Container orchestration config

## Dependencies

**Production:**
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `axios` - HTTP client for Kibana API
- `express` - HTTP server for SSE transport
- `dotenv` - Environment configuration
- `zod` - Schema validation

**Development:**
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution for development
- `@types/*` - Type definitions
