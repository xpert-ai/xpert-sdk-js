/** Native Workbench resources share the SDK transport and its authorization hook. */
import type { XpertWorkspaceFile } from './schema.js';
import type { Socket } from 'socket.io-client';

export type WorkspaceFileScope =
  | { kind: 'assistant'; assistantId: string }
  | { kind: 'conversation'; conversationId: string };
export type WorkspaceFileDocument = XpertWorkspaceFile & { contents?: string };
export type WorkbenchRequestOptions = { signal?: AbortSignal };
export type TerminalEvent =
  | { type: 'connected' }
  | { type: 'disconnected'; message: string }
  | {
      type: 'opened';
      sessionId: string;
      requestId: string;
      provider: string;
      workingDirectory: string;
    }
  | { type: 'output'; sessionId: string; data: string }
  | { type: 'exit'; sessionId: string; exitCode: number | null }
  | { type: 'closed'; sessionId?: string; requestId?: string; reason: string }
  | { type: 'error'; sessionId?: string; requestId?: string; code: string; message: string };
export type TerminalConnection = {
  input(data: string): void;
  resize(cols: number, rows: number): void;
  close(): void;
};
export type TerminalOpenOptions = {
  conversationId: string;
  projectId?: string | null;
  cols: number;
  rows: number;
  onEvent: (event: TerminalEvent) => void;
  signal?: AbortSignal;
};
export interface WorkbenchTransport {
  json<T>(
    path: string,
    options?: RequestInit & { json?: unknown; params?: Record<string, unknown> }
  ): Promise<T>;
  blob(path: string, options?: RequestInit & { params?: Record<string, unknown> }): Promise<Blob>;
  socketAuthentication(): Promise<{
    url: string;
    path: string;
    token: string;
    organizationId?: string;
  }>;
}

function scopePath(scope: WorkspaceFileScope) {
  const id = scope.kind === 'assistant' ? scope.assistantId : scope.conversationId;
  if (!id.trim()) throw new Error('A workspace scope is required.');
  return scope.kind === 'assistant'
    ? `/ai/assistants/${encodeURIComponent(id)}/workspace`
    : `/ai/conversations/${encodeURIComponent(id)}`;
}

export class WorkbenchClient {
  constructor(private readonly transport: WorkbenchTransport) {}
  listFiles(
    scope: WorkspaceFileScope,
    path = '',
    options: WorkbenchRequestOptions = {}
  ): Promise<XpertWorkspaceFile[]> {
    return this.transport.json(`${scopePath(scope)}/files`, { params: { path }, ...options });
  }
  readFile(
    scope: WorkspaceFileScope,
    path: string,
    options: WorkbenchRequestOptions = {}
  ): Promise<WorkspaceFileDocument> {
    return this.transport.json(`${scopePath(scope)}/file`, { params: { path }, ...options });
  }
  saveFile(
    scope: WorkspaceFileScope,
    path: string,
    content: string,
    options: WorkbenchRequestOptions = {}
  ): Promise<WorkspaceFileDocument> {
    return this.transport.json(`${scopePath(scope)}/file`, {
      method: 'PUT',
      json: { path, content },
      ...options,
    });
  }
  uploadFile(
    scope: WorkspaceFileScope,
    path: string,
    file: Blob,
    filename: string,
    options: WorkbenchRequestOptions = {}
  ): Promise<WorkspaceFileDocument> {
    const body = new FormData();
    body.append('file', file, filename);
    body.append('path', path);
    return this.transport.json(`${scopePath(scope)}/file/upload`, {
      method: 'POST',
      body,
      ...options,
    });
  }
  saveBinaryFile(
    scope: WorkspaceFileScope,
    path: string,
    file: Blob,
    options: WorkbenchRequestOptions = {}
  ): Promise<WorkspaceFileDocument> {
    const separator = path.lastIndexOf('/');
    if (scope.kind === 'conversation')
      return this.uploadFile(
        scope,
        path.slice(0, Math.max(0, separator)),
        file,
        path.slice(separator + 1),
        options
      );
    const body = new FormData();
    body.append('file', file, path.slice(separator + 1));
    body.append('path', path);
    return this.transport.json(`${scopePath(scope)}/file/save-binary`, {
      method: 'POST',
      body,
      ...options,
    });
  }
  deleteFile(
    scope: WorkspaceFileScope,
    path: string,
    options: WorkbenchRequestOptions = {}
  ): Promise<void> {
    return this.transport.json(`${scopePath(scope)}/file`, {
      method: 'DELETE',
      params: { path },
      ...options,
    });
  }
  downloadFile(
    scope: WorkspaceFileScope,
    path: string,
    options: WorkbenchRequestOptions = {}
  ): Promise<Blob> {
    return this.transport.blob(`${scopePath(scope)}/file/download`, {
      params: { path },
      ...options,
    });
  }

  /** Read an immutable delivery or review report belonging to this conversation. */
  downloadArtifact(
    conversationId: string,
    resource: { artifactId: string; artifactVersionId: string },
    options: WorkbenchRequestOptions = {}
  ): Promise<Blob> {
    if (![conversationId, resource.artifactId, resource.artifactVersionId].every(id => id.trim()))
      throw new Error('A conversation and an immutable artifact version are required.');
    return this.transport.blob(
      `/ai/conversations/${encodeURIComponent(conversationId)}/artifacts/${encodeURIComponent(resource.artifactId)}/versions/${encodeURIComponent(resource.artifactVersionId)}/content`,
      options
    );
  }

  async connectTerminal(options: TerminalOpenOptions): Promise<TerminalConnection> {
    if (!options.conversationId.trim()) throw new Error('A conversation is required.');
    options.signal?.throwIfAborted();
    const [{ io }, auth] = await Promise.all([
      import('socket.io-client'),
      this.transport.socketAuthentication(),
    ]);
    options.signal?.throwIfAborted();
    const socket: Socket = io(`${auth.url}/sandbox-terminal`, {
      path: auth.path,
      transports: ['websocket'],
      autoConnect: false,
      auth: { token: auth.token, organizationId: auth.organizationId },
    });
    let sessionId: string | null = null;
    let requestId = '';
    let closed = false;
    const send = (event: TerminalEvent) => {
      if (!closed) options.onEvent(event);
    };
    const dimensions = { cols: options.cols, rows: options.rows };
    socket.on('connect', () => {
      sessionId = null;
      requestId = globalThis.crypto.randomUUID();
      send({ type: 'connected' });
      socket.emit('open', {
        ...dimensions,
        conversationId: options.conversationId,
        projectId: options.projectId,
        requestId,
      });
    });
    socket.on('opened', (data: Omit<Extract<TerminalEvent, { type: 'opened' }>, 'type'>) => {
      if (data.requestId !== requestId) return;
      sessionId = data.sessionId;
      send({ ...data, type: 'opened' });
    });
    socket.on('output', (data: { sessionId: string; data: string }) => {
      // The server can emit initial PTY output before acknowledging open.
      if (!sessionId || data.sessionId === sessionId) send({ ...data, type: 'output' });
    });
    socket.on('exit', (data: { sessionId: string; exitCode: number | null }) => {
      if (data.sessionId === sessionId) send({ ...data, type: 'exit' });
    });
    socket.on('closed', (data: Omit<Extract<TerminalEvent, { type: 'closed' }>, 'type'>) => {
      if (data.sessionId === sessionId || data.requestId === requestId) {
        sessionId = null;
        send({ ...data, type: 'closed' });
      }
    });
    socket.on('error', (data: Omit<Extract<TerminalEvent, { type: 'error' }>, 'type'>) => {
      if (data.requestId === requestId || data.sessionId === sessionId)
        send({ ...data, type: 'error' });
    });
    socket.on('exception', (data: { status?: number; message?: string }) => {
      sessionId = null;
      send({
        type: 'error',
        code: String(data.status ?? 'authorization'),
        message: data.message ?? 'Terminal authorization failed.',
      });
      socket.disconnect();
    });
    socket.on('connect_error', (error: Error) =>
      send({ type: 'error', code: 'connection', message: error.message })
    );
    socket.on('disconnect', (reason: string) => {
      sessionId = null;
      send({ type: 'disconnected', message: reason });
    });
    const connection: TerminalConnection = {
      input: (data) => {
        if (!closed && sessionId && socket.connected) socket.emit('input', { sessionId, data });
      },
      resize: (cols, rows) => {
        dimensions.cols = cols;
        dimensions.rows = rows;
        if (!closed && sessionId && socket.connected)
          socket.emit('resize', { sessionId, cols, rows });
      },
      close: () => {
        if (closed) return;
        closed = true;
        if (socket.connected) socket.emit('close', sessionId ? { sessionId } : { requestId });
        socket.removeAllListeners();
        socket.disconnect();
        options.signal?.removeEventListener('abort', connection.close);
      },
    };
    options.signal?.addEventListener('abort', connection.close, { once: true });
    socket.connect();
    return connection;
  }
}
