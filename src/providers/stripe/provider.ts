/**
 * Stripe API provider implementation
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { OpenAPIV3 } from 'openapi-types';
import { 
  IProvider, 
  IParsedSpec, 
  IParsedEndpoint,
  IMCPTool, 
  IAuthProviderConfig, 
  IProviderConfig,
  MCPCapabilityType,
  OpenAPIParser
} from '../../core';
import { IHandlerGenerationOptions } from '../../core/models/generator-types';
import {
  mapStripeParametersToSchema,
  mapStripeResponsesToSchema,
  operationIdToToolName,
  determineToolAnnotations,
} from './parameter-mapper';

/**
 * Implementation of the Stripe API provider
 */
export class StripeProvider implements IProvider {
  readonly name = 'stripe';
  readonly version = '1.0.0';
  readonly description = 'Experimental Stripe provider (incomplete OpenAPI request encoding support)';
  
  /**
   * Parse an OpenAPI specification with Stripe-specific logic
   * 
   * @param spec The raw OpenAPI specification
   * @returns Parsed specification with Stripe-specific processing
   */
  parseOpenAPISpec(spec: any): IParsedSpec {
    
    // Extract basic info
    const parsedSpec: IParsedSpec = {
      title: spec.info?.title || 'Stripe API',
      version: spec.info?.version || '1.0.0',
      description: spec.info?.description || 'Stripe API',
      servers: spec.servers || [],
      endpoints: [],
      securitySchemes: spec.components?.securitySchemes || {},
      components: {
        schemas: spec.components?.schemas || {}
      }
    };
    
    // Parse all paths, not just customer endpoints
    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        if (!pathItem) continue;
        
        for (const [method, operationObj] of Object.entries(pathItem as any)) {
          if (method === '$ref' || method === 'parameters' || !operationObj) continue;
          if (!this.isHttpMethod(method)) continue;
          
          const operation = operationObj as any;
          if (operation.deprecated) continue;
          
          // Create a parsed endpoint
          const endpoint: IParsedEndpoint = {
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId || `${method}${this.pathToMethodName(path)}`,
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
    
    return parsedSpec;
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
      const toolName = operationIdToToolName(operation.operationId);
      
      const tool: IMCPTool = {
        id: toolName,
        type: MCPCapabilityType.Tool,
        name: toolName,
        description: operation.description || operation.summary,
        parameters: mapStripeParametersToSchema(operation),
        returns: mapStripeResponsesToSchema(operation),
        requiresAuth: true,
        annotations: determineToolAnnotations(operation),
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
   * Check if method is a valid HTTP method
   */
  private isHttpMethod(method: string): boolean {
  return ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase());
}

/**
 * Convert path to method name
 */
private pathToMethodName(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Extract extensions from object
 * Uses the shared parser implementation
 */
private extractExtensions(obj: any): Record<string, any> {
  // Create a parser instance just for using its utility methods
  // Enable customExtensions option to ensure we get all x- prefixed properties
  const parser = new OpenAPIParser(this, { customExtensions: true });
  return parser.extractExtensions(obj);
}

/**
 * Parse parameters from OpenAPI spec
 * Uses the shared parser implementation
 */
private parseParameters(operationParams: any[] = [], pathParams: any[] = []): any[] {
  // Create a parser instance just for using its utility methods
  const parser = new OpenAPIParser(this, {});
  return parser.parseParameters(operationParams, pathParams);
}

/**
 * Parse request body from OpenAPI spec
 * Uses the shared parser implementation
 */
private parseRequestBody(requestBody: any): any {
  // Create a parser instance just for using its utility methods
  const parser = new OpenAPIParser(this, {});
  return parser.parseRequestBody(requestBody);
}

/**
 * Parse responses from OpenAPI spec
 * Uses the shared parser implementation
 */
private parseResponses(responses: any): Record<string, any> {
  // Create a parser instance just for using its utility methods
  const parser = new OpenAPIParser(this, {});
  return parser.parseResponses(responses);
}
}
