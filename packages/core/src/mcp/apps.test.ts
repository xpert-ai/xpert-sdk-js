import { describe, expect, it } from 'vitest';
import { McpAppsClient } from './apps.js';
import type { McpTransport, McpTransportRequestOptions } from './transport.js';

class RecordingTransport implements McpTransport {
  readonly requests: Array<{
    path: string;
    options?: McpTransportRequestOptions;
  }> = [];
  readonly responses: unknown[] = [];

  request<T>(path: string, options?: McpTransportRequestOptions): Promise<T> {
    this.requests.push({ path, options });
    return Promise.resolve(this.responses.shift() as T);
  }
}

const reviveQuery = {
  toolsetId: 'toolset/1',
  serverName: 'documents',
  toolName: 'search',
  toolCallId: 'call/1',
  resourceUri: 'ui://documents/app.html',
  title: 'Documents',
  token: 'runtime-token',
  messageId: 'message/1',
};

describe('McpAppsClient', () => {
  it('routes resource and RPC calls through the authenticated Xpert API client', async () => {
    const transport = new RecordingTransport();
    const client = new McpAppsClient(transport);
    transport.responses.push(
      { uri: reviveQuery.resourceUri, text: '<html></html>' },
      { jsonrpc: '2.0', id: 'rpc-1', result: {} }
    );

    await client.getResource('app/1', reviveQuery);
    await client.rpc('app/1', { jsonrpc: '2.0', id: 'rpc-1', method: 'tools/call' }, reviveQuery);

    expect(transport.requests).toEqual([
      {
        path: '/xpert-toolset/mcp-apps/app%2F1/resource',
        options: { params: reviveQuery, signal: undefined },
      },
      {
        path: '/xpert-toolset/mcp-apps/app%2F1/rpc',
        options: {
          method: 'POST',
          json: { jsonrpc: '2.0', id: 'rpc-1', method: 'tools/call' },
          params: reviveQuery,
          signal: undefined,
        },
      },
    ]);
  });

  it('encodes approval identifiers and tears down the exact App instance', async () => {
    const transport = new RecordingTransport();
    const client = new McpAppsClient(transport);
    transport.responses.push(
      {
        approved: true,
        approvalId: 'approval/1',
        expiresAt: Date.now() + 60_000,
        toolName: 'update_record',
        risk: 'write',
      },
      undefined
    );

    await client.approve('app/1', 'approval/1', reviveQuery);
    await client.teardown('app/1', reviveQuery);

    expect(transport.requests).toEqual([
      {
        path: '/xpert-toolset/mcp-apps/app%2F1/approvals/approval%2F1/approve',
        options: {
          method: 'POST',
          params: reviveQuery,
          signal: undefined,
        },
      },
      {
        path: '/xpert-toolset/mcp-apps/app%2F1',
        options: {
          method: 'DELETE',
          params: reviveQuery,
          emptyResponse: undefined,
          signal: undefined,
        },
      },
    ]);
  });
});
