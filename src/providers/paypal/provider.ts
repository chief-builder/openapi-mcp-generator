/**
 * PayPal API provider implementation
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { 
  IProvider, 
  IParsedSpec, 
  IParsedEndpoint,
  IMCPTool, 
  IAuthProviderConfig, 
  IProviderConfig,
  MCPCapabilityType,
  IMCPSchema,
  IMCPToolAnnotations,
  OpenAPIParser
} from '../../core';
import { IHandlerGenerationOptions } from '../../core/models/generator-types';

/**
 * Implementation of the PayPal API provider
 */
export class PayPalProvider implements IProvider {
  readonly name = 'paypal';
  readonly version = '1.0.0';
  readonly description = 'Experimental PayPal provider (incomplete OpenAPI reference resolution)';
  
/**
 * Parse an OpenAPI specification with PayPal-specific logic
 * 
 * @param spec The raw OpenAPI specification
 * @returns Parsed specification with PayPal-specific processing
 */
parseOpenAPISpec(spec: any): IParsedSpec {
    // Extract basic info
    const parsedSpec: IParsedSpec = {
      title: spec.info?.title || 'PayPal API',
      version: spec.info?.version || '1.0.0',
      description: spec.info?.description || 'PayPal API',
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
            // Use PayPal's path-based operation ID convention if no operationId is provided
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
    
    // Log the number of endpoints found
    console.log(`Parsed ${parsedSpec.endpoints.length} endpoints from PayPal OpenAPI spec`);
    
    return parsedSpec;
  }
  
  /**
   * Generate an operation ID from the path and method
   * 
   * @param path API path
   * @param method HTTP method
   * @returns Generated operation ID
   */
  private generateOperationId(path: string, method: string): string {
    // Extract the version prefix if present (e.g., v1, v2)
    const versionMatch = path.match(/^\/?(v\d+)\//);
    const version = versionMatch ? versionMatch[1] + '/' : '';
    
    // Remove version prefix and extract resource path
    const pathWithoutVersion = path.replace(/^\/?(v\d+\/)?/, '');
    
    // Process the path to extract resource and subresource
    const pathParts = pathWithoutVersion.split('/').filter(Boolean);
    
    if (pathParts.length === 0) {
      return `${version}${method.toLowerCase()}Root`;
    }
    
    // For PayPal, the first part is typically the resource
    const resource = pathParts[0];
    
    // Determine the operation based on the method and path pattern
    let operation;
    
    if (method.toLowerCase() === 'get') {
      // For GET requests with an ID parameter, it's typically a "get" operation
      if (pathParts.length > 1 && pathParts[1].startsWith('{')) {
        operation = 'get';
      } else {
        // For GET requests without ID, it's typically a "list" operation
        operation = 'list';
      }
    } else if (method.toLowerCase() === 'post') {
      // If the path has no ID, it's typically a "create" operation
      if (pathParts.length === 1) {
        operation = 'create';
      } else {
        // For POST requests to a specific resource, it could be an action
        // Extract the action from the path
        operation = pathParts[pathParts.length - 1];
      }
    } else if (method.toLowerCase() === 'put' || method.toLowerCase() === 'patch') {
      operation = 'update';
    } else if (method.toLowerCase() === 'delete') {
      operation = 'delete';
    } else {
      // Default to method name for other HTTP methods
      operation = method.toLowerCase();
    }
    
    // Combine the parts to form an operation ID in the format "v1/resource/operation"
    return `${version}${resource}/${operation}`;
  }
  
  /**
   * Check if a string is a valid HTTP method
   */
  private isHttpMethod(method: string): boolean {
    return ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase());
  }
  
  /**
   * Parse parameters from OpenAPI spec
   */
  private parseParameters(operationParams: any[] = [], pathParams: any[] = []): any[] {
    // Create a parser instance just for using its utility methods
    const parser = new OpenAPIParser(this, {});
    return parser.parseParameters(operationParams, pathParams);
  }
  
  /**
   * Parse request body from OpenAPI spec
   */
  private parseRequestBody(requestBody: any): any {
    // Create a parser instance just for using its utility methods
    const parser = new OpenAPIParser(this, {});
    return parser.parseRequestBody(requestBody);
  }
  
  /**
   * Parse responses from OpenAPI spec
   */
  private parseResponses(responses: any): Record<string, any> {
    // Create a parser instance just for using its utility methods
    const parser = new OpenAPIParser(this, {});
    return parser.parseResponses(responses);
  }
  
  /**
   * Extract extensions from object
   */
  private extractExtensions(obj: any): Record<string, any> {
    // Create a parser instance just for using its utility methods
    // Enable customExtensions option to ensure we get all x- prefixed properties
    const parser = new OpenAPIParser(this, { customExtensions: true });
    return parser.extractExtensions(obj);
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
   */
  private operationIdToToolName(operationId: string): string {
    if (!operationId) return 'unknownTool';
    
    // Handle PayPal's versioned operation IDs (v1/resource/operation)
    const parts = operationId.split('/');
    
    // For operation IDs in the format "v1/resource/operation"
    if (parts.length >= 3 && parts[0].startsWith('v')) {
      const version = parts[0]; // e.g., "v1"
      const resource = parts[1]; // e.g., "payments"
      const operation = parts[2]; // e.g., "create"
      
      // Convert to camelCase
      const resourceInCamelCase = this.toCamelCase(resource);
      const operationInCamelCase = this.toCamelCase(operation);
      
      // For standard CRUD operations, use common naming patterns
      if (operation === 'create') {
        return `create${this.capitalize(resourceInCamelCase)}`;
      } else if (operation === 'get') {
        return `get${this.capitalize(resourceInCamelCase)}`;
      } else if (operation === 'update') {
        return `update${this.capitalize(resourceInCamelCase)}`;
      } else if (operation === 'delete') {
        return `delete${this.capitalize(resourceInCamelCase)}`;
      } else if (operation === 'list') {
        return `list${this.capitalize(resourceInCamelCase)}s`;
      } else {
        return `${operationInCamelCase}${this.capitalize(resourceInCamelCase)}`;
      }
    }
    
    // For other operation ID formats, convert to camelCase
    return this.toCamelCase(operationId);
  }
  
  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^[A-Z]/, c => c.toLowerCase());
  }
  
  /**
   * Capitalize first letter of string
   */
  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Map OpenAPI parameters to MCP schema
   */
  private mapParametersToSchema(operation: IParsedEndpoint): IMCPSchema {
    const properties: Record<string, IMCPSchema> = {};
    const required: string[] = [];
    
    // Add parameters from URL and query
    for (const param of operation.parameters) {
      if (param.name === 'reference') continue; // Skip reference parameters
      
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
    
    // Add common parameters for specific operations
    if (operation.operationId) {
      const parts = operation.operationId.split('/');
      if (parts.length >= 3) {
        const resource = parts[1];
        const method = parts[2];
        
        // For get/delete/update operations, add the id parameter if not present
        if (['get', 'delete', 'update'].includes(method) && !properties.id) {
          properties.id = {
            type: 'string',
            description: `${resource} ID`
          };
          
          if (!required.includes('id')) {
            required.push('id');
          }
        }
        
        // For list operations, add common pagination parameters
        if (method === 'list') {
          if (!properties.page_size) {
            properties.page_size = {
              type: 'integer',
              description: 'Number of items to return per page',
              default: 10
            };
          }
          
          if (!properties.page) {
            properties.page = {
              type: 'integer',
              description: 'Page number to return',
              default: 1
            };
          }
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
  private mapResponsesToSchema(operation: IParsedEndpoint): IMCPSchema {
    // Get the success response (prefer 200, then 201, then any 2xx)
    const successResponse = operation.responses['200'] || 
                            operation.responses['201'] ||
                            Object.entries(operation.responses)
                                .find(([code]) => code.startsWith('2'))?.[1];
    
    if (!successResponse || !successResponse.content) {
      return {
        type: 'object',
        description: 'PayPal API response'
      };
    }
    
    // Get the content type (prefer application/json)
    const contentType = successResponse.content['application/json'] ? 
      'application/json' : Object.keys(successResponse.content)[0];
    
    if (!contentType || !successResponse.content[contentType]?.schema) {
      return {
        type: 'object',
        description: successResponse.description || 'PayPal API response'
      };
    }
    
    const responseSchema = successResponse.content[contentType].schema;
    
    if (!responseSchema.description) {
      responseSchema.description = successResponse.description || 'PayPal API response';
    }
    
    return responseSchema;
  }
  
  /**
   * Determine tool annotations based on operation
   */
  private determineToolAnnotations(operation: IParsedEndpoint): IMCPToolAnnotations {
    const annotations: IMCPToolAnnotations = {
      title: this.formatToolTitle(operation.operationId)
    };
    
    // Determine if the operation is read-only
    if (operation.method === 'GET') {
      annotations.readOnlyHint = true;
      annotations.destructiveHint = false;
    } else {
      annotations.readOnlyHint = false;
      
      // DELETE operations are always destructive
      if (operation.method === 'DELETE') {
        annotations.destructiveHint = true;
      } else {
        // Check if the operation is destructive based on keywords
        const destructiveKeywords = ['delete', 'remove', 'cancel', 'void'];
        const isDestructive = destructiveKeywords.some(keyword => 
          operation.operationId.toLowerCase().includes(keyword)
        );
        
        annotations.destructiveHint = isDestructive;
      }
    }
    
    // Determine if the operation is idempotent
    annotations.idempotentHint = ['GET', 'PUT', 'DELETE'].includes(operation.method);
    
    // All PayPal operations interact with the PayPal API (open world)
    annotations.openWorldHint = true;
    
    return annotations;
  }
  
  /**
   * Format a tool title from an operation ID
   */
  private formatToolTitle(operationId: string): string {
    if (!operationId) return 'Unknown Tool';
    
    // Handle PayPal's versioned operation IDs (v1/resource/operation)
    const parts = operationId.split('/');
    
    if (parts.length >= 3 && parts[0].startsWith('v')) {
      const resource = parts[1];
      const operation = parts[2];
      
      // Format the resource name (replace underscores with spaces, capitalize words)
      const formattedResource = resource
        .replace(/_/g, ' ')
        .split(' ')
        .map(part => this.capitalize(part))
        .join(' ');
      
      // Format the operation name
      const formattedOperation = this.capitalize(operation);
      
      return `${formattedOperation} ${formattedResource}`;
    }
    
    // For other operation ID formats, split by camelCase and capitalize
    return operationId
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  }
}
