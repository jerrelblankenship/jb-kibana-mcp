# Kibana MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with Kibana dashboards, visualizations, and Elasticsearch data through a standardized interface.

## Features

- **Resources**: Read-only access to Kibana dashboards, visualizations, data views, and saved searches
- **Tools**: Execute searches, export dashboards, and query Elasticsearch data
- **Dual Transport**: Supports both stdio (local) and HTTP/SSE (containerized) transports
- **Docker Support**: Production-ready containerization with Docker and Podman
- **Authentication**: API key and username/password authentication
- **Type-Safe**: Built with TypeScript for enhanced reliability

## Architecture

```
┌─────────────────┐
│   AI Assistant  │
│  (Claude, etc.) │
└────────┬────────┘
         │ MCP Protocol
         │
┌────────▼────────┐      ┌─────────────┐
│   MCP Server    │─────▶│   Kibana    │
│  (This Server)  │      │   REST API  │
└─────────────────┘      └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │Elasticsearch│
                         └─────────────┘
```

## Quick Start

### Using Docker/Podman (Recommended)

1. **Clone and configure**:
   ```bash
   git clone <repository-url>
   cd kibana-mcp-poc
   cp .env.example .env
   # Edit .env with your Kibana credentials
   ```

2. **Run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

3. **Or with Podman**:
   ```bash
   podman build -t kibana-mcp .
   podman run -p 3000:3000 --env-file .env kibana-mcp
   ```

4. **Verify it's running**:
   ```bash
   curl http://localhost:3000/health
   ```

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Kibana credentials
   ```

3. **Run in development mode**:
   ```bash
   # Stdio mode (for Claude Desktop)
   npm run dev

   # HTTP mode (for testing)
   npm run dev:http
   ```

4. **Build and run production**:
   ```bash
   npm run build
   npm start        # stdio mode
   npm start:http   # HTTP mode
   ```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Kibana Configuration (required)
KIBANA_URL=https://your-kibana-instance.com
KIBANA_API_KEY=your_api_key_here

# Alternative: Username/Password Authentication
# KIBANA_USERNAME=your_username
# KIBANA_PASSWORD=your_password

# Server Configuration
MCP_TRANSPORT=http           # or stdio
HTTP_PORT=3000               # Port for HTTP server
LOG_LEVEL=info               # debug, info, warn, error
```

### Authentication Methods

**API Key (Recommended)**:
```bash
KIBANA_URL=https://kibana.example.com
KIBANA_API_KEY=your_base64_encoded_api_key
```

**Username/Password**:
```bash
KIBANA_URL=https://kibana.example.com
KIBANA_USERNAME=admin
KIBANA_PASSWORD=your_password
```

## MCP Capabilities

### Resources (Read-Only Data)

- `kibana://dashboards` - List all dashboards
- `kibana://dashboard/{id}` - Get specific dashboard
- `kibana://visualizations` - List all visualizations
- `kibana://data-views` - List all data views
- `kibana://saved-searches` - List saved searches

### Tools (Executable Functions)

#### `list_dashboards`
List dashboards with optional search and pagination.

```json
{
  "search": "security",
  "page": 1,
  "perPage": 20
}
```

#### `get_dashboard`
Get detailed information about a specific dashboard.

```json
{
  "id": "dashboard-id-here"
}
```

#### `export_dashboard`
Export dashboard with all dependencies.

```json
{
  "id": "dashboard-id-here",
  "includeReferences": true
}
```

#### `search_logs`
Query Elasticsearch data through Kibana.

```json
{
  "index": "logs-*",
  "query": {
    "match": {
      "message": "error"
    }
  },
  "size": 10,
  "sort": [{"@timestamp": "desc"}]
}
```

#### Other Tools
- `list_visualizations` - List visualizations
- `get_visualization` - Get visualization details
- `list_data_views` - List available data views

## Connecting to AI Assistants

### Claude Code

Claude Code connects to MCP servers running over HTTP/SSE. You have two options:

#### Option 1: Using Docker (Recommended)

1. **Start the server**:
   ```bash
   docker-compose up -d
   ```

2. **Add to Claude Code settings** (`~/.config/claude-code/settings.json` on Linux/macOS or `%APPDATA%\claude-code\settings.json` on Windows):
   ```json
   {
     "mcpServers": {
       "kibana": {
         "url": "http://localhost:3000"
       }
     }
   }
   ```

3. **Restart Claude Code** to load the new MCP server.

#### Option 2: Direct Configuration with Environment Variables

```json
{
  "mcpServers": {
    "kibana": {
      "url": "http://localhost:3000",
      "env": {
        "KIBANA_URL": "https://your-kibana.com",
        "KIBANA_API_KEY": "your-api-key",
        "MCP_TRANSPORT": "http",
        "HTTP_PORT": "3000"
      }
    }
  }
}
```

Then start the server manually:
```bash
npm run start:http
```

**Verification**: In Claude Code, type `/mcp` to see available servers. You should see "kibana" in the list with resources and tools.

### Amazon Q Developer

Amazon Q Developer also supports MCP servers via HTTP/SSE transport.

#### Setup with Docker

1. **Start the Kibana MCP server**:
   ```bash
   docker run -d \
     --name kibana-mcp \
     -p 3000:3000 \
     -e KIBANA_URL=https://your-kibana.com \
     -e KIBANA_API_KEY=your-api-key \
     -e MCP_TRANSPORT=http \
     kibana-mcp:latest
   ```

2. **Configure Amazon Q Developer**:

   Edit your Amazon Q configuration file (location varies by IDE):

   **VS Code** (`settings.json`):
   ```json
   {
     "amazonQ.mcp.servers": {
       "kibana": {
         "url": "http://localhost:3000/sse"
       }
     }
   }
   ```

   **JetBrains IDEs** (Settings → Tools → Amazon Q):
   - Add MCP Server
   - Name: `kibana`
   - URL: `http://localhost:3000/sse`

3. **Restart your IDE** to activate the connection.

#### Alternative: MCP Proxy for stdio

If your tool requires stdio transport, use `mcp-proxy` to bridge:

```bash
# Install mcp-proxy globally
npm install -g @modelcontextprotocol/mcp-proxy

# Start the HTTP server
docker-compose up -d

# Run proxy in stdio mode
mcp-proxy stdio http://localhost:3000/sse
```

Then configure Amazon Q to use the proxy as a stdio command:
```json
{
  "command": "mcp-proxy",
  "args": ["stdio", "http://localhost:3000/sse"]
}
```

### Claude Desktop (stdio mode)

For local Claude Desktop app (not Claude Code), use stdio transport:

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "kibana": {
      "command": "node",
      "args": ["/path/to/kibana-mcp-poc/dist/index.js"],
      "env": {
        "KIBANA_URL": "https://your-kibana.com",
        "KIBANA_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Generic HTTP/SSE Clients

Connect any MCP client to the HTTP server at:
```
http://localhost:3000/sse
```

The server exposes these endpoints:
- `GET /health` - Health check
- `GET /info` - Server information
- `GET /sse` - SSE connection endpoint for MCP protocol

## Docker Deployment

### Build Image

```bash
docker build -t kibana-mcp:latest .
```

### Run Container

```bash
docker run -d \
  --name kibana-mcp \
  -p 3000:3000 \
  -e KIBANA_URL=https://your-kibana.com \
  -e KIBANA_API_KEY=your-api-key \
  kibana-mcp:latest
```

### Docker Compose

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Development

### Project Structure

```
kibana-mcp-poc/
├── src/
│   ├── index.ts              # Stdio entry point
│   ├── http-server.ts        # HTTP/SSE entry point
│   ├── server.ts             # Core MCP server logic
│   ├── kibana/
│   │   ├── client.ts         # Kibana API client
│   │   ├── types.ts          # TypeScript types
│   │   └── auth.ts           # Authentication
│   ├── resources/
│   │   └── index.ts          # MCP resources
│   └── tools/
│       └── index.ts          # MCP tools
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Adding New Tools

1. Define the tool schema in `src/tools/index.ts`
2. Implement the handler in the `tools/call` request handler
3. Add corresponding Kibana client method if needed

### Testing

```bash
# Health check
curl http://localhost:3000/health

# Server info
curl http://localhost:3000/info

# Test with MCP Inspector
npx @modelcontextprotocol/inspector dist/index.js
```

## Security

- **Container Isolation**: Runs as non-root user (mcpuser)
- **Minimal Base Image**: Uses node:20-slim to reduce attack surface
- **Secret Management**: Environment variables for credentials
- **API Authentication**: Supports API keys and basic auth
- **RBAC**: Respects Kibana's role-based access control

## Troubleshooting

### Connection Issues

```bash
# Check if Kibana is accessible
curl -I https://your-kibana.com/api/status

# Verify authentication
curl -H "Authorization: ApiKey YOUR_KEY" \
     -H "kbn-xsrf: true" \
     https://your-kibana.com/api/status
```

### Container Issues

```bash
# View logs
docker logs kibana-mcp-server

# Shell into container
docker exec -it kibana-mcp-server /bin/sh

# Rebuild without cache
docker-compose build --no-cache
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Use TypeScript for all new code
2. Follow existing code style
3. Add tests for new features
4. Update documentation

## License

MIT

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification)
- [Kibana REST API Documentation](https://www.elastic.co/guide/en/kibana/current/api.html)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
