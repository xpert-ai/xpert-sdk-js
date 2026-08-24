import type { McpTransport } from './transport.js';
import type {
  McpAppApprovalResult,
  McpAppResourceResponse,
  McpAppReviveQuery,
  McpRequestOptions,
} from './types.js';

function id(value: string) {
  return encodeURIComponent(value);
}

function params(query?: McpAppReviveQuery): Record<string, unknown> | undefined {
  if (!query) return undefined;
  return {
    toolsetId: query.toolsetId,
    serverName: query.serverName,
    toolName: query.toolName,
    toolCallId: query.toolCallId,
    resourceUri: query.resourceUri,
    title: query.title,
    token: query.token,
    messageId: query.messageId,
  };
}

export class McpAppsClient {
  constructor(private readonly transport: McpTransport) {}

  getResource(appInstanceId: string, query?: McpAppReviveQuery, options?: McpRequestOptions) {
    return this.transport.request<McpAppResourceResponse>(
      `/xpert-toolset/mcp-apps/${id(appInstanceId)}/resource`,
      { params: params(query), signal: options?.signal }
    );
  }

  rpc<T = unknown>(
    appInstanceId: string,
    request: unknown,
    query?: McpAppReviveQuery,
    options?: McpRequestOptions
  ) {
    return this.transport.request<T>(`/xpert-toolset/mcp-apps/${id(appInstanceId)}/rpc`, {
      method: 'POST',
      json: request,
      params: params(query),
      signal: options?.signal,
    });
  }

  approve(
    appInstanceId: string,
    approvalId: string,
    query?: McpAppReviveQuery,
    options?: McpRequestOptions
  ) {
    return this.transport.request<McpAppApprovalResult>(
      `/xpert-toolset/mcp-apps/${id(appInstanceId)}/approvals/${id(approvalId)}/approve`,
      { method: 'POST', params: params(query), signal: options?.signal }
    );
  }

  reject(
    appInstanceId: string,
    approvalId: string,
    query?: McpAppReviveQuery,
    options?: McpRequestOptions
  ) {
    return this.transport.request<McpAppApprovalResult>(
      `/xpert-toolset/mcp-apps/${id(appInstanceId)}/approvals/${id(approvalId)}/reject`,
      { method: 'POST', params: params(query), signal: options?.signal }
    );
  }

  async teardown(appInstanceId: string, query?: McpAppReviveQuery, options?: McpRequestOptions) {
    await this.transport.request(`/xpert-toolset/mcp-apps/${id(appInstanceId)}`, {
      method: 'DELETE',
      params: params(query),
      emptyResponse: undefined,
      signal: options?.signal,
    });
  }
}
