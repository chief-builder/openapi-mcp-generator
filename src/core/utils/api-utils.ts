/**
 * API utility functions for common operations across providers
 */

import { IParsedEndpoint } from '../models/parser-types';
import { IMCPSchema, IMCPToolAnnotations } from '../models/mcp-types';
import * as StringUtils from './string-utils';

/**
 * Utility class for common API operations
 */
export class ApiUtils {
  /**
   * Extract common path parameters from a list of endpoints
   * 
   * @param endpoints List of endpoints to analyze
   * @returns Map of common parameter names to types
   */
  public static extractCommonParameters(endpoints: IParsedEndpoint[]): Map<string, string> {
    const paramCounts = new Map<string, number>();
    const paramTypes = new Map<string, string>();
    
    // Count parameter occurrences
    for (const endpoint of endpoints) {
      for (const param of endpoint.parameters) {
        const count = paramCounts.get(param.name) || 0;
        paramCounts.set(param.name, count + 1);
        
        // Track parameter type (use the first occurrence for simplicity)
        if (!paramTypes.has(param.name)) {
          paramTypes.set(param.name, this.getParameterType(param.schema));
        }
      }
    }
    
    // Keep parameters that appear in multiple endpoints
    const commonParams = new Map<string, string>();
    paramCounts.forEach((count, name) => {
      if (count > 1) {
        commonParams.set(name, paramTypes.get(name) || 'string');
      }
    });
    
    return commonParams;
  }
  
  /**
   * Get a simplified type for a parameter schema
   * 
   * @param schema Parameter schema
   * @returns Simplified type string
   */
  private static getParameterType(schema: any): string {
    if (!schema) return 'string';
    
    switch (schema.type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      case 'string':
      default:
        return 'string';
    }
  }
  
  /**
   * Normalize a path for consistent URL construction
   * Ensures no double slashes and proper leading/trailing slashes
   * 
   * @param path Path to normalize
   * @returns Normalized path
   */
  public static normalizePath(path: string): string {
    if (!path) return '/';
    
    // Remove leading/trailing whitespace
    let normalizedPath = path.trim();
    
    // Ensure leading slash
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }
    
    // Remove trailing slash if present (except for root path)
    if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    
    // Replace multiple slashes with a single slash
    normalizedPath = normalizedPath.replace(/\/+/g, '/');
    
    return normalizedPath;
  }
  
  /**
   * Determine operation category from endpoint path and method
   * 
   * @param path API path
   * @param method HTTP method
   * @returns Operation category (create, read, update, delete, list, action)
   */
  public static determineOperationCategory(path: string, method: string): string {
    const upperMethod = method.toUpperCase();
    
    // Check if it's an ID path pattern (e.g., /resources/{id})
    const isIdPath = path.includes('{') && path.includes('}');
    
    switch (upperMethod) {
      case 'GET':
        return isIdPath ? 'read' : 'list';
      case 'POST':
        return isIdPath ? 'action' : 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'action';
    }
  }
  
  /**
   * Extract resource name from path
   * 
   * @param path API path
   * @returns Resource name
   */
  public static extractResourceName(path: string): string {
    if (!path) return '';
    
    // Split path by segments
    const segments = path.split('/').filter(Boolean);
    
    // Empty path
    if (segments.length === 0) return '';
    
    // Get the first segment that doesn't contain template parameters
    for (const segment of segments) {
      if (!segment.includes('{') && !segment.includes('}')) {
        return segment;
      }
    }
    
    // If no suitable segment found, use the first one and strip any template chars
    return segments[0].replace(/[{}]/g, '');
  }
  
  /**
   * Generate a readable tool description from operation details
   * 
   * @param operation API operation
   * @returns Human-readable description
   */
  public static generateToolDescription(operation: IParsedEndpoint): string {
    if (operation.description) return operation.description;
    if (operation.summary) return operation.summary;
    
    const category = this.determineOperationCategory(operation.path, operation.method);
    const resource = this.extractResourceName(operation.path);
    
    const capitalizedResource = StringUtils.capitalize(resource);
    const singularResource = StringUtils.singularize(capitalizedResource);
    
    switch (category) {
      case 'create':
        return `Create a new ${singularResource}`;
      case 'read':
        return `Retrieve a specific ${singularResource} by ID`;
      case 'update':
        return `Update an existing ${singularResource}`;
      case 'delete':
        return `Delete a ${singularResource}`;
      case 'list':
        return `List ${StringUtils.pluralize(resource.toLowerCase())}`;
      case 'action':
        const actionName = operation.operationId.split('/').pop() || '';
        return `Perform ${actionName} operation on a ${singularResource}`;
      default:
        return `${StringUtils.capitalize(operation.method.toLowerCase())} ${singularResource}`;
    }
  }
  
  /**
   * Determine tool annotations based on operation
   * 
   * @param operation API operation
   * @returns Tool annotations
   */
  public static determineToolAnnotations(operation: IParsedEndpoint): IMCPToolAnnotations {
    const annotations: IMCPToolAnnotations = {
      title: StringUtils.formatAsTitle(operation.operationId)
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
    
    // All API operations interact with external API (open world)
    annotations.openWorldHint = true;
    
    return annotations;
  }
  
  /**
   * Format a response schema to be more user-friendly
   * 
   * @param schema Response schema
   * @param defaultDescription Default description to use if none provided
   * @returns Formatted schema with improved descriptions
   */
  public static formatResponseSchema(schema: IMCPSchema | null, defaultDescription: string): IMCPSchema {
    if (!schema) {
      return {
        type: 'object',
        description: defaultDescription
      };
    }

    // Clone the schema to avoid modifying the original
    const formattedSchema = { ...schema };

    // Add a description if missing
    if (!formattedSchema.description) {
      formattedSchema.description = defaultDescription;
    }

    return formattedSchema;
  }
  
  /**
   * Convert API path parameters to JavaScript interpolation string
   * 
   * @param path API path with {param} style parameters
   * @returns Path with ${param} style parameters
   */
  public static convertPathToTemplate(path: string): string {
    if (!path) return '';
    
    // Convert {param} to ${param}
    return path.replace(/{([^}]+)}/g, (_, name) => `\${${name}}`);
  }
  
  /**
   * Extract filename from URL path
   * 
   * @param url URL to parse
   * @returns Filename
   */
  public static getFilenameFromUrl(url: string): string {
    if (!url) return '';
    
    // Remove any query parameters
    const cleanUrl = url.split('?')[0];
    
    // Split by path separators and take the last segment
    const segments = cleanUrl.split('/');
    return segments[segments.length - 1] || '';
  }
}