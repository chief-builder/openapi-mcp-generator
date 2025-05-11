/**
 * Core types for the Model Context Protocol (MCP)
 */

/**
 * MCP Capability Types
 */
export enum MCPCapabilityType {
  Tool = 'tool',
  Prompt = 'prompt',
  Resource = 'resource'
}

/**
 * Base MCP Capability interface
 */
export interface IMCPCapability {
  id: string;
  type: MCPCapabilityType;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * MCP Tool definition
 */
export interface IMCPTool extends IMCPCapability {
  type: MCPCapabilityType.Tool;
  parameters: IMCPSchema;
  returns: IMCPSchema;
  requiresAuth?: boolean;
  requiredScopes?: string[];
  annotations?: IMCPToolAnnotations;
}

/**
 * MCP Prompt definition
 */
export interface IMCPPrompt extends IMCPCapability {
  type: MCPCapabilityType.Prompt;
  template: string;
  parameters: IMCPSchema;
  returns: IMCPSchema;
  examples?: IMCPPromptExample[];
}

/**
 * MCP Prompt Example
 */
export interface IMCPPromptExample {
  parameters: any;
  result: any;
}

export interface IMCPToolAnnotations {
  title?: string;              // Human-readable title for the tool
  readOnlyHint?: boolean;      // If true, the tool does not modify its environment
  destructiveHint?: boolean;   // If true, the tool may perform destructive updates
  idempotentHint?: boolean;    // If true, repeated calls with same args have no additional effect
  openWorldHint?: boolean;     // If true, tool interacts with external entities
}

/**
 * MCP Schema (subset of JSON Schema)
 */
export interface IMCPSchema {
  type: string | string[];
  description?: string;
  required?: string[];
  properties?: Record<string, IMCPSchema>;
  items?: IMCPSchema;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: any;
  examples?: any[];
  [key: string]: any;
}

/**
 * MCP Authentication Context
 */
export interface IMCPAuthContext {
  userId?: string;
  roles?: string[];
  scopes?: string[];
  token?: string;
  expiresAt?: number;
  metadata?: Record<string, any>;
  [key: string]: any;
}

/**
 * MCP Server Configuration
 */
/**
 * MCP Server Security Configuration
 */
export interface IMCPServerSecurityConfig {
  /**
   * Whether to bind the server to localhost only (127.0.0.1)
   * This is recommended for security to prevent remote access
   * Default: true
   */
  bindToLocalhost?: boolean;

  /**
   * List of allowed origins for CORS
   * If not specified, only localhost origins are allowed
   * Set to ['*'] to allow all origins (not recommended)
   * Example: ['http://localhost:3000', 'https://example.com']
   */
  allowedOrigins?: string[];

  /**
   * Request timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  requestTimeoutMs?: number;

  /**
   * Maximum request body size in bytes
   * Default: 1048576 (1 MB)
   */
  maxRequestBodySize?: number;

  /**
   * Whether to validate content type header
   * Default: true
   */
  validateContentType?: boolean;

  /**
   * Rate limit configuration
   */
  rateLimit?: {
    /**
     * Maximum number of requests per minute
     * Default: 100
     */
    maxRequestsPerMinute?: number;

    /**
     * Window size in milliseconds for rate limiting
     * Default: 60000 (1 minute)
     */
    windowMs?: number;
  };
}

export interface IMCPServerConfig {
  serverName: string;
  serverVersion: string;
  serverDescription?: string;
  transport: 'http' | 'stdio' | 'sse';
  httpPort?: number;
  supportedMethods?: string[];
  authProviders?: IMCPAuthProvider[];

  /**
   * Security configuration
   */
  security?: IMCPServerSecurityConfig;
}

/**
 * MCP Authentication Provider
 */
export interface IMCPAuthProvider {
  type: string;
  config: any;
  authenticate(request: IMCPRequest): Promise<IMCPAuthContext | null | undefined>;
}

/**
 * MCP Request
 */
export interface IMCPRequest {
  id: string;
  method: string;
  params: any;
  jsonrpc: string;
  authContext?: IMCPAuthContext;
  headers?: Record<string, string>;
}

/**
 * MCP Response
 */
export interface IMCPResponse {
  id: string;
  jsonrpc: string;
  result?: any;
  error?: IMCPError;
}

/**
 * MCP Error
 */
export interface IMCPError {
  code: number;
  message: string;
  data?: any;
}

/**
 * MCP Tool Call Request
 */
export interface IMCPToolCallRequest {
  tool: string;
  parameters: any;
}

/**
 * MCP Tool Call Response
 */
export interface IMCPToolCallResponse {
  result: any;
}

export interface IMCPToolCallErrorResult {
  isError: true;
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface IMCPToolCallSuccessResult {
  isError?: false;
  content: Array<{
    type: string;
    text: string;
  }>;
}

// Union type for tool call results
export type IMCPToolCallResult = IMCPToolCallSuccessResult | IMCPToolCallErrorResult;

/**
 * MCP Prompt Call Request
 */
export interface IMCPPromptCallRequest {
  prompt: string;
  parameters: any;
}

/**
 * MCP Prompt Call Response
 */
export interface IMCPPromptCallResponse {
  result: any;
}

/**
 * MCP Server abstract class
 */
export abstract class MCPServerBase {
  protected config: IMCPServerConfig;
  
  constructor(config: IMCPServerConfig) {
    this.config = config;
  }
  
  public abstract start(): Promise<void>;
  public abstract stop(): Promise<void>;
}