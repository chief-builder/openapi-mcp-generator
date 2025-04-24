/**
 * Provider interface for API-specific implementations
 */

import { IParsedSpec, IParsedEndpoint } from './parser-types';
import { IMCPTool, IMCPPrompt } from './mcp-types';
import { IHandlerGenerationOptions } from './generator-types';

/**
 * Configuration for API providers
 */
export interface IProviderConfig {
  /**
   * Name of the provider
   */
  name?: string;

  /**
   * Version of the provider
   */
  version?: string;

  /**
   * Description of the provider
   */
  description?: string;

  /**
   * Authentication configuration
   */
  authConfig?: any;

  /**
   * Whether prompts are enabled
   */
  promptsEnabled?: boolean;

  /**
   * Directory for custom prompts
   */
  customPromptsDir?: string;

  /**
   * Additional provider-specific configuration options
   */
  [key: string]: any;
}

/**
 * Authentication provider configuration
 */
export interface IAuthProviderConfig {
  /**
   * Type of authentication provider
   */
  type: string;

  /**
   * Whether authentication is required
   */
  requireAuth?: boolean;

  /**
   * Default API key
   */
  defaultApiKey?: string;

  /**
   * Additional authentication configuration options
   */
  [key: string]: any;
}

/**
 * Provider interface that must be implemented by all API providers
 */
export interface IProvider {
  /**
   * Name of the provider
   */
  readonly name: string;

  /**
   * Version of the provider
   */
  readonly version: string;

  /**
   * Description of the provider
   */
  readonly description?: string;

  /**
   * Parse an OpenAPI specification with provider-specific logic
   * 
   * @param spec The raw OpenAPI specification
   * @returns Parsed specification
   */
  parseOpenAPISpec(spec: any): IParsedSpec;

  /**
   * Create an authentication provider for this API
   * 
   * @param config Authentication configuration
   * @returns Authentication provider code
   */
  createAuthProvider(config: IAuthProviderConfig): {
    code: string;
    name: string;
    type: string;
  };

  /**
   * Map OpenAPI operations to MCP tools
   * 
   * @param operations OpenAPI operations
   * @returns MCP tools
   */
  mapOperationsToTools(operations: IParsedEndpoint[]): IMCPTool[];

  /**
   * Generate implementation code for operation handlers
   * 
   * @param operations OpenAPI operations
   * @param options Handler generation options
   * @returns Generated code for handlers
   */
  generateHandlers(operations: IParsedEndpoint[], options: IHandlerGenerationOptions): string;

  /**
   * Generate server implementation
   * 
   * @param spec Parsed OpenAPI specification
   * @param config Provider configuration
   * @returns Generated code for server implementation
   */
  generateServerImplementation(spec: IParsedSpec, config: IProviderConfig): string;

  /**
   * Generate additional files needed for the server
   * 
   * @param spec Parsed OpenAPI specification
   * @param config Provider configuration
   * @returns Map of filenames to file contents
   */
  generateAdditionalFiles?(spec: IParsedSpec, config: IProviderConfig): Map<string, string>;

  /**
   * Define prompts for this API
   * 
   * @param spec Parsed OpenAPI specification
   * @param config Provider configuration
   * @returns Array of MCP prompts
   */
  definePrompts?(spec: IParsedSpec, config: IProviderConfig): IMCPPrompt[];

  /**
   * Generate implementation code for prompt handlers
   * 
   * @param prompts MCP prompts
   * @param options Handler generation options
   * @returns Generated code for prompt handlers
   */
  generatePromptHandlers?(prompts: IMCPPrompt[], options: IHandlerGenerationOptions): string;

  /**
   * Load custom prompts from a directory
   * 
   * @param directory Directory containing custom prompts
   * @returns Array of MCP prompts
   */
  loadCustomPrompts?(directory: string): Promise<IMCPPrompt[]>;
}