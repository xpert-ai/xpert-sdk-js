import type { McpTransport } from './transport.js';
import { rethrowMcpAppSessionError } from './session-error.js';
import type {
  McpAppApprovalResult,
  McpAppHistory,
  McpAppHistoryQuery,
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
      `/ai/mcp-apps/${id(appInstanceId)}/resource`,
      { params: params(query), signal: options?.signal }
    ).catch(rethrowMcpAppSessionError);
  }

  /** Read the saved result under the current message ACL without opening a tool session. */
  getHistory(appInstanceId: string, query: McpAppHistoryQuery, options?: McpRequestOptions) {
    return this.transport.request<McpAppHistory>(
      `/ai/mcp-apps/${id(appInstanceId)}/history`,
      { params: { messageId: query.messageId }, signal: options?.signal }
    ).catch(rethrowMcpAppSessionError);
  }

  /** Explicitly renew interaction authority; this does not rerun the opening tool. */
  resume(appInstanceId: string, query: McpAppHistoryQuery, options?: McpRequestOptions) {
    return this.transport.request<McpAppResourceResponse>(
      `/ai/mcp-apps/${id(appInstanceId)}/resume`,
      { method: 'POST', params: { messageId: query.messageId }, signal: options?.signal }
    ).catch(rethrowMcpAppSessionError);
  }

  rpc<T = unknown>(
    appInstanceId: string,
    request: unknown,
    query?: McpAppReviveQuery,
    options?: McpRequestOptions
  ) {
    return this.transport.request<T>(`/ai/mcp-apps/${id(appInstanceId)}/rpc`, {
      method: 'POST',
      json: request,
      params: params(query),
      signal: options?.signal,
    }).catch(rethrowMcpAppSessionError);
  }

  approve(
    appInstanceId: string,
    approvalId: string,
    query?: McpAppReviveQuery,
    options?: McpRequestOptions
  ) {
    return this.transport.request<McpAppApprovalResult>(
      `/ai/mcp-apps/${id(appInstanceId)}/approvals/${id(approvalId)}/approve`,
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
      `/ai/mcp-apps/${id(appInstanceId)}/approvals/${id(approvalId)}/reject`,
      { method: 'POST', params: params(query), signal: options?.signal }
    );
  }

  async teardown(appInstanceId: string, query?: McpAppReviveQuery, options?: McpRequestOptions) {
    await this.transport.request(`/ai/mcp-apps/${id(appInstanceId)}`, {
      method: 'DELETE',
      params: params(query),
      emptyResponse: undefined,
      signal: options?.signal,
    });
  }
}
