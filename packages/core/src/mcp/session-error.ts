export type McpAppSessionErrorCode =
  | 'MCP_APP_SESSION_EXPIRED'
  | 'MCP_APP_SESSION_UNAVAILABLE';

/** The interaction lease ended; history still requires its own access check. */
export class McpAppSessionError extends Error {
  readonly status = 410;

  constructor(readonly code: McpAppSessionErrorCode, message?: string) {
    super(message ?? 'The MCP App interaction session is no longer available.');
    this.name = 'McpAppSessionError';
  }
}

export function isMcpAppSessionError(error: unknown): error is McpAppSessionError {
  return error instanceof McpAppSessionError;
}

/** Narrow only recognized server codes. Access denials and other failures retain their identity. */
export function rethrowMcpAppSessionError(error: unknown): never {
  if (typeof error === 'object' && error !== null &&
    'status' in error && error.status === 410 &&
    'text' in error && typeof error.text === 'string') {
    let body: unknown;
    try { body = JSON.parse(error.text); } catch { throw error; }
    if (typeof body === 'object' && body !== null && 'code' in body &&
      (body.code === 'MCP_APP_SESSION_EXPIRED' || body.code === 'MCP_APP_SESSION_UNAVAILABLE')) {
      const message = 'message' in body && typeof body.message === 'string' ? body.message : undefined;
      throw new McpAppSessionError(body.code, message);
    }
  }
  throw error;
}
