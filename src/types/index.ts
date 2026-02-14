export interface RagwallaConfig {
  apiKey: string;
  baseURL: string; // Now mandatory - must follow pattern: https://example.ai.ragwalla.com/v1
  timeout?: number;
  debug?: boolean; // Enable debug logging
}

export interface SubagentLifecycleConfig {
  autoTeardown?: 'manual' | 'after_delegation' | 'ttl';
  ttlSeconds?: number;
  maxActiveChildren?: number;
  spawnTimeoutSeconds?: number;
}

export interface AgentChild {
  id: string;
  parent_agent_id: string;
  child_agent_id: string;
  ephemeral: boolean;
  status: 'active' | 'torn_down';
  created_at: number;
  torn_down_at: number | null;
  last_activity_at: number | null;
  child_name?: string;
  label?: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  model?: string;
  instructions?: string;
  tools?: Tool[];
  metadata?: Record<string, any>;
  temperature?: number;
  topP?: number;
  isEnabled?: boolean;
  agentType?: 'orchestrator' | 'primary' | 'subagent';
  modelConfig?: {
    model: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
  };
  agentMetadata?: {
    agentId: string;
    agentType: string;
    canDelegate: boolean;
    canBeDelegatedTo: boolean;
    maxDelegationDepth: number;
    maxConcurrentDelegations?: number;
    delegationTimeoutSeconds?: number;
    createdAt: number;
    updatedAt: number;
  };
  subagentLifecycle?: SubagentLifecycleConfig;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  model?: string;
  instructions?: string;
  tools?: string[];
  metadata?: Record<string, any>;
  project_id?: string;
  temperature?: number;
  topP?: number;
  agentType?: 'orchestrator' | 'primary' | 'subagent';
  executionMode?: 'assistant' | 'execution-only';
  subagentLifecycle?: SubagentLifecycleConfig;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  instructions?: string;
  model?: string;
  temperature?: number;
  topP?: number;
  isEnabled?: boolean;
  tools?: AgentTool[];
  metadata?: Record<string, any>;
  agentType?: 'orchestrator' | 'primary' | 'subagent';
  executionMode?: 'assistant' | 'execution-only';
  canDelegate?: boolean;
  canBeDelegatedTo?: boolean;
  maxDelegationDepth?: number;
  subagentLifecycle?: SubagentLifecycleConfig;
}

export type AgentTool = Tool;

// Model types

export interface ModelInfo {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

export interface ModelsListResponse {
  object: 'list';
  data: ModelInfo[];
  curated: string[];
  model_ids: string[];
  providers: string[];
  total_count: number;
}

export type ToolType = 'function' | 'assistant' | 'api' | 'knowledge_base' | 'mcp' | 'system';

export interface BaseTool {
  id: string;
  type: ToolType;
  name: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface FunctionTool extends BaseTool {
  type: 'function';
  code: string;
  parameters?: Record<string, any>;
  timeout?: number;
  memoryLimit?: number;
}

export interface AssistantTool extends BaseTool {
  type: 'assistant';
  assistantId: string;
  specialties?: string[];
  whenToUse?: string;
  defaultParameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

export interface ApiTool extends BaseTool {
  type: 'api';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  parameters?: Record<string, any>;
  authentication?: {
    type: 'bearer' | 'api-key' | 'basic';
    credentials: string;
  };
}

export interface KnowledgeBaseTool extends BaseTool {
  type: 'knowledge_base';
  vectorStoreId: string;
  searchParameters?: {
    topK?: number;
    scoreThreshold?: number;
  };
}

export interface MCPTool extends BaseTool {
  type: 'mcp';
  serverId: string;
  serverName?: string;
  serverUrl?: string;
  toolName: string;
  protocolVersion?: string;
  transportType?: 'stdio' | 'http' | 'websocket';
  parameters?: Record<string, any>;
}

export interface SystemTool extends BaseTool {
  type: 'system';
  category?: string;
  parameters?: Record<string, any>;
}

export type Tool = FunctionTool | AssistantTool | ApiTool | KnowledgeBaseTool | MCPTool | SystemTool;

/** An agent skill = system-provided or user-created capability (excludes MCP tools) */
export type AgentSkill = FunctionTool | SystemTool;

/** Alias for SystemTool */
export type SystemSkill = SystemTool;

/** @deprecated Use Tool instead */
export interface ToolFunction {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

// Assistant types (OpenAI Assistants-style resources)

export type AssistantResponseFormat = {
  type: 'text' | 'json_object';
};

export type AssistantChunkingStrategy =
  | { type: 'auto' }
  | {
      type: 'static';
      static: {
        max_chunk_size_tokens: number;
        chunk_overlap_tokens: number;
      };
    };

export interface AssistantFunctionObject {
  name: string;
  description?: string;
  parameters: Record<string, any>;
  strict?: boolean;
}

export interface AssistantCodeInterpreterTool {
  type: 'code_interpreter';
}

export interface AssistantFileSearchTool {
  type: 'file_search';
  file_search?: {
    max_num_results?: number;
    ranking_options?: {
      ranker: 'auto' | 'default_2024_08_21';
      score_threshold: number;
    };
  };
}

export interface AssistantFunctionTool {
  type: 'function';
  function: AssistantFunctionObject;
}

export type AssistantToolDefinition =
  | AssistantCodeInterpreterTool
  | AssistantFileSearchTool
  | AssistantFunctionTool;

export interface AssistantToolResources {
  code_interpreter?: {
    file_ids: string[];
  };
  file_search?: {
    vector_store_ids?: string[];
    vector_stores?: Array<{
      file_ids: string[];
      chunking_strategy?: AssistantChunkingStrategy;
      metadata?: Record<string, string>;
    }>;
  };
}

export interface AssistantEmbeddingSettings {
  model: string;
  dimensions?: number;
  options?: Record<string, any>;
}

export interface AssistantConfig {
  model: string;
  embedding_settings?: AssistantEmbeddingSettings;
  instructions?: string | null;
  tools?: AssistantToolDefinition[];
  tool_resources?: AssistantToolResources | null;
  metadata?: Record<string, string> | null;
  temperature?: number | null;
  top_p?: number | null;
  response_format?: AssistantResponseFormat | null;
}

export interface Assistant {
  id: string;
  object: 'assistant';
  created_at: number;
  updated_at?: number;
  name: string;
  description: string | null;
  model: string;
  embedding_settings?: AssistantEmbeddingSettings;
  instructions: string | null;
  tools: AssistantToolDefinition[];
  tool_resources: AssistantToolResources | null;
  metadata: Record<string, string> | null;
  temperature: number;
  top_p: number;
  response_format: AssistantResponseFormat | null;
  project_id?: string;
}

export interface AssistantList {
  object: 'list';
  data: Assistant[];
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
}

export interface AssistantDeleted {
  id: string;
  object: 'assistant.deleted';
  deleted: boolean;
}

export type CreateAssistantParams = AssistantConfig & {
  name?: string;
  description?: string;
  status?: string;
  project_id?: string;
};

export interface AssistantResourceCreateRequest {
  name?: string;
  description?: string;
  resource_type: 'assistant';
  config: AssistantConfig;
  status?: string;
  project_id?: string;
}

export type CreateAssistantRequest = CreateAssistantParams | AssistantResourceCreateRequest;

export type UpdateAssistantParams = Partial<AssistantConfig> & {
  name?: string;
  description?: string | null;
  status?: string;
};

export interface AssistantResourceUpdateRequest {
  name?: string;
  description?: string | null;
  resource_type?: 'assistant';
  config?: Partial<AssistantConfig>;
  status?: string;
}

export type UpdateAssistantRequest = UpdateAssistantParams | AssistantResourceUpdateRequest;

// MCP Server types

export type MCPTransportType = 'stdio' | 'http' | 'websocket';
export type MCPAuthType = 'none' | 'bearer' | 'api_key' | 'oauth2';

export interface MCPOAuthConfig {
  flow?: 'authorization_code' | 'client_credentials' | 'mcp_native';
  authUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  scopes?: string[];
  audience?: string;
  resource?: string;
  redirectUri?: string;
  extraAuthParams?: Record<string, string>;
  extraTokenParams?: Record<string, string>;
  provider?: string;
  supportsNative?: boolean;
}

export interface MCPServer {
  id: string;
  name: string;
  description?: string;
  url?: string;
  command?: string;
  transport_type: MCPTransportType;
  protocol_version: string;
  auth_type: MCPAuthType;
  status: string;
  auth_status?: 'pending' | 'connected' | 'error';
  supports_sse?: boolean;
  capabilities?: Record<string, any>;
  created_at: number;
  updated_at: number;
}

export interface CreateMCPServerRequest {
  name: string;
  description?: string;
  url?: string;
  command?: string;
  transport_type: MCPTransportType;
  protocol_version?: string;
  auth_type?: MCPAuthType;
  auth_config?: Record<string, any>;
  supports_sse?: boolean;
  /** Required for org-level API keys. Project-scoped keys resolve this automatically. */
  project_id?: string;
}

export interface UpdateMCPServerRequest {
  name?: string;
  description?: string;
  url?: string;
  command?: string;
  transport_type?: MCPTransportType;
  protocol_version?: string;
  auth_type?: MCPAuthType;
  auth_config?: Record<string, any>;
  supports_sse?: boolean;
  /** Optional: required when using org-level API keys. */
  project_id?: string;
}

export interface TestMCPServerRequest {
  name: string;
  url?: string;
  transport_type: MCPTransportType;
  protocol_version?: string;
  auth_type?: MCPAuthType;
  auth_config?: Record<string, any>;
  supports_sse?: boolean;
  /** Optional: required when using org-level API keys. */
  project_id?: string;
}

export interface MCPDiscoveredTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

export interface MCPDiscoverResponse {
  tools: MCPDiscoveredTool[];
  server_info?: {
    name?: string;
    version?: string;
    protocolVersion?: string;
    capabilities?: Record<string, any>;
  };
}

export interface MCPTestResponse {
  success: boolean;
  message: string;
  tools?: Array<{ name: string; title?: string; description?: string }>;
  serverInfo?: {
    name?: string;
    version?: string;
    protocolVersion?: string;
  };
  validation?: {
    valid: boolean;
    errors: Array<{ toolName: string; field: string; message: string }>;
  };
}

export interface MCPAgentAccess {
  id: string;
  agent_id: string;
  mcp_server_id: string;
  enabled: boolean;
  agent_name?: string;
  agent_description?: string;
  granted_by: string;
  granted_at: number;
}

export interface MCPOAuthStartResponse {
  auth_url: string;
  state: string;
  expires_at: number;
}

export interface MCPOAuthStatusResponse {
  auth_status: 'pending' | 'connected' | 'error';
  access_token_expires_at?: number | null;
}

export interface MCPOAuthRefreshResponse {
  success: boolean;
  access_token_expires_at?: number | null;
}

export interface GrantAgentAccessRequest {
  agent_id: string;
  enabled?: boolean;
  /** Optional: required when using org-level API keys. */
  project_id?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  metadata?: Record<string, any>;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ConnectionToken {
  token: string;
  expires_at: string;
}

export interface VectorSearchRequest {
  query: string;
  top_k?: number;
  filter?: Record<string, any>;
  include_metadata?: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  content?: string;
}

export interface VectorSearchResponse {
  object: 'list';
  data: VectorSearchResult[];
  usage?: {
    total_tokens: number;
  };
}

export interface QuotaEvent {
  action: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  reset_date?: string;
}

export interface WebSocketMessage {
  type: 'message' | 'chat_message' | 'chunk' | 'complete' | 'message_created' |
        'thread_info' | 'thread_history' | 'typing' | 'tool_use' | 'token_usage' | 'error' |
        'connection_status' | 'connected' | 'cf_agent_state' |
        'run_paused' | 'continuation_mode_updated' | 'continue_run_result' |
        'status';
  data?: any; // Optional - some message types don't use data wrapper
  content?: string; // For message types - content at top level
  role?: string; // For message types
  timestamp?: string;
  // Additional fields the server may include
  threadId?: string;
  runId?: string;
  assistantId?: string;
  agentId?: string;
  projectId?: string;
  userId?: string;
  createNewThread?: boolean;
  messageId?: string;
  isTyping?: boolean; // For typing messages
  tools?: string[]; // For tool_use messages
  isNewThread?: boolean; // For thread_info messages
  assistantName?: string; // For thread_info messages
  status?: string; // For status messages - e.g., 'tool_executing', 'tool_complete', 'tool_progress', 'generating'
  message?: string; // For status messages - human-readable description
  toolName?: string; // For status messages - the tool being executed
  toolCallId?: string; // For status messages - unique ID for this tool invocation
  toolType?: 'system' | 'mcp' | 'user' | 'unknown'; // For status messages - tool classification
  serverName?: string; // For MCP tool status messages - the MCP server name
  progress?: number; // For tool_progress status - current progress value (from MCP notifications/progress)
  total?: number; // For tool_progress status - total expected value (from MCP notifications/progress)
}

export interface RagwallaError {
  type: string;
  code?: string;
  message: string;
  param?: string;
}

// Channel types

export type ChannelType = 'slack' | 'discord' | 'telegram' | 'webhook' | 'whatsapp' | 'teams';
export type WebhookStatus = 'pending' | 'registered' | 'failed' | 'manual';

export interface Channel {
  id: string;
  agent_id: string;
  channel_type: ChannelType;
  enabled: boolean;
  session_scope?: string;
  webhook_status?: WebhookStatus;
  webhook_error?: string;
  webhook_registered_at?: number;
  created_at: number;
  updated_at: number;
}

export interface CreateChannelRequest {
  channel_type: ChannelType;
  config: Record<string, unknown>;
  session_scope?: string;
  hook_token?: string;
}

export interface CreateChannelResponse {
  id: string;
  agent_id: string;
  channel_type: ChannelType;
  webhook_status: WebhookStatus;
  webhook_error?: string;
  setup_instructions?: string;
  created_at: number;
}

export interface ChannelStatus {
  id: string;
  agent_id: string;
  channel_type: ChannelType;
  enabled: boolean;
  webhook_status?: WebhookStatus;
  webhook_error?: string;
  webhook_registered_at?: number;
  live_status?: {
    pending_update_count?: number;
    last_error_message?: string;
    last_error_date?: number;
  };
}

export interface WebhookRetryResponse {
  success: boolean;
  webhook_status: WebhookStatus;
  webhook_error?: string;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings?: string;
  created_at: number;
  updated_at: number;
  projects?: Project[];
}

export interface OrganizationList {
  object: 'list';
  data: Organization[];
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
}

// Project types
export interface Project {
  id: string;
  object: string;
  name: string;
  description?: string;
  organization_id: string;
  created_at: number;
  updated_at: number;
  status: string;
  archived_at?: number | null;
}

export interface ProjectList {
  object: 'list';
  data: Project[];
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
}

// Workspace File types

export type WorkspaceFileType = 'soul' | 'identity' | 'user' | 'tools' | 'bootstrap' | 'boot' | 'heartbeat' | 'custom';

export interface WorkspaceFile {
  id: string;
  agentId: string;
  fileType: WorkspaceFileType;
  fileName: string;
  content: string;
  enabled: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWorkspaceFileRequest {
  file_type: WorkspaceFileType;
  content: string;
  file_name?: string;
}

export interface UpdateWorkspaceFileRequest {
  content?: string;
  file_name?: string;
  enabled?: boolean;
}

export interface WorkspacePreview {
  agentId: string;
  hasWorkspace: boolean;
  composedPrompt: string | null;
}
