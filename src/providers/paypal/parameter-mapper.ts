/**
 * PayPal parameter mapping utilities
 * 
 * This module provides functions for mapping OpenAPI parameters to MCP schema
 */

import { IParsedEndpoint, IParsedParameter } from '../../core/models/parser-types';
import { IMCPSchema, IMCPToolAnnotations } from '../../core/models/mcp-types';

/**
 * Map PayPal OpenAPI parameters to MCP schema
 * 
 * @param operation OpenAPI operation to map parameters from
 * @returns MCP schema for the operation parameters
 */
export function mapPayPalParametersToSchema(operation: IParsedEndpoint): IMCPSchema {
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
  
  // Special handling for resource-specific operations
  if (operation.operationId) {
    // Common patterns like create, get, update, delete, list
    const operationPattern = /^(v\d+\/)?([a-zA-Z_-]+)\/([a-zA-Z_-]+)$/;
    const match = operation.operationId.match(operationPattern);
    
    if (match) {
      const resource = match[2];
      const method = match[3];
      
      // For get/delete/update operations, add the id parameter
      if (method === 'get' || method === 'delete' || method === 'update') {
        if (!properties.id) {
          properties.id = {
            type: 'string',
            description: `${resource} ID`
          };
          
          if (!required.includes('id')) {
            required.push('id');
          }
        }
      }
      
      // For list operations, add common filtering parameters
      if (method === 'list') {
        // Add page parameter if not already present
        if (!properties.page) {
          properties.page = {
            type: 'integer',
            description: 'Page number for pagination',
            minimum: 1,
            default: 1
          };
        }
        
        // Add page_size parameter if not already present
        if (!properties.page_size) {
          properties.page_size = {
            type: 'integer',
            description: 'Number of items per page',
            minimum: 1,
            maximum: 100,
            default: 20
          };
        }
        
        // Add sort_by parameter if not already present
        if (!properties.sort_by) {
          properties.sort_by = {
            type: 'string',
            description: 'Property to sort by'
          };
        }
        
        // Add sort_order parameter if not already present
        if (!properties.sort_order) {
          properties.sort_order = {
            type: 'string',
            description: 'Sort order (asc or desc)',
            enum: ['asc', 'desc'],
            default: 'desc'
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
 * Map PayPal OpenAPI responses to MCP schema
 * 
 * @param operation OpenAPI operation to map responses from
 * @returns MCP schema for the operation responses
 */
export function mapPayPalResponsesToSchema(operation: IParsedEndpoint): IMCPSchema {
  // Get success response (prefer 200, then 201, then any 2xx)
  const successResponse = operation.responses['200'] || 
                          operation.responses['201'] ||
                          Object.entries(operation.responses)
                              .find(([code]) => code.startsWith('2'))?.[1];
  
  if (!successResponse || !successResponse.content) {
    // Default schema if no proper response found
    return {
      type: 'object',
      description: 'PayPal API response'
    };
  }
  
  // Find the appropriate content type (prefer application/json)
  const contentType = successResponse.content['application/json'] ? 
    'application/json' : Object.keys(successResponse.content)[0];
  
  if (!contentType || !successResponse.content[contentType]?.schema) {
    // Default schema if no schema found
    return {
      type: 'object',
      description: successResponse.description || 'PayPal API response'
    };
  }
  
  // Use the response schema directly
  const responseSchema = successResponse.content[contentType].schema;
  
  // Add description if not present
  if (!responseSchema.description) {
    responseSchema.description = successResponse.description || 'PayPal API response';
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
  
  // Handle v1/v2 versioning in operation IDs
  const versionPrefix = /^v\d+\//;
  const cleanOperationId = operationId.replace(versionPrefix, '');
  
  // Handle resource/method pattern
  const parts = cleanOperationId.split('/');
  if (parts.length === 2) {
    const [resource, method] = parts;
    
    // Handle common method patterns
    if (method === 'create') {
      return `create${capitalizeString(resource)}`;
    }
    
    if (method === 'get') {
      return `get${capitalizeString(resource)}`;
    }
    
    if (method === 'update') {
      return `update${capitalizeString(resource)}`;
    }
    
    if (method === 'delete') {
      return `delete${capitalizeString(resource)}`;
    }
    
    if (method === 'list') {
      return `list${capitalizeString(resource)}s`;
    }
    
    // For other methods, combine resource and method
    return `${method}${capitalizeString(resource)}`;
  }
  
  // Handle operation IDs that don't follow resource/method pattern
  // Convert from snake_case or kebab-case to camelCase
  return cleanOperationId
    .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^([A-Z])/, (_, letter) => letter.toLowerCase());
}

/**
 * Determine tool annotations based on operation attributes
 */
export function determineToolAnnotations(operation: IParsedEndpoint): IMCPToolAnnotations {
  const annotations: IMCPToolAnnotations = {
    title: formatToolTitle(operation.operationId)
  };
  
  // Determine if the operation is read-only based on the HTTP method
  if (operation.method === 'GET') {
    annotations.readOnlyHint = true;
    annotations.destructiveHint = false;
  } else {
    annotations.readOnlyHint = false;
    
    // DELETE operations are always destructive
    if (operation.method === 'DELETE') {
      annotations.destructiveHint = true;
    } 
    // POST, PUT operations might be destructive, but some are not
    else if (operation.method === 'POST' || operation.method === 'PUT') {
      // Check if this is a destructive operation
      const isDestructive = isDestructiveOperation(operation);
      annotations.destructiveHint = isDestructive;
    } else {
      annotations.destructiveHint = false;
    }
  }
  
  // Determine idempotency based on operation attributes
  annotations.idempotentHint = isIdempotentOperation(operation);
  
  // Most PayPal operations interact with the PayPal API (open world)
  annotations.openWorldHint = true;
  
  return annotations;
}

/**
 * Format a tool title from an operationId
 */
function formatToolTitle(operationId: string): string {
  if (!operationId) return 'Unknown Tool';
  
  // Remove version prefix if present
  const cleanOperationId = operationId.replace(/^v\d+\//, '');
  
  // For operations like "payments/create", convert to "Create Payment"
  if (cleanOperationId.includes('/')) {
    const [resource, action] = cleanOperationId.split('/');
    
    // Handle resources with underscores by replacing them with spaces
    const formattedResource = resource
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ')
      .map(part => capitalizeString(part))
      .join(' ');
    
    return capitalizeString(action) + ' ' + singularize(formattedResource);
  }
  
  // For operations like "createPayment", convert to "Create Payment"
  return cleanOperationId
    .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
    .replace(/^./, s => s.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Determine if an operation is destructive
 */
function isDestructiveOperation(operation: IParsedEndpoint): boolean {
  const method = operation.method.toUpperCase();
  
  // DELETE operations are always destructive
  if (method === 'DELETE') {
    return true;
  }
  
  // Check if operation contains destructive keywords
  const destructiveKeywords = ['delete', 'remove', 'cancel', 'void', 'expire'];
  const hasDestructiveKeyword = destructiveKeywords.some(keyword => 
    operation.operationId.toLowerCase().includes(keyword)
  );
  
  if (hasDestructiveKeyword) {
    return true;
  }
  
  // Most POST operations in PayPal aren't destructive, just creating or updating
  return false;
}

/**
 * Determine if an operation is idempotent
 */
function isIdempotentOperation(operation: IParsedEndpoint): boolean {
  const method = operation.method.toUpperCase();
  
  // GET, PUT operations are generally idempotent
  if (method === 'GET' || method === 'PUT') {
    return true;
  }
  
  // DELETE might be idempotent if deleting the same resource twice has no effect
  if (method === 'DELETE') {
    return true;
  }
  
  // Check specifically for idempotent POST operations in PayPal
  if (method === 'POST') {
    // PayPal's update operations are idempotent
    if (operation.operationId.includes('update')) {
      return true;
    }
    
    // Some specific PayPal operations are idempotent with idempotency keys
    return false;
  }
  
  return false;
}

/**
 * Helper function to convert a plural to singular
 */
function singularize(word: string): string {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  } else if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
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