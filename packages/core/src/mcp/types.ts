export type McpPublicationStatus = 'draft' | 'active' | 'disabled';
export type McpPublicationReviewStatus = 'current' | 'required';
export type McpAuthMethod = 'api_key' | 'oauth';
export type McpCapabilityType = 'tool' | 'resource' | 'resource_template' | 'prompt' | 'app';
export type McpCapabilityApprovalMode = 'deny' | 'allow' | 'confirm';
export type McpApiKeySubjectType = 'user' | 'service_account';
export type McpToolRisk = 'read' | 'write' | 'dangerous';
export type McpToolSideEffect = 'none' | 'reversible' | 'irreversible';
export type McpToolIdempotency = 'safe' | 'idempotent' | 'non_idempotent';
export type McpRequiredContext =
  | 'tenant'
  | 'organization'
  | 'workspace'
  | 'principal'
  | 'project'
  | 'conversation'
  | 'agent'
  | 'execution'
  | 'store'
  | 'checkpoint';
export type McpCapabilityVisibility = 'model' | 'app';
export type McpJsonValue =
  | null
  | boolean
  | number
  | string
  | McpJsonValue[]
  | { [key: string]: McpJsonValue };
export type McpJsonSchema = { [keyword: string]: McpJsonValue };

export interface McpCapabilityPolicy {
  approvalMode?: McpCapabilityApprovalMode;
  timeoutMs?: number;
  rateLimit?: { requests: number; windowSeconds: number };
}

export interface McpCapabilitySource {
  toolsetId: string;
  pluginName?: string;
  pluginVersion?: string;
  serverName?: string;
  remoteName?: string;
}

export interface McpCapabilityDescriptorBase {
  descriptorVersion: 1;
  capabilityType: McpCapabilityType;
  capabilityKey: string;
  title?: string;
  description?: string;
  providerInstructions?: string;
  source: McpCapabilitySource;
  requiredContext: McpRequiredContext[];
  visibility: McpCapabilityVisibility[];
}

export interface McpToolCapabilityDescriptor extends McpCapabilityDescriptorBase {
  capabilityType: 'tool';
  inputSchema: McpJsonSchema;
  outputSchema?: McpJsonSchema;
  behavior: {
    risk: McpToolRisk;
    sideEffect: McpToolSideEffect;
    idempotency: McpToolIdempotency;
  };
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  appResourceKey?: string;
  taskMode?: 'optional' | 'required';
  taskMaxLifetimeMs?: number;
}

export interface McpResourceCapabilityDescriptor extends McpCapabilityDescriptorBase {
  capabilityType: 'resource';
  uri: string;
  mimeType?: string;
  cacheTtlMs?: number;
}

export interface McpResourceTemplateCapabilityDescriptor extends McpCapabilityDescriptorBase {
  capabilityType: 'resource_template';
  uriTemplate: string;
  mimeType?: string;
  argumentSchema: McpJsonSchema;
  supportsCompletion: boolean;
  cacheTtlMs?: number;
}

export interface McpPromptCapabilityDescriptor extends McpCapabilityDescriptorBase {
  capabilityType: 'prompt';
  name: string;
  argumentSchema: McpJsonSchema;
  supportsCompletion?: boolean;
}

export interface McpAppCapabilityDescriptor extends McpCapabilityDescriptorBase {
  capabilityType: 'app';
  entry: string;
  csp?: {
    connectDomains?: string[];
    resourceDomains?: string[];
  };
  permissions?: {
    clipboardWrite?: boolean;
    camera?: boolean;
    microphone?: boolean;
    geolocation?: boolean;
  };
}

export type McpCapabilityDescriptor =
  | McpToolCapabilityDescriptor
  | McpResourceCapabilityDescriptor
  | McpResourceTemplateCapabilityDescriptor
  | McpPromptCapabilityDescriptor
  | McpAppCapabilityDescriptor;

export interface McpTenantOrganizationScope {
  tenantId?: string;
  organizationId?: string;
}

export interface McpPublicationCapability extends McpTenantOrganizationScope {
  id: string;
  publicationId: string;
  toolsetId: string;
  capabilityType: McpCapabilityType;
  capabilityKey: string;
  publicName: string;
  enabled: boolean;
  policy?: McpCapabilityPolicy | null;
  descriptorHash: string;
  descriptorSnapshot: McpCapabilityDescriptor;
  pluginVersion?: string | null;
}

export interface McpPublication extends McpTenantOrganizationScope {
  id: string;
  name: string;
  slug: string;
  status: McpPublicationStatus;
  authMethods: McpAuthMethod[];
  instructions?: string | null;
  protocolVersion: '2026-07-28';
  reviewStatus: McpPublicationReviewStatus;
  reviewReason?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  capabilities?: McpPublicationCapability[];
  createdAt?: string;
  updatedAt?: string;
}

export interface McpPublicationSummary extends McpPublication {
  capabilityCount: number;
  apiKeyCount: number;
  oauthEnabled: boolean;
  recentInvocationAt?: string | null;
  recentErrorAt?: string | null;
}

export interface McpCapabilityCatalogItem extends McpTenantOrganizationScope {
  id: string;
  toolsetId: string;
  capabilityType: McpCapabilityType;
  capabilityKey: string;
  descriptorHash: string;
  descriptor: McpCapabilityDescriptor;
  enabled: boolean;
}

export interface CreateMcpPublicationInput {
  name: string;
  slug: string;
  authMethods?: McpAuthMethod[];
  instructions?: string | null;
}

export interface UpdateMcpPublicationInput {
  name?: string;
  slug?: string;
  authMethods?: McpAuthMethod[];
  instructions?: string | null;
  status?: McpPublicationStatus;
}

export interface McpCapabilityBindingInput {
  toolsetId: string;
  capabilityType: McpCapabilityType;
  capabilityKey: string;
  publicName: string;
  enabled?: boolean;
  policy?: McpCapabilityPolicy | null;
}

export interface PatchMcpCapabilityBindingInput {
  publicName?: string;
  enabled?: boolean;
  policy?: McpCapabilityPolicy | null;
}

export interface McpApiKey extends McpTenantOrganizationScope {
  id: string;
  publicationId: string;
  name: string;
  keyPrefix: string;
  subjectType: McpApiKeySubjectType;
  subjectId: string;
  scopes: string[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  revokedById?: string | null;
  createdAt?: string;
}

export interface CreateMcpApiKeyInput {
  name: string;
  subjectType?: McpApiKeySubjectType;
  subjectId?: string;
  scopes?: string[];
  expiresAt?: string | Date | null;
}

export interface McpApiKeySecret {
  apiKey: McpApiKey;
  secret: string;
}

export interface McpOAuthSubjectMapping {
  subjectClaim: string;
  emailClaim?: string;
  clientIdClaim?: string;
}

export interface McpOAuthPolicy extends McpTenantOrganizationScope {
  id: string;
  publicationId: string;
  issuer: string;
  audience: string;
  requiredScopes: string[];
  subjectMapping: McpOAuthSubjectMapping;
  introspectionEnabled: boolean;
  introspectionEndpoint?: string | null;
  introspectionClientId?: string | null;
  introspectionClientSecretConfigured: boolean;
  enabled: boolean;
}

export interface UpsertMcpOAuthPolicyInput {
  issuer: string;
  audience: string;
  requiredScopes?: string[];
  subjectMapping?: McpOAuthSubjectMapping;
  introspection?: {
    enabled: boolean;
    endpoint?: string | null;
    clientId?: string | null;
    clientSecret?: string | null;
  };
  enabled?: boolean;
}

export interface McpOAuthPolicyTestResult {
  issuer: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  introspectionEndpoint?: string;
  introspectionEnabled: boolean;
  introspectionClientSecretConfigured: boolean;
  jwksUri: string;
  scopesSupported: string[];
}

export interface McpInvocationAudit extends McpTenantOrganizationScope {
  id: string;
  publicationId: string;
  capabilityId?: string | null;
  toolsetId?: string | null;
  capabilityKey?: string | null;
  publicName?: string | null;
  authMethod: McpAuthMethod;
  subjectType: McpApiKeySubjectType;
  subjectId: string;
  clientName?: string | null;
  requestId: string;
  traceId?: string | null;
  status: 'started' | 'succeeded' | 'failed' | 'denied';
  durationMs?: number | null;
  errorCode?: string | null;
  argumentSummary?: McpJsonValue | null;
  createdAt?: string;
}

export interface McpPagination<T> {
  readonly items: T[];
  readonly total: number;
}

export interface McpAuditRequestOptions extends McpRequestOptions {
  skip?: number;
  take?: number;
}

export interface McpPublicationTestCheck {
  key: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
}

export interface McpPublicationTestResult {
  ready: boolean;
  protocolVersion: '2026-07-28';
  status: McpPublicationStatus;
  reviewStatus: McpPublicationReviewStatus;
  enabledCapabilityCount: number;
  capabilityCounts: Partial<Record<McpCapabilityType, number>>;
  checks: McpPublicationTestCheck[];
}

export interface McpConnectionInfo {
  protocolVersion: '2026-07-28';
  transport: 'streamable-http';
  endpoint: string;
  authorization: 'Bearer';
  serverInstructions?: string | null;
}

export interface McpAppReviveQuery {
  toolsetId?: string;
  serverName?: string;
  toolName?: string;
  toolCallId?: string;
  resourceUri?: string;
  title?: string;
  token?: string;
  messageId?: string;
}

export interface McpAppResourceResponse {
  uri?: string;
  mimeType?: string;
  text?: string;
  blob?: string;
  appInstanceToken?: string;
  resourceUri?: string;
  title?: unknown;
  description?: unknown;
  icon?: unknown;
  csp?: unknown;
  permissions?: unknown;
  domain?: string;
  prefersBorder?: boolean;
  toolInfo?: unknown;
  toolInput?: unknown;
  toolResult?: unknown;
}

export interface McpAppApprovalResult {
  approved: boolean;
  rejected?: boolean;
  approvalId: string;
  expiresAt?: number;
  toolName: string;
  risk: 'write' | 'destructive';
}

export interface McpRequestOptions {
  signal?: AbortSignal;
}
