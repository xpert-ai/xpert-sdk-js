import type { McpTransport } from './transport.js';
import type {
  CreateMcpApiKeyInput,
  CreateMcpPublicationInput,
  McpAuditRequestOptions,
  McpApiKey,
  McpApiKeySecret,
  McpCapabilityBindingInput,
  McpCapabilityCatalogItem,
  McpConnectionInfo,
  McpInvocationAudit,
  McpOAuthPolicy,
  McpOAuthPolicyTestResult,
  McpPagination,
  McpPublication,
  McpPublicationSummary,
  McpPublicationTestResult,
  PatchMcpCapabilityBindingInput,
  McpRequestOptions,
  UpdateMcpPublicationInput,
  UpsertMcpOAuthPolicyInput,
} from './types.js';

function id(value: string) {
  return encodeURIComponent(value);
}

export class McpPublicationsClient {
  constructor(private readonly transport: McpTransport) {}

  create(input: CreateMcpPublicationInput, options?: McpRequestOptions) {
    return this.transport.request<McpPublication>('/mcp-publications', {
      method: 'POST',
      json: input,
      signal: options?.signal,
    });
  }

  list(options?: McpRequestOptions) {
    return this.transport.request<McpPublicationSummary[]>('/mcp-publications', {
      signal: options?.signal,
    });
  }

  get(publicationId: string, options?: McpRequestOptions) {
    return this.transport.request<McpPublication>(`/mcp-publications/${id(publicationId)}`, {
      signal: options?.signal,
    });
  }

  update(publicationId: string, input: UpdateMcpPublicationInput, options?: McpRequestOptions) {
    return this.transport.request<McpPublication>(`/mcp-publications/${id(publicationId)}`, {
      method: 'PATCH',
      json: input,
      signal: options?.signal,
    });
  }

  async remove(publicationId: string, options?: McpRequestOptions) {
    await this.transport.request(`/mcp-publications/${id(publicationId)}`, {
      method: 'DELETE',
      emptyResponse: undefined,
      signal: options?.signal,
    });
  }

  enable(publicationId: string, options?: McpRequestOptions) {
    return this.transport.request<McpPublication>(`/mcp-publications/${id(publicationId)}/enable`, {
      method: 'POST',
      signal: options?.signal,
    });
  }

  disable(publicationId: string, options?: McpRequestOptions) {
    return this.transport.request<McpPublication>(
      `/mcp-publications/${id(publicationId)}/disable`,
      { method: 'POST', signal: options?.signal }
    );
  }

  availableCapabilities(publicationId: string, options?: McpRequestOptions) {
    return this.transport.request<McpCapabilityCatalogItem[]>(
      `/mcp-publications/${id(publicationId)}/available-capabilities`,
      { signal: options?.signal }
    );
  }

  discoverToolsetCapabilities(toolsetId: string, options?: McpRequestOptions) {
    return this.transport.request<McpCapabilityCatalogItem[]>(
      `/mcp-capability-catalog/toolsets/${id(toolsetId)}/discover`,
      { method: 'POST', signal: options?.signal }
    );
  }

  replaceCapabilities(
    publicationId: string,
    input: McpCapabilityBindingInput[],
    options?: McpRequestOptions
  ) {
    return this.transport.request<McpPublicationCapabilityResponse[]>(
      `/mcp-publications/${id(publicationId)}/capabilities`,
      { method: 'PUT', json: input, signal: options?.signal }
    );
  }

  patchCapability(
    publicationId: string,
    capabilityId: string,
    input: PatchMcpCapabilityBindingInput,
    options?: McpRequestOptions
  ) {
    return this.transport.request<McpPublicationCapabilityResponse>(
      `/mcp-publications/${id(publicationId)}/capabilities/${id(capabilityId)}`,
      { method: 'PATCH', json: input, signal: options?.signal }
    );
  }

  createApiKey(publicationId: string, input: CreateMcpApiKeyInput, options?: McpRequestOptions) {
    return this.transport.request<McpApiKeySecret>(
      `/mcp-publications/${id(publicationId)}/api-keys`,
      { method: 'POST', json: input, signal: options?.signal }
    );
  }

  listApiKeys(publicationId: string, options?: McpRequestOptions) {
    return this.transport.request<McpApiKey[]>(`/mcp-publications/${id(publicationId)}/api-keys`, {
      signal: options?.signal,
    });
  }

  revokeApiKey(keyId: string, options?: McpRequestOptions) {
    return this.transport.request<McpApiKey>(`/mcp-api-keys/${id(keyId)}/revoke`, {
      method: 'POST',
      signal: options?.signal,
    });
  }

  rotateApiKey(keyId: string, options?: McpRequestOptions) {
    return this.transport.request<McpApiKeySecret>(`/mcp-api-keys/${id(keyId)}/rotate`, {
      method: 'POST',
      signal: options?.signal,
    });
  }

  getOAuthPolicy(publicationId: string, options?: McpRequestOptions) {
    return this.transport.request<McpOAuthPolicy | null>(
      `/mcp-publications/${id(publicationId)}/oauth-policy`,
      { signal: options?.signal }
    );
  }

  upsertOAuthPolicy(
    publicationId: string,
    input: UpsertMcpOAuthPolicyInput,
    options?: McpRequestOptions
  ) {
    return this.transport.request<McpOAuthPolicy>(
      `/mcp-publications/${id(publicationId)}/oauth-policy`,
      { method: 'PUT', json: input, signal: options?.signal }
    );
  }

  testOAuthPolicy(publicationId: string, options?: McpRequestOptions) {
    return this.transport.request<McpOAuthPolicyTestResult>(
      `/mcp-publications/${id(publicationId)}/oauth-policy/test`,
      { method: 'POST', signal: options?.signal }
    );
  }

  audit(publicationId: string, options: McpAuditRequestOptions = {}) {
    const { skip = 0, take = 10 } = options;
    return this.transport.request<McpPagination<McpInvocationAudit>>(
      `/mcp-publications/${id(publicationId)}/audit`,
      { params: { skip, take }, signal: options.signal }
    );
  }

  test(publicationId: string, options?: McpRequestOptions) {
    return this.transport.request<McpPublicationTestResult>(
      `/mcp-publications/${id(publicationId)}/test`,
      { method: 'POST', signal: options?.signal }
    );
  }

  connectionInfo(publicationId: string, options?: McpRequestOptions) {
    return this.transport.request<McpConnectionInfo>(
      `/mcp-publications/${id(publicationId)}/connection-info`,
      { signal: options?.signal }
    );
  }
}

type McpPublicationCapabilityResponse = import('./types.js').McpPublicationCapability;
