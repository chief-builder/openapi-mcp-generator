/**
 * Stripe parameter mapping utilities
 * 
 * This module provides functions for mapping OpenAPI parameters to MCP schema
 */

import { IParsedEndpoint, IParsedParameter } from '../../core/models/parser-types';
import { IMCPSchema } from '../../core/models/mcp-types';

/**
 * Map Stripe OpenAPI parameters to MCP schema
 * 
 * @param operation OpenAPI operation to map parameters from
 * @returns MCP schema for the operation parameters
 */
export function mapStripeParametersToSchema(operation: IParsedEndpoint): IMCPSchema {
  const properties: Record<string, IMCPSchema> = {};
  const required: string[] = [];
  
  // Add parameters from URL and query
  for (const param of operation.parameters) {
    // Skip reference parameters
    if (param.name === 'reference') continue;
    
    // Map parameter to schema property
    properties[param.name] = {
      ...(param.schema as IMCPSchema || { type: 'string' }),
      description: param.description || `${param.name} parameter`
    };
    
    // Add to required list if necessary
    if (param.required) {
      required.push(param.name);
    }
  }
  
  // Add request body parameters for POST/PUT operations
  if (operation.requestBody && operation.requestBody.content) {
    // Find the appropriate content type (prefer application/json)
    const contentType = operation.requestBody.content['application/json'] ? 
      'application/json' : Object.keys(operation.requestBody.content)[0];
    
    if (contentType && operation.requestBody.content[contentType]?.schema) {
      const bodySchema = operation.requestBody.content[contentType].schema as any;
      
      // If the body has properties, add them to our schema
      if (bodySchema.properties) {
        for (const [name, propSchema] of Object.entries(bodySchema.properties as Record<string, any>)) {
          properties[name] = {
            ...(propSchema as IMCPSchema),
            description: (propSchema as any).description || `${name} parameter`
          };
        }
      }
      
      // Add required properties from the body
      if (bodySchema.required && Array.isArray(bodySchema.required)) {
        required.push(...bodySchema.required);
      }
    }
  }
  
  // Special handling for customer operations
  if (operation.operationId) {
    // If this is a get/delete/update operation, add the id parameter
    if (operation.operationId.includes('retrieve') || 
        operation.operationId.includes('delete') || 
        operation.operationId.includes('update')) {
      
      if (!properties.id) {
        properties.id = {
          type: 'string',
          description: 'Customer ID'
        };
        
        if (!required.includes('id')) {
          required.push('id');
        }
      }
    }
    
    // For list operations, add common filtering parameters
    if (operation.operationId.includes('list')) {
      // Add limit parameter if not already present
      if (!properties.limit) {
        properties.limit = {
          type: 'integer',
          description: 'A limit on the number of objects to be returned',
          minimum: 1,
          maximum: 100
        };
      }
      
      // Add starting_after parameter if not already present
      if (!properties.starting_after) {
        properties.starting_after = {
          type: 'string',
          description: 'A cursor for pagination, starting after this object ID'
        };
      }
      
      // Add ending_before parameter if not already present
      if (!properties.ending_before) {
        properties.ending_before = {
          type: 'string',
          description: 'A cursor for pagination, ending before this object ID'
        };
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
 * Map Stripe OpenAPI responses to MCP schema
 * 
 * @param operation OpenAPI operation to map responses from
 * @returns MCP schema for the operation responses
 */
export function mapStripeResponsesToSchema(operation: IParsedEndpoint): IMCPSchema {
  // Get success response (prefer 200, then 201, then any 2xx)
  const successResponse = operation.responses['200'] || 
                          operation.responses['201'] ||
                          Object.entries(operation.responses)
                              .find(([code]) => code.startsWith('2'))?.[1];
  
  if (!successResponse || !successResponse.content) {
    // Default schema if no proper response found
    return {
      type: 'object',
      description: 'Stripe API response'
    };
  }
  
  // Find the appropriate content type (prefer application/json)
  const contentType = successResponse.content['application/json'] ? 
    'application/json' : Object.keys(successResponse.content)[0];
  
  if (!contentType || !successResponse.content[contentType]?.schema) {
    // Default schema if no schema found
    return {
      type: 'object',
      description: successResponse.description || 'Stripe API response'
    };
  }
  
  // Use the response schema directly
  const responseSchema = successResponse.content[contentType].schema;
  
  // Add description if not present
  if (!responseSchema.description) {
    responseSchema.description = successResponse.description || 'Stripe API response';
  }
  
  return responseSchema;
}

/**
 * Convert operation ID to tool name
 * 
 * @param operationId OpenAPI operation ID
 * @returns MCP tool name in camelCase
 */
export function operationIdToToolName(operationId: string): string {
  if (!operationId) return 'unknownTool';
  
  if (operationId.includes('.')) {
    // Split resource and method
    const [resource, method] = operationId.split('.');
    
    // Handle common method patterns
    if (method === 'create') {
      return `create${capitalizeString(resource)}`;
    }
    
    if (method === 'retrieve' || method === 'get') {
      return `get${capitalizeString(resource)}`;
    }
    
    if (method === 'update') {
      return `update${capitalizeString(resource)}`;
    }
    
    if (method === 'delete' || method === 'del') {
      return `delete${capitalizeString(resource)}`;
    }
    
    if (method === 'list') {
      return `list${capitalizeString(resource)}s`;
    }
    
    // For other methods, combine resource and method
    return `${method}${capitalizeString(resource)}`;
  }
  
  // Handle operation IDs that don't follow resource.method pattern
  // Convert from snake_case or kebab-case to camelCase
  return operationId
    .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^([A-Z])/, (_, letter) => letter.toLowerCase());
}

/**
 * Capitalize a string
 * 
 * @param str String to capitalize
 * @returns Capitalized string
 */
export function capitalizeString(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}