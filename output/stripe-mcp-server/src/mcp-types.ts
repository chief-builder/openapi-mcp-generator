/**
 * MCP Protocol Types
 * 
 * Based on the Model Context Protocol specification.
 */

// MCP Capability Types
export enum MCPCapabilityType {
  Tool = 'tool',
  Prompt = 'prompt',
  Resource = 'resource'
}

// Base MCP Capability interface
export interface IMCPCapability {
  id: string;
  type: MCPCapabilityType;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
}

// MCP Tool definition
export interface IMCPTool extends IMCPCapability {
  type: MCPCapabilityType.Tool;
  parameters: IMCPSchema;
  returns: IMCPSchema;
  requiresAuth?: boolean;
  requiredScopes?: string[];
}

// MCP Schema (subset of JSON Schema)
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

// MCP Authentication Context
export interface IMCPAuthContext {
  userId?: string;
  roles?: string[];
  scopes?: string[];
  token?: string;
  expiresAt?: number;
  metadata?: Record<string, any>;
  [key: string]: any;
}

// MCP Server Configuration
export interface IMCPServerConfig {
  serverName: string;
  serverVersion: string;
  serverDescription?: string;
  transport: 'http' | 'stdio';
  httpPort?: number;
  supportedMethods?: string[];
  authProviders?: IMCPAuthProvider[];
}

// MCP Authentication Provider
export interface IMCPAuthProvider {
  type: string;
  config: any;
  authenticate(request: IMCPRequest): Promise<IMCPAuthContext | null>;
}

// MCP Server base class
export abstract class MCPServerBase {
  protected config: IMCPServerConfig;
  
  constructor(config: IMCPServerConfig) {
    this.config = config;
  }
  
  public abstract start(): Promise<void>;
  public abstract stop(): Promise<void>;
}

// MCP Request
export interface IMCPRequest {
  id: string;
  method: string;
  params: any;
  jsonrpc: string;
  authContext?: IMCPAuthContext;
  headers?: Record<string, string>;
}

// MCP Response
export interface IMCPResponse {
  id: string;
  jsonrpc: string;
  result?: any;
  error?: IMCPError;
}

// MCP Error
export interface IMCPError {
  code: number;
  message: string;
  data?: any;
}

// MCP Tool Call Request
export interface IMCPToolCallRequest {
  tool: string;
  parameters: any;
}

// MCP Tool Call Response
export interface IMCPToolCallResponse {
  result: any;
}