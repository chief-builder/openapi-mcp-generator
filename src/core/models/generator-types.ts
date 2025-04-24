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