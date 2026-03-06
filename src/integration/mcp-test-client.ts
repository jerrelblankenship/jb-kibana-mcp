/**
 * Lightweight MCP client for integration testing.
 *
 * Connects to an MCP server over SSE, performs the JSON-RPC handshake,
 * and exposes helpers to call tools / list resources.
 */

import http from 'http';

interface PostResult {
  status: number;
  body: string;
}

export class McpTestClient {
  private baseUrl: string;
  private sessionId: string | null = null;
  private buffer = '';
  private sseRequest: http.ClientRequest | null = null;
  private pendingResponses = new Map<
    number,
    { resolve: (msg: any) => void; reject: (err: Error) => void }
  >();
  private nextId = 1;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Open the SSE connection, perform initialize + initialized handshake.
   */
  async connect(): Promise<void> {
    await this.openSse();
    await this.initialize();
  }

  async disconnect(): Promise<void> {
    this.sseRequest?.destroy();
    this.sseRequest = null;
    this.sessionId = null;
  }

  // ── public helpers ──────────────────────────────────────────────────

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<any> {
    return this.request('tools/call', { name, arguments: args });
  }

  async listTools(): Promise<any> {
    return this.request('tools/list', {});
  }

  async listResources(): Promise<any> {
    return this.request('resources/list', {});
  }

  async readResource(uri: string): Promise<any> {
    return this.request('resources/read', { uri });
  }

  // ── internals ───────────────────────────────────────────────────────

  private openSse(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL('/sse', this.baseUrl);
      const timeout = setTimeout(() => reject(new Error('SSE connection timeout')), 10_000);

      this.sseRequest = http.get(url.href, (res) => {
        res.on('data', (chunk: Buffer) => {
          this.buffer += chunk.toString();
          this.processBuffer();
        });
      });

      this.sseRequest.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      // Wait for the endpoint event that contains the session ID
      const check = setInterval(() => {
        if (this.sessionId) {
          clearInterval(check);
          clearTimeout(timeout);
          resolve();
        }
      }, 50);
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    let eventType: string | null = null;

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();

        if (eventType === 'endpoint') {
          const match = data.match(/sessionId=(.+)/);
          if (match && !this.sessionId) {
            this.sessionId = match[1];
          }
        } else if (eventType === 'message') {
          try {
            const msg = JSON.parse(data);
            if (msg.id != null && this.pendingResponses.has(msg.id)) {
              const pending = this.pendingResponses.get(msg.id)!;
              this.pendingResponses.delete(msg.id);
              pending.resolve(msg);
            }
          } catch {
            // ignore parse errors in stream
          }
        }
        eventType = null;
      }
    }
  }

  private async initialize(): Promise<void> {
    const initResponse = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'integration-test', version: '1.0.0' },
    });

    if (!initResponse.result) {
      throw new Error(`Initialize failed: ${JSON.stringify(initResponse)}`);
    }

    // Send initialized notification (no response expected)
    await this.sendPost({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });
  }

  private request(method: string, params: Record<string, unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timeout = setTimeout(
        () => {
          this.pendingResponses.delete(id);
          reject(new Error(`Request ${method} (id=${id}) timed out`));
        },
        30_000,
      );

      this.pendingResponses.set(id, {
        resolve: (msg) => {
          clearTimeout(timeout);
          resolve(msg);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      this.sendPost({ jsonrpc: '2.0', id, method, params }).catch((err) => {
        clearTimeout(timeout);
        this.pendingResponses.delete(id);
        reject(err);
      });
    });
  }

  private sendPost(body: Record<string, unknown>): Promise<PostResult> {
    return new Promise((resolve, reject) => {
      if (!this.sessionId) {
        return reject(new Error('No session ID – SSE not connected'));
      }

      const url = new URL(`/message?sessionId=${this.sessionId}`, this.baseUrl);
      const payload = JSON.stringify(body);

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (d: Buffer) => (data += d));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
        },
      );

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }
}
