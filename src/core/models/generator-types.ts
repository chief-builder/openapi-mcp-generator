/**
 * Types for the MCP server generator
 */

import { IParsedSpec } from './parser-types';
import { IProvider, IProviderConfig } from './provider';

/**
 * Generator configuration
 */
export interface IGeneratorConfig {
  /**
   * Server name (used in package.json and server config)
   */
  serverName: string;
  
  /**
   * Server version
   */
  serverVersion: string;
  
  /**
   * Server description
   */
  serverDescription?: string;
  
  /**
   * Output directory for generated files
   */
  outputDir: string;
  
  /**
   * HTTP port for the server (if using HTTP transport)
   */
  httpPort?: number;
  
  /**
   * Transport type (HTTP or stdio)
   */
  transport?: 'http' | 'stdio';
  
  /**
   * Whether to generate TypeScript types
   */
  generateTypes?: boolean;
  
  /**
   * Provider-specific configuration
   */
  providerConfig?: IProviderConfig;
  
  /**
   * Authentication configuration
   */
  authConfig?: {
    requireAuth?: boolean;
    defaultApiKey?: string;
    [key: string]: any;
  };
  
  /**
   * Whether to include examples in README
   */
  includeExamples?: boolean;

  /**
   * OAuth 2.1 resource-server configuration for the generated MCP server.
   */
  serverAuthConfig?: IServerAuthConfig;
}

/**
 * OAuth 2.1 resource-server configuration baked into a generated MCP server.
 * See the MCP Authorization spec: the server validates that every token names
 * this server as its audience (RFC 8707) and never forwards it upstream.
 */
export interface IServerAuthConfig {
  /**
   * Canonical URI identifying this MCP server (RFC 8707) — the required token
   * audience. e.g. "https://mcp.example.com" or "mcp://srv/fhir-clinical".
   */
  resourceUri: string;

  /**
   * Authorization server issuer URL(s) advertised in Protected Resource Metadata.
   */
  authorizationServers: string[];

  /**
   * JWKS URL used to verify token signatures. Defaults to
   * `${authorizationServers[0]}/protocol/openid-connect/certs` if omitted.
   */
  jwksUri?: string;

  /**
   * Expected `iss` claim. Defaults to the first authorization server.
   */
  issuer?: string;

  /**
   * Scopes the server requires (enforced -> 403) and advertises in metadata.
   */
  requiredScopes?: string[];

  /**
   * How the generated server authenticates to the upstream API.
   *  - `none`: no upstream credential.
   *  - `env-credential` (default): a separate secret from `UPSTREAM_API_KEY`.
   *  - `passthrough`: forward the caller's token (discouraged; confused-deputy risk).
   */
  upstreamAuth?: 'none' | 'env-credential' | 'passthrough';

  /**
   * Base URL of the upstream API. Defaults to the OpenAPI spec's first server URL.
   */
  upstreamBaseUrl?: string;

  /**
   * Emit a call to a hand-written `./authz-hook.ts` (`authorize({auth,tool,args})`)
   * before each upstream call — for cross-cutting per-request authorization such
   * as data compartment filtering. The hook may throw `{status,message}` or
   * return (possibly mutated) args.
   */
  authzHook?: boolean;

  /**
   * Token claim carrying the caller's groups (drives per-tool visibility via
   * `x-mcp-group`). Default `groups`.
   */
  groupsClaim?: string;
}

/**
 * Generator result
 */
export interface IGeneratorResult {
  /**
   * Output directory
   */
  outputDir: string;
  
  /**
   * Generated files
   */
  files: string[];
  
  /**
   * Whether the generation was successful
   */
  success: boolean;
  
  /**
   * Error message if generation failed
   */
  errorMessage?: string;
}

/**
 * MCP Generator interface
 */
export interface IMCPGenerator {
  /**
   * Generate MCP server from parsed OpenAPI spec
   * 
   * @param spec Parsed OpenAPI specification
   * @param provider API provider implementation
   * @param config Generator configuration
   * @returns Generator result
   */
  generate(spec: IParsedSpec, provider: IProvider, config: IGeneratorConfig): Promise<IGeneratorResult>;
}

/**
 * Handler generation options
 */
export interface IHandlerGenerationOptions {
  /**
   * Whether to include type definitions
   */
  includeTypeDefs?: boolean;
  
  /**
   * Level of detail for error handling
   */
  errorHandling?: 'basic' | 'detailed';
  
  /**
   * Whether to transform responses
   */
  responseTransformation?: boolean;
}