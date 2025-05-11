/**
 * Handler generator for PayPal API operations
 * 
 * This module provides utilities for generating handler implementations
 * for PayPal API operations.
 */

import { IParsedEndpoint } from '../../core/models/parser-types';
import { IHandlerGenerationOptions } from '../../core/models/generator-types';
import { operationIdToToolName } from './parameter-mapper';
import { IMCPAuthContext } from '../../core/models/mcp-types';

/**
 * Handler generation options specific to PayPal
 */
export interface IPayPalHandlerOptions extends IHandlerGenerationOptions {
  /**
   * Whether to include detailed error handling
   */
  detailedErrors?: boolean;
  
  /**
   * Whether to include type annotations
   */
  includeTypes?: boolean;
  
  /**
   * Default API version to use
   */
  apiVersion?: string;
  
  /**
   * Whether to include pagination handling
   */
  handlePagination?: boolean;
}

/**
 * Generate handler implementation for a PayPal API operation
 * 
 * @param operation Parsed operation
 * @param options Handler generation options
 * @returns Handler implementation code
 */
export function generatePayPalHandler(
  operation: IParsedEndpoint,
  options: IPayPalHandlerOptions = {}
): string {
  // Get handler name from operation ID
  const handlerName = operationIdToToolName(operation.operationId);
  
  // Create parameter type based on options
  const paramType = options.includeTypes ? ': any' : '';
  const returnType = options.includeTypes ? ': any' : '';
  
  // Add comments for the operation
  const comment = `/**
 * Handler for ${operation.operationId}
 * ${operation.description ? '\n * ' + operation.description : ''}
 */`;
  
  // Create basic handler implementation
  const handlerImpl = `${comment}
private async ${handlerName}(params${paramType}, authContext?: IMCPAuthContext)${returnType} {
  const paypal = this.getPayPalClient(authContext);
  
  try {
    // Implementation will be provided by operation-specific generator
    return { success: true, operation: "${operation.operationId}" };
  } catch (error) {
    throw this.transformPayPalError(error);
  }
}`;

  return handlerImpl;
}

/**
 * Extract resource name from an operation ID
 * 
 * @param operationId Operation ID
 * @returns Resource name
 */
export function extractResourceFromOperationId(operationId: string): string {
  if (!operationId) return '';
  
  // Handle versioned operation IDs (v1/resource/method)
  const versionPrefix = /^v\d+\//;
  const cleanOperationId = operationId.replace(versionPrefix, '');
  
  // For resource/method pattern
  if (cleanOperationId.includes('/')) {
    return cleanOperationId.split('/')[0];
  }
  
  // For camelCase pattern (createResource)
  const methodPrefixes = ['create', 'get', 'update', 'delete', 'list'];
  for (const prefix of methodPrefixes) {
    if (cleanOperationId.startsWith(prefix)) {
      // Extract resource name after the prefix with first letter lowercase
      const resourceWithCapital = cleanOperationId.substring(prefix.length);
      return resourceWithCapital.charAt(0).toLowerCase() + resourceWithCapital.slice(1);
    }
  }
  
  return '';
}

/**
 * Extract method name from an operation ID
 * 
 * @param operationId Operation ID
 * @returns Method name
 */
export function extractMethodFromOperationId(operationId: string): string {
  if (!operationId) return '';
  
  // Handle versioned operation IDs (v1/resource/method)
  const versionPrefix = /^v\d+\//;
  const cleanOperationId = operationId.replace(versionPrefix, '');
  
  // For resource/method pattern
  if (cleanOperationId.includes('/')) {
    return cleanOperationId.split('/')[1];
  }
  
  // For camelCase pattern (createResource)
  const methodPrefixes = ['create', 'get', 'update', 'delete', 'list'];
  for (const prefix of methodPrefixes) {
    if (cleanOperationId.startsWith(prefix)) {
      return prefix;
    }
  }
  
  return '';
}