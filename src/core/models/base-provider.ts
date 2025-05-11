/**
 * Base provider implementation with common functionality
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import {
  IProvider,
  IProviderConfig,
  IAuthProviderConfig
} from './provider';
import {
  IParsedSpec,
  IParsedEndpoint,
  IParsedParameter,
  IParsedRequestBody,
  IParsedResponse
} from './parser-types';
import {
  IMCPTool,
  IMCPPrompt,
  IMCPSchema,
  IMCPToolAnnotations,
  MCPCapabilityType
} from './mcp-types';
import { IHandlerGenerationOptions } from './generator-types';
import { OpenAPIParser } from '../parser/openapi-parser';
import { TemplateHandler } from '../utils/template-handler';
import * as StringUtils from '../utils/string-utils';
import { formatServerClassName } from './naming-conventions';
import { ApiUtils } from '../utils/api-utils';

/**
 * Base implementation for API providers with common functionality
 */
export abstract class BaseProvider implements IProvider {
  /**
   * Name of the provider
   */
  abstract readonly name: string;

  /**
   * Version of the provider
   */
  abstract readonly version: string;

  /**
   * Description of the provider
   */
  abstract readonly description: string;

  /**
   * Directory containing templates for this provider
   */
  protected abstract get templatesDir(): string;

  /**
   * Parse an OpenAPI specification with provider-specific logic
   * 
   * @param spec The raw OpenAPI specification
   * @returns Parsed specification with provider-specific processing
   */
  parseOpenAPISpec(spec: any): IParsedSpec {
    // Extract basic info
    const parsedSpec: IParsedSpec = {
      title: spec.info?.title || 'API',
      version: spec.info?.version || '1.0.0',
      description: spec.info?.description || 'API',
      servers: spec.servers || [],
      endpoints: [],
      securitySchemes: spec.components?.securitySchemes || {},
      components: {
        schemas: spec.components?.schemas || {}
      }
    };
    
    // Parse all paths
    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        if (!pathItem) continue;
        
        for (const [method, operationObj] of Object.entries(pathItem as any)) {
          if (method === '$ref' || method === 'parameters' || !operationObj) continue;
          if (!this.isHttpMethod(method)) continue;
          
          const operation = operationObj as any;
          
          // Skip deprecated operations unless explicitly included
          if (operation.deprecated) continue;
          
          // Create a parsed endpoint
          const endpoint: IParsedEndpoint = {
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId || this.generateOperationId(path, method),
            summary: operation.summary || '',
            description: operation.description || '',
            parameters: this.parseParameters(operation.parameters, (pathItem as any).parameters),
            responses: this.parseResponses(operation.responses || {}),
            tags: operation.tags || [],
            extensions: this.extractExtensions(operation)
          };
          
          if (operation.requestBody) {
            endpoint.requestBody = this.parseRequestBody(operation.requestBody);
          }
          
          parsedSpec.endpoints.push(endpoint);
        }
      }
    }
    
    console.log(`Parsed ${parsedSpec.endpoints.length} endpoints from OpenAPI spec`);
    
    return parsedSpec;
  }

  /**
   * Generate an operation ID from the path and method
   * Provider-specific implementations should override this
   * 
   * @param path API path
   * @param method HTTP method
   * @returns Generated operation ID
   */
  protected generateOperationId(path: string, method: string): string {
    // Default implementation
    return `${method.toLowerCase()}${this.pathToMethodName(path)}`;
  }

  /**
   * Convert a path to a method name
   * 
   * @param path Path
   * @returns Method name
   */
  protected pathToMethodName(path: string): string {
    return path
      .split('/')
      .filter(Boolean)
      .map(segment => segment.replace(/[^a-zA-Z0-9]/g, ''))
      .map(segment => StringUtils.capitalize(segment))
      .join('');
  }

  /**
   * Check if a string is a valid HTTP method
   */
  protected isHttpMethod(method: string): boolean {
    return OpenAPIParser.isHttpMethod(method);
  }

  /**
   * Parse parameters from OpenAPI spec
   */
  protected parseParameters(operationParams: any[] = [], pathParams: any[] = []): any[] {
    return OpenAPIParser.parseParameters(operationParams, pathParams);
  }

  /**
   * Parse request body from OpenAPI spec
   */
  protected parseRequestBody(requestBody: any): any {
    return OpenAPIParser.parseRequestBody(requestBody);
  }

  /**
   * Parse responses from OpenAPI spec
   */
  protected parseResponses(responses: any): Record<string, any> {
    return OpenAPIParser.parseResponses(responses);
  }

  /**
   * Extract extensions from object
   */
  protected extractExtensions(obj: any): Record<string, any> {
    return OpenAPIParser.extractExtensions(obj, true);
  }

  /**
   * Map OpenAPI operations to MCP tools
   * 
   * @param operations List of parsed endpoints to map to tools
   * @returns Array of MCP tool definitions
   */
  mapOperationsToTools(operations: IParsedEndpoint[]): IMCPTool[] {
    const tools: IMCPTool[] = [];
    
    for (const operation of operations) {
      const toolName = this.operationIdToToolName(operation.operationId);
      
      const tool: IMCPTool = {
        id: toolName,
        type: MCPCapabilityType.Tool,
        name: toolName,
        description: operation.description || operation.summary,
        parameters: this.mapParametersToSchema(operation),
        returns: this.mapResponsesToSchema(operation),
        requiresAuth: true,
        annotations: this.determineToolAnnotations(operation),
        metadata: {
          path: operation.path,
          method: operation.method,
          operationId: operation.operationId
        }
      };
      
      tools.push(tool);
    }
    
    return tools;
  }

  /**
   * Convert operation ID to tool name
   * Provider-specific implementations should override this
   */
  protected operationIdToToolName(operationId: string): string {
    if (!operationId) return 'unknownTool';

    // Default implementation: convert to camelCase
    return StringUtils.toCamelCase(operationId);
  }

  /**
   * Map OpenAPI parameters to MCP schema
   * Provider-specific implementations should override this
   */
  protected mapParametersToSchema(operation: IParsedEndpoint): IMCPSchema {
    const properties: Record<string, IMCPSchema> = {};
    const required: string[] = [];
    
    // Add parameters from URL and query
    for (const param of operation.parameters) {
      properties[param.name] = {
        ...(param.schema as IMCPSchema || { type: 'string' }),
        description: param.description || `${param.name} parameter`
      };
      
      if (param.required) {
        required.push(param.name);
      }
    }
    
    // Add request body parameters
    if (operation.requestBody && operation.requestBody.content) {
      const contentType = operation.requestBody.content['application/json'] ? 
        'application/json' : Object.keys(operation.requestBody.content)[0];
      
      if (contentType && operation.requestBody.content[contentType]?.schema) {
        const bodySchema = operation.requestBody.content[contentType].schema as any;
        
        if (bodySchema.properties) {
          for (const [name, propSchema] of Object.entries(bodySchema.properties as Record<string, any>)) {
            properties[name] = {
              ...(propSchema as IMCPSchema),
              description: (propSchema as any).description || `${name} parameter`
            };
          }
        }
        
        if (bodySchema.required && Array.isArray(bodySchema.required)) {
          required.push(...bodySchema.required);
        }
      }
    }
    
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  }

  /**
   * Map OpenAPI responses to MCP schema
   */
  protected mapResponsesToSchema(operation: IParsedEndpoint): IMCPSchema {
    // Get the success response (prefer 200, then 201, then any 2xx)
    const successResponse = operation.responses['200'] ||
                            operation.responses['201'] ||
                            Object.entries(operation.responses)
                                .find(([code]) => code.startsWith('2'))?.[1];

    if (!successResponse || !successResponse.content) {
      return ApiUtils.formatResponseSchema(null, 'API response');
    }

    // Get the content type (prefer application/json)
    const contentType = successResponse.content['application/json'] ?
      'application/json' : Object.keys(successResponse.content)[0];

    if (!contentType || !successResponse.content[contentType]?.schema) {
      return ApiUtils.formatResponseSchema(null, successResponse.description || 'API response');
    }

    const responseSchema = successResponse.content[contentType].schema;
    const defaultDescription = successResponse.description || 'API response';

    return ApiUtils.formatResponseSchema(responseSchema, defaultDescription);
  }

  /**
   * Determine tool annotations based on operation
   */
  protected determineToolAnnotations(operation: IParsedEndpoint): IMCPToolAnnotations {
    // Get the default annotations from ApiUtils
    const annotations = ApiUtils.determineToolAnnotations(operation);

    // Override the title with our specific implementation
    annotations.title = this.formatToolTitle(operation.operationId);

    return annotations;
  }

  /**
   * Format a tool title from an operation ID
   */
  protected formatToolTitle(operationId: string): string {
    if (!operationId) return 'Unknown Tool';

    // Default implementation: format as title
    return StringUtils.formatAsTitle(operationId);
  }

  /**
   * Create an authentication provider
   * Provider-specific implementations must implement this
   */
  abstract createAuthProvider(config: IAuthProviderConfig): {
    code: string;
    name: string;
    type: string;
  };

  /**
   * Generate handlers for operations
   * Provider-specific implementations must implement this
   */
  abstract generateHandlers(operations: IParsedEndpoint[], options: IHandlerGenerationOptions): string;

  /**
   * Generate server implementation
   * Provider-specific implementations must implement this
   */
  abstract generateServerImplementation(spec: IParsedSpec, config: IProviderConfig): string;

  /**
   * Generate additional files needed for the server
   * Provider-specific implementations may override this
   */
  generateAdditionalFiles?(spec: IParsedSpec, config: IProviderConfig): Map<string, string> {
    return new Map<string, string>();
  }

  /**
   * Define prompts for this API
   * Provider-specific implementations may override this
   */
  definePrompts?(spec: IParsedSpec, config: IProviderConfig): IMCPPrompt[] {
    return [];
  }

  /**
   * Load a template file
   *
   * @param templateName Name of the template file
   * @returns Template content
   */
  protected loadTemplate(templateName: string): string {
    return TemplateHandler.loadProviderTemplate(this.templatesDir, templateName);
  }

  /**
   * Load and render a template file with variables
   *
   * @param templateName Name of the template file
   * @param variables Variables to use in the template
   * @returns Rendered template content
   */
  protected loadAndRenderTemplate(templateName: string, variables: Record<string, any> = {}): string {
    return TemplateHandler.loadAndRenderProviderTemplate(this.templatesDir, templateName, { variables });
  }

  /**
   * Format server class name
   */
  protected formatServerClassName(name: string): string {
    return formatServerClassName(name);
  }
}