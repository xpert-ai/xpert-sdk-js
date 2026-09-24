type ImageDetail = "auto" | "low" | "high";
type MessageContentImageUrl = {
  type: "image_url";
  image_url: string | { url: string; detail?: ImageDetail | undefined };
};

type MessageContentText = { type: "text"; text: string };
type MessageContentComplex = MessageContentText | MessageContentImageUrl;
type MessageContent = string | MessageContentComplex[];

/**
 * Model-specific additional kwargs, which is passed back to the underlying LLM.
 */
type MessageAdditionalKwargs = Record<string, unknown>;

type BaseMessage = {
  additional_kwargs?: MessageAdditionalKwargs | undefined;
  content: MessageContent;
  id?: string | undefined;
  name?: string | undefined;
  response_metadata?: Record<string, unknown> | undefined;
};

export type HumanMessage = BaseMessage & {
  type: "human";
  example?: boolean | undefined;
};

export type AIMessage = BaseMessage & {
  type: "ai";
  example?: boolean | undefined;
  tool_calls?:
    | {
        name: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: { [x: string]: any };
        id?: string | undefined;
        type?: "tool_call" | undefined;
      }[]
    | undefined;
  invalid_tool_calls?:
    | {
        name?: string | undefined;
        args?: string | undefined;
        id?: string | undefined;
        error?: string | undefined;
        type?: "invalid_tool_call" | undefined;
      }[]
    | undefined;
  usage_metadata?:
    | {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        input_token_details?:
          | {
              audio?: number | undefined;
              cache_read?: number | undefined;
              cache_creation?: number | undefined;
            }
          | undefined;
        output_token_details?:
          | { audio?: number | undefined; reasoning?: number | undefined }
          | undefined;
      }
    | undefined;
};

export type ToolMessage = BaseMessage & {
  type: "tool";
  status?: "error" | "success" | undefined;
  tool_call_id: string;
  /**
   * Artifact of the Tool execution which is not meant to be sent to the model.
   *
   * Should only be specified if it is different from the message content, e.g. if only
   * a subset of the full tool output is being passed as message content but the full
   * output is needed in other parts of the code.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  artifact?: any;
};

export type SystemMessage = BaseMessage & {
  type: "system";
};

export type FunctionMessage = BaseMessage & {
  type: "function";
};

export type RemoveMessage = BaseMessage & {
  type: "remove";
};

export type Message =
  | HumanMessage
  | AIMessage
  | ToolMessage
  | SystemMessage
  | FunctionMessage
  | RemoveMessage;

/** API wire types owned by the SDK; importing them must not require a UI package. */
export type FileRevision = { sha256: string; size: number };

export type FileChangeResource = {
  type: 'file_change';
  first: { artifactId: string; artifactVersionId: string };
  last: { artifactId: string; artifactVersionId: string };
};

export type FileChangeSetResource = {
  type: 'file_change_set';
  messageId: string;
  changes: { workspacePath: string; resource?: FileChangeResource }[];
};

export type ChatTaskSummaryResourceReference =
  | { type: 'message'; messageId: string }
  | {
      type: 'workspace_file';
      workspacePath: string;
      fileAssetId?: string;
      storageFileId?: string;
    }
  | { type: 'artifact'; artifactId: string; artifactVersionId?: string }
  | FileChangeResource
  | FileChangeSetResource
  | { type: 'browser'; serviceId?: string; url?: string }
  | { type: 'url'; url: string };

export type ChatFileChange = {
  id: string;
  workspacePath: string;
  title: string;
  operation: 'added' | 'modified' | 'deleted' | 'unknown';
  before?: FileRevision | null;
  after?: FileRevision | null;
  resource?: FileChangeResource;
  coverage: 'observed' | 'legacy';
  messageId?: string;
  startedAt?: string;
  updatedAt?: string;
};

export type FileChangeLineStats =
  | { status: 'ready'; added: number; removed: number }
  | { status: 'unavailable' };

export type MessageFileChangeStats = {
  messageId: string;
  items: {
    workspacePath: string;
    resource?: FileChangeResource;
    stats: FileChangeLineStats;
  }[];
};

export type ChatTaskSummaryOutputKind =
  | 'file'
  | 'image'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'site'
  | 'url'
  | 'mcp_app';

export type ChatTaskSummaryOutputStatus = 'pending' | 'running' | 'success' | 'error';

export type ChatTaskSummaryOutput = {
  id: string;
  kind: ChatTaskSummaryOutputKind;
  title: string;
  description?: string;
  status?: ChatTaskSummaryOutputStatus;
  resource?: ChatTaskSummaryResourceReference;
  messageId?: string;
  updatedAt?: string;
  /** Only host-verified, explicitly presented files get message-end cards. */
  origin?: 'tool' | 'integration' | 'legacy';
  workspacePath?: string;
  mimeType?: string;
  size?: number;
  sha256?: string;
};

export type ChatTaskSummarySourceKind =
  | 'attachment'
  | 'code'
  | 'quote'
  | 'image'
  | 'web_page'
  | 'file_element'
  | 'knowledge'
  | 'skill'
  | 'plugin'
  | 'sub_agent';

export type ChatTaskSummarySource = {
  id: string;
  kind: ChatTaskSummarySourceKind;
  title: string;
  description?: string;
  resource?: ChatTaskSummaryResourceReference;
  messageId?: string;
  updatedAt?: string;
};

export type ChatTaskSummaryPlan = {
  title: string;
  excerpt: string;
  messageId?: string;
  updatedAt?: string;
};

export type ChatTaskSummaryTodoStatus = 'pending' | 'in_progress' | 'completed';

export type ChatTaskSummaryTodoItem = {
  id: string;
  content: string;
  status: ChatTaskSummaryTodoStatus;
};

export type ChatTaskSummaryTodos = {
  componentId: string;
  title?: string;
  items: ChatTaskSummaryTodoItem[];
  messageId?: string;
  updatedAt?: string;
};

/** Snapshot produced by the runtime after successfully loading skill instructions. */
export type ChatSkillUsage = {
  skillId: string;
  name: string;
  version: string;
  source: { type: 'workspace' | 'project' | 'assistant' | 'plugin'; id: string };
  activation: 'read';
  toolCallId: string;
  executionId?: string;
  loadedAt: string;
};

/** Compact message summary. Raw tool output and private file contents are excluded. */
export type ChatTaskSummaryContribution = {
  version: 1;
  plan?: ChatTaskSummaryPlan;
  todos?: ChatTaskSummaryTodos;
  outputs?: ChatTaskSummaryOutput[];
  sources?: ChatTaskSummarySource[];
  skillUsages?: ChatSkillUsage[];
  fileActivityVersion?: 1;
  fileActivityToolCallId?: string;
  fileChangeCoverage?: 'bounded' | 'partial' | 'unavailable';
  fileChanges?: ChatFileChange[];
};
