import type { IconDefinition } from "./schema.js";

export type XpertViewHostType =
  | "integration"
  | "knowledgebase"
  | "agent"
  | "project"
  | "sandbox"
  | (string & {});

export type XpertViewSlotMode = "tabs" | "sections" | "widgets" | "sidebar";
export type XpertViewSchemaType =
  | "stats"
  | "table"
  | "list"
  | "detail"
  | "raw_json"
  | "remote_component";
export type XpertRemoteComponentRuntime = "react" | "vue" | "esm";
export type XpertViewValueType =
  | "text"
  | "number"
  | "status"
  | "datetime"
  | "json";
export type XpertViewColumnDataType =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "status"
  | "tag"
  | "avatar"
  | "link";
export type XpertViewActionPlacement = "toolbar" | "row";
export type XpertViewActionType =
  | "invoke"
  | "navigate"
  | "open_detail"
  | "refresh";
export type XpertViewActionTransport = "json" | "file";
export type XpertViewFileAccessPurpose = "preview" | "download";
export type XpertViewHostAccessLevel = "read" | "edit" | "manage";

export const XPERT_VIEW_PROJECT_ID_HEADER = "x-xpert-view-project-id";
export const XPERT_VIEW_CONVERSATION_ID_HEADER = "x-xpert-view-conversation-id";
export type XpertViewSortDirection = "asc" | "desc";
export type XpertViewFilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "in"
  | "gt"
  | "gte"
  | "lt"
  | "lte";
export type XpertViewScalar = string | number | boolean | null;

export interface XpertI18nObject {
  en_US: string;
  zh_Hans?: string;
}

export type XpertViewJsonSchemaValue =
  | string
  | number
  | boolean
  | null
  | XpertViewJsonSchemaValue[]
  | { [key: string]: XpertViewJsonSchemaValue };

export interface XpertViewJsonSchemaNode {
  type?: string | string[];
  title?: XpertI18nObject;
  description?: XpertI18nObject;
  default?: XpertViewJsonSchemaValue;
  enum?: XpertViewJsonSchemaValue[];
  properties?: Record<string, XpertViewJsonSchemaNode>;
  items?: XpertViewJsonSchemaNode | XpertViewJsonSchemaNode[];
  required?: string[];
  additionalProperties?: boolean | XpertViewJsonSchemaNode;
  [key: string]:
    | XpertViewJsonSchemaValue
    | XpertViewJsonSchemaNode
    | XpertViewJsonSchemaNode[]
    | Record<string, XpertViewJsonSchemaNode>
    | XpertI18nObject
    | undefined;
}

export interface XpertViewJsonSchema extends XpertViewJsonSchemaNode {
  type: "object";
  properties: Record<string, XpertViewJsonSchemaNode>;
}

export interface XpertViewHostContext {
  tenantId: string;
  organizationId?: string | null;
  workspaceId?: string | null;
  userId: string;
  hostType: XpertViewHostType;
  hostId: string;
  module?: string;
  route?: string;
  permissions?: string[];
  locale?: string;
  runtimeScope?: XpertViewRuntimeScope;
}

export interface XpertViewHostCapabilities {
  features?: string[];
  featureProviders?: Record<string, XpertViewFeatureProvider[]>;
}

export interface XpertViewRuntimeScopeInput {
  projectId?: string | null;
  conversationId?: string | null;
}

export interface XpertViewFeatureProvider {
  xpertId: string;
  name: string;
}

export interface XpertViewProjectAccess {
  role: "owner" | "manager" | "editor" | "member";
  canRead: boolean;
  canEdit: boolean;
  canManage: boolean;
  canUse: boolean;
}

export interface XpertViewWorkspaceFilesScope {
  catalog: "projects" | "xperts" | "user-xperts";
  scopeId: string;
  projectId?: string | null;
  xpertId?: string | null;
  userId?: string | null;
  isolateByUser?: boolean;
}

export interface XpertViewRuntimeScope {
  projectId: string | null;
  conversationId: string | null;
  dataScopeKey: string;
  project?: { id: string; name: string; status?: string | null } | null;
  projectAccess?: XpertViewProjectAccess | null;
  workspaceFiles: XpertViewWorkspaceFilesScope;
}

export type XpertViewHostState = Record<string, unknown>;

export interface XpertResolvedViewHostContext extends XpertViewHostContext {
  slots: XpertViewSlot[];
  hostSnapshot?: unknown;
  capabilities?: XpertViewHostCapabilities;
  hostState?: XpertViewHostState;
}

export interface XpertViewSlot {
  key: string;
  title?: XpertI18nObject;
  mode: XpertViewSlotMode;
  order?: number;
  manifestPolicy?: {
    requireFeatureActivation?: boolean;
  };
}

export interface XpertViewSource {
  provider: string;
  plugin?: string;
  version?: string;
}

export interface XpertViewBadge {
  type: "count" | "status" | "text";
  value?: string | number;
}

export interface XpertViewPolling {
  enabled: boolean;
  intervalMs?: number;
}

export interface XpertViewActivation {
  requiredFeatures?: string[];
}

export interface XpertWorkbenchViewOptions {
  fixed?: boolean;
  menu?: {
    enabled?: boolean;
    label?: string | XpertI18nObject;
    order?: number;
    icon?: IconDefinition;
  };
}

export interface XpertViewCachePolicy {
  enabled?: boolean;
  ttlMs?: number;
}

export interface XpertViewQuerySchema {
  supportsPagination?: boolean;
  supportsSearch?: boolean;
  supportsSort?: boolean;
  supportsFilter?: boolean;
  supportsCursor?: boolean;
  supportsSelection?: boolean;
  supportsParameters?: boolean;
  defaultPageSize?: number;
}

export interface XpertViewDataSource {
  mode: "platform";
  querySchema?: XpertViewQuerySchema;
  cache?: XpertViewCachePolicy;
  polling?: XpertViewPolling;
}

export interface XpertViewFilter {
  key: string;
  operator?: XpertViewFilterOperator;
  value: XpertViewScalar | XpertViewScalar[];
}

export interface XpertViewQuery {
  page?: number;
  pageSize?: number;
  cursor?: string;
  search?: string;
  sortBy?: string;
  sortDirection?: XpertViewSortDirection;
  filters?: XpertViewFilter[];
  selectionId?: string;
  parameters?: Record<string, XpertViewScalar | XpertViewScalar[]>;
}

export interface XpertStatsViewSchema {
  type: "stats";
  items: Array<{
    key: string;
    label: XpertI18nObject;
    valueType?: XpertViewValueType;
  }>;
}

export interface XpertTableViewSchema {
  type: "table";
  columns: Array<{
    key: string;
    label: XpertI18nObject;
    dataType?: XpertViewColumnDataType;
    width?: string;
    sortable?: boolean;
    searchable?: boolean;
  }>;
  pagination?: {
    enabled: boolean;
    pageSize?: number;
  };
  search?: {
    enabled: boolean;
    placeholder?: XpertI18nObject;
  };
}

export interface XpertListViewSchema {
  type: "list";
  item: {
    titleKey: string;
    subtitleKey?: string;
    descriptionKey?: string;
    metaKeys?: string[];
  };
  pagination?: {
    enabled: boolean;
    pageSize?: number;
  };
  search?: {
    enabled: boolean;
    placeholder?: XpertI18nObject;
  };
}

export interface XpertDetailViewSchema {
  type: "detail";
  fields: Array<{
    key: string;
    label: XpertI18nObject;
    dataType?: XpertViewValueType;
  }>;
}

export interface XpertRawJsonViewSchema {
  type: "raw_json";
}

export interface XpertRemoteComponentViewSchema {
  type: "remote_component";
  runtime: XpertRemoteComponentRuntime;
  protocolVersion: 1;
  component: {
    isolation: "iframe" | "module_federation";
    entry: string;
    module?: string;
    exportName?: string;
    integrity?: string;
    propsSchema?: XpertViewJsonSchema;
  };
  dataSource: {
    mode: "platform";
  };
  actions?: XpertViewActionDefinition[];
}

export interface XpertRemoteComponentEntry {
  html: string;
  contentType?: "text/html; charset=utf-8";
}

export type XpertViewSchema =
  | XpertStatsViewSchema
  | XpertTableViewSchema
  | XpertListViewSchema
  | XpertDetailViewSchema
  | XpertRawJsonViewSchema
  | XpertRemoteComponentViewSchema;

export interface XpertViewParameterDefinition {
  key: string;
  label: XpertI18nObject;
  description?: XpertI18nObject;
  required?: boolean;
  type?: "string" | "number" | "boolean";
  optionSource?: {
    mode: "provider";
    searchable?: boolean;
    preload?: boolean;
    dependsOn?: string[];
  };
}

export interface XpertViewParameterOption {
  value: XpertViewScalar;
  label: string;
  description?: string | null;
  disabled?: boolean;
}

export interface XpertViewParameterOptionsQuery {
  search?: string;
  parameters?: Record<string, XpertViewScalar | XpertViewScalar[]>;
}

export interface XpertViewParameterOptionsResult {
  items: XpertViewParameterOption[];
}

export interface XpertViewActionDefinition {
  key: string;
  label: XpertI18nObject;
  icon?: string;
  placement?: XpertViewActionPlacement;
  actionType: XpertViewActionType;
  transport?: XpertViewActionTransport;
  inputSchema?: XpertViewJsonSchema;
  inputDefaults?: "target" | Record<string, unknown>;
  confirm?: {
    title?: XpertI18nObject;
    message?: XpertI18nObject;
  };
  permissions?: string[];
  requiredHostAccess?: XpertViewHostAccessLevel;
}

export interface XpertViewClientCommandDefinition {
  key: string;
  label?: XpertI18nObject;
  description?: XpertI18nObject;
  permissions?: string[];
}

export interface XpertViewFileAccessDefinition {
  purposes: XpertViewFileAccessPurpose[];
}

export interface XpertViewFileAccessRequest {
  fileKey: string;
  targetId?: string;
  purpose: XpertViewFileAccessPurpose;
}

export interface XpertViewFileAccessSessionResult {
  sessionId: string;
  expiresAt: string;
}

export interface XpertViewFileAccessGrantResult {
  url: string;
  expiresAt: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

export const ASSISTANT_CHAT_SEND_MESSAGE_COMMAND =
  "assistant.chat.send_message";
export const ASSISTANT_CONTEXT_SET_COMMAND = "assistant.context.set";
export const WORKBENCH_FILE_OPEN_COMMAND = "workbench.file.open";
export const WORKBENCH_NAVIGATION_OPEN_COMMAND = "workbench.navigation.open";
export const WORKBENCH_KNOWLEDGEBASE_DOCUMENTS_TARGET =
  "knowledgebase.documents";
export const WORKBENCH_ASSISTANT_CONVERSATION_TARGET = "assistant.conversation";
export const XPERT_REMOTE_COMPONENT_INVOKE_CLIENT_COMMAND_MESSAGE_TYPE =
  "invokeClientCommand";

export interface WorkbenchOpenFileEvidenceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkbenchOpenFileEvidence {
  observationId?: string;
  attributeCode?: string;
  displayValue?: string;
  text?: string;
  method?: string;
  region?: string;
  confidence?: number;
  locator?: {
    sourceType?: string;
    page?: number;
    coordinateSpace?: string;
    recognitionRotation?: number;
    orientationConfidence?: number;
    box?: WorkbenchOpenFileEvidenceBox;
  };
}

export interface WorkbenchOpenFile {
  id?: string;
  fileId?: string;
  fileAssetId?: string;
  storageFileId?: string;
  name: string;
  mimeType?: string;
  size?: number;
  url: string;
  previewUrl?: string;
  evidence?: WorkbenchOpenFileEvidence;
}

export type WorkbenchNavigationOpenTarget =
  | typeof WORKBENCH_KNOWLEDGEBASE_DOCUMENTS_TARGET
  | typeof WORKBENCH_ASSISTANT_CONVERSATION_TARGET;

export interface WorkbenchNavigationOpenPayload {
  target: WorkbenchNavigationOpenTarget;
  knowledgebaseId?: string;
  conversationId?: string;
  threadId?: string;
  executionId?: string;
}

export interface WorkbenchAssistantConversationOpenRequest {
  conversationId: string;
  threadId?: string;
  executionId?: string;
}

export interface XpertRemoteComponentInvokeClientCommandRequest {
  type: typeof XPERT_REMOTE_COMPONENT_INVOKE_CLIENT_COMMAND_MESSAGE_TYPE;
  requestId: string;
  commandKey: string;
  payload?: unknown;
}

export const ASSISTANT_CITATION_OPEN_EVENT = "assistant.citation.open";
export const KNOWLEDGEBASE_OPEN_CITATION_EFFECT = "knowledgebase.open_citation";

export type XpertViewHostEventSubscriptionActionType =
  | "refresh"
  | "forward"
  | "refresh-and-forward";

export interface XpertViewHostEventSubscription {
  key: string;
  event: string;
  filter?: {
    sources?: string[];
    toolNames?: string[];
    viewKeys?: string[];
    visualizationTypes?: string[];
  };
  action?: {
    type?: XpertViewHostEventSubscriptionActionType;
    debounceMs?: number;
  };
}

export interface XpertViewHostEvents {
  subscriptions?: XpertViewHostEventSubscription[];
}

export interface XpertViewHostEventVisualization {
  type?: string;
  viewKey?: string;
  title?: string;
  slotKey?: string;
  parameterKey?: string;
}

export interface XpertRemoteViewHostEventMessage {
  id: string;
  type: string;
  source: string;
  receivedAt: string;
  threadId?: string;
  toolName?: string;
  toolCallId?: string;
  runId?: string;
  durationMs?: number;
  data?: Record<string, unknown>;
  visualization?: XpertViewHostEventVisualization;
}

export interface XpertViewHostEventMessage
  extends XpertRemoteViewHostEventMessage {
  hostType?: string;
  hostId?: string;
  dataScopeKey?: string;
}

export interface XpertExtensionViewManifest {
  key: string;
  title: XpertI18nObject;
  description?: XpertI18nObject;
  icon?: IconDefinition;
  hostType: XpertViewHostType;
  slot: string;
  order?: number;
  visible?: boolean;
  source: XpertViewSource;
  permissions?: string[];
  badge?: XpertViewBadge;
  refreshable?: boolean;
  polling?: XpertViewPolling;
  activation?: XpertViewActivation;
  runtime?: {
    featureProviders?: XpertViewFeatureProvider[];
  };
  workbench?: XpertWorkbenchViewOptions;
  view: XpertViewSchema;
  dataSource: XpertViewDataSource;
  parameters?: XpertViewParameterDefinition[];
  actions?: XpertViewActionDefinition[];
  clientCommands?: XpertViewClientCommandDefinition[];
  fileAccess?: XpertViewFileAccessDefinition;
  hostEvents?: XpertViewHostEvents;
}

export interface XpertViewActionRequest {
  targetId?: string;
  input?: Record<string, unknown> | null;
  parameters?: Record<string, XpertViewScalar | XpertViewScalar[]>;
}

export interface XpertViewDataResult<TItem = unknown, TSummary = unknown> {
  items?: TItem[];
  item?: TItem;
  total?: number;
  nextCursor?: string;
  summary?: TSummary;
  meta?: unknown;
}

export interface XpertViewActionResult<TData = unknown> {
  success: boolean;
  message?: XpertI18nObject;
  data?: TData;
  refresh?: boolean;
}

export type XpertViewFile = File | Blob | ArrayBuffer | ArrayBufferView;

export interface XpertViewFileActionRequest extends XpertViewActionRequest {
  file: XpertViewFile;
  fileName?: string;
}

export interface XpertViewRequestOptions {
  signal?: AbortSignal;
  runtimeScope?: XpertViewRuntimeScopeInput;
}
