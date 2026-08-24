export interface McpTransportRequestOptions extends RequestInit {
  json?: unknown;
  params?: Record<string, unknown>;
  emptyResponse?: unknown;
  timeoutMs?: number | null;
  signal?: AbortSignal;
}

export interface McpTransport {
  request<T>(path: string, options?: McpTransportRequestOptions): Promise<T>;
}
