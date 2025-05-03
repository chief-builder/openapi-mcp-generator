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
  MCPCapabilityType
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
  readonly description = 'Stripe API provider for MCP generator';
  
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
   * Create an authentication provider for Stripe API
   * 
   * @param config Authentication configuration
   * @returns Authentication provider code and metadata
   */
  createAuthProvider(config: IAuthProviderConfig): {
    code: string;
    name: string;
    type: string;
  } {
    // Read the template synchronously
    const templatePath = path.join(__dirname, 'templates', 'auth-provider.ts.template');
    const code = fs.readFileSync(templatePath, 'utf8');

    return {
      code,
      name: 'stripe-auth-provider',
      type: 'stripe-api-key'
    };
  }

  /**
   * Categorize endpoints by resource type
   * 
   * @param endpoints List of parsed endpoints
   * @returns Map of resource names to endpoints
   */
  private categorizeEndpointsByResource(endpoints: IParsedEndpoint[]): Map<string, IParsedEndpoint[]> {
    const resourceMap = new Map<string, IParsedEndpoint[]>();
    
    // Known top-level Stripe resources
    const knownResources = new Set([
      'accounts', 'applications', 'balance', 'charges', 'checkout', 'coupons',
      'customers', 'disputes', 'events', 'files', 'invoices', 'issuing',
      'mandates', 'payment_intents', 'payment_links', 'payment_methods',
      'payouts', 'plans', 'prices', 'products', 'refunds', 'setup_intents',
      'subscriptions', 'tax', 'tokens', 'transfers'
    ]);
    
    for (const endpoint of endpoints) {
      let resource = this.extractResourceFromEndpoint(endpoint);
      
      // Normalize resource name - convert camelCase or PascalCase to snake_case
      resource = resource
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toLowerCase();
      
      // Check if this is a known Stripe resource or a sub-resource
      let primaryResource = resource;
      if (!knownResources.has(resource)) {
        // Try to find a known parent resource
        for (const knownResource of knownResources) {
          if (resource.startsWith(knownResource + '_') || 
              resource.endsWith('_' + knownResource)) {
            primaryResource = knownResource;
            break;
          }
        }
      }
      
      // If still not categorized, put in 'other'
      if (!primaryResource) {
        primaryResource = 'other';
      }
      
      // Add to the resource map
      if (!resourceMap.has(primaryResource)) {
        resourceMap.set(primaryResource, []);
      }
      
      resourceMap.get(primaryResource)?.push(endpoint);
    }
    
    return resourceMap;
  }
  
  /**
   * Extract resource name from an endpoint
   * 
   * @param endpoint Parsed endpoint
   * @returns Resource name
   */
  private extractResourceFromEndpoint(endpoint: IParsedEndpoint): string {
    // First, try to extract from operationId in the format "resource.operation"
    if (endpoint.operationId && endpoint.operationId.includes('.')) {
      return endpoint.operationId.split('.')[0];
    }
    
    // Next, try to extract from the path
    if (endpoint.path) {
      // Remove any API version prefix and extract path components
      const pathWithoutVersion = endpoint.path.replace(/^\/v\d+\//, '/');
      const parts = pathWithoutVersion.split('/').filter(Boolean);
      
      if (parts.length > 0) {
        // The first path component is usually the resource
        return parts[0];
      }
    }
    
    // If no resource could be identified, use tags if available
    if (endpoint.tags && endpoint.tags.length > 0) {
      return endpoint.tags[0];
    }
    
    // If still no resource identified, fallback to "other"
    return 'other';
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
   * Generate handlers for operations
   * 
   * @param operations List of parsed endpoints
   * @param options Options for handler generation
   * @returns Generated code for handlers
   */
  generateHandlers(operations: IParsedEndpoint[], options: IHandlerGenerationOptions): string {
    // Group operations by resource
    const resourceMap = this.categorizeEndpointsByResource(operations);
    
    const handlerMethods: string[] = [];
    
    // Generate handler methods for each resource
    for (const [resource, endpoints] of resourceMap.entries()) {
      for (const endpoint of endpoints) {
        const operationName = this.getOperationName(endpoint);
        const methodName = operationIdToToolName(endpoint.operationId);
        
        const handler = this.generateOperationHandler(resource, endpoint, operationName, methodName);
        handlerMethods.push(handler);
      }
    }
    
    // Add helper methods
    const helperMethods = this.generateHelperMethods();
    
    return handlerMethods.join('\n\n') + '\n\n' + helperMethods;
  }
  
  private getOperationName(endpoint: IParsedEndpoint): string {
    if (endpoint.operationId && endpoint.operationId.includes('.')) {
      return endpoint.operationId.split('.')[1];
    }
    
    return endpoint.method.toLowerCase();
  }
  
  private generateOperationHandler(
    resource: string, 
    endpoint: IParsedEndpoint, 
    operation: string, 
    methodName: string
  ): string {
    // Skip if resource or operation is empty
    if (!resource || !operation) {
      return '';
    }
    
    // Load the operation handler template
    const handlerTemplatePath = path.join(__dirname, 'templates', 'operation-handler.ts.template');
    let handlerTemplate = fs.readFileSync(handlerTemplatePath, 'utf8');
    
    // Determine which operation-specific template to use
    let operationCode = '';
    let operationTemplatePath = '';
    
    switch (operation) {
      case 'create':
        operationTemplatePath = path.join(__dirname, 'templates', 'operations', 'create.ts.template');
        break;
      case 'retrieve':
      case 'get':
        operationTemplatePath = path.join(__dirname, 'templates', 'operations', 'retrieve.ts.template');
        break;
      case 'update':
        operationTemplatePath = path.join(__dirname, 'templates', 'operations', 'update.ts.template');
        break;
      case 'delete':
      case 'del':
        operationTemplatePath = path.join(__dirname, 'templates', 'operations', 'delete.ts.template');
        break;
      case 'list':
        operationTemplatePath = path.join(__dirname, 'templates', 'operations', 'list.ts.template');
        break;
      default:
        operationTemplatePath = path.join(__dirname, 'templates', 'operations', 'default.ts.template');
    }
    
    // Load the operation-specific template
    let operationTemplate = fs.readFileSync(operationTemplatePath, 'utf8');
    
    // Replace variables in the operation template
    operationCode = operationTemplate
      .replace(/\${resource}/g, resource)
      .replace(/\${operation}/g, operation);
    
    // Replace variables in the handler template
    const code = handlerTemplate
      .replace(/\${description}/g, endpoint.description || endpoint.summary || `${methodName} operation`)
      .replace(/\${methodName}/g, methodName)
      .replace(/\${operationCode}/g, operationCode);
    
    return code;
  }
  
  private generateHelperMethods(): string {
    const helperTemplatePath = path.join(__dirname, 'templates', 'helper-methods.ts.template');
    return fs.readFileSync(helperTemplatePath, 'utf8');
  }
  
  private generateToolsListHandler(endpoints: IParsedEndpoint[]): string {
    const tools = this.mapOperationsToTools(endpoints);
    const toolsJson = JSON.stringify(tools, null, 2);
    
    const templatePath = path.join(__dirname, 'templates', 'tools-list-handler.ts.template');
    let template = fs.readFileSync(templatePath, 'utf8');
    
    return template.replace('${toolsJson}', toolsJson);
  }

private generateToolCallHandler(operations: IParsedEndpoint[]): string {
  const templatePath = path.join(__dirname, 'templates', 'tool-call-handler.ts.template');
  return fs.readFileSync(templatePath, 'utf8');
}
  
/**
 * Generate server implementation
 * 
 * @param spec Parsed OpenAPI specification
 * @param config Provider configuration
 * @returns Generated code for server implementation
 */
generateServerImplementation(spec: IParsedSpec, config: IProviderConfig): string {
  // Get server class name
  const serverClassName = this.formatServerClassName(config.name || 'stripe-mcp');
  
  // Generate handler methods for operations
  const handlers = this.generateHandlers(spec.endpoints, {});
  
  // Generate tool call handler
  const toolCallHandler = this.generateToolCallHandler(spec.endpoints);
  
  // Generate tools list handler
  const toolsListHandler = this.generateToolsListHandler(spec.endpoints);
  
  // Load the server implementation template
  const templatePath = path.join(__dirname, 'templates', 'server-implementation.ts.template');
  let serverTemplate = fs.readFileSync(templatePath, 'utf8');
  
  // Replace variables in the server template
  return serverTemplate
    .replace(/\${serverName}/g, config.name || 'Stripe API')
    .replace(/\${serverVersion}/g, config.version || '1.0.0')
    .replace(/\${serverDescription}/g, config.description || 'Stripe API MCP Server')
    .replace(/\${serverClassName}/g, serverClassName)
    .replace(/\${toolsListHandlerPlaceholder}/g, toolsListHandler)
    .replace(/\${toolCallHandlerPlaceholder}/g, toolCallHandler)
    .replace(/\${handlersPlaceholder}/g, handlers);
}
  
/**
 * Generate additional files needed for the server
 * 
 * @param spec Parsed OpenAPI specification
 * @param config Provider configuration
 * @returns Map of filenames to file contents
 */
generateAdditionalFiles(spec: IParsedSpec, config: IProviderConfig): Map<string, string> {
  const files = new Map<string, string>();
  
  // Load the Stripe types template
  const stripeTypesPath = path.join(__dirname, 'templates', 'stripe-types.ts.template');
  const stripeTypesContent = fs.readFileSync(stripeTypesPath, 'utf8');
  
  files.set('src/stripe-types.ts', stripeTypesContent);
  
  // Generate package.json additions for Stripe
  const packageAdditions = {
    dependencies: {
      'stripe': '^12.16.0'
    }
  };
  
  files.set('package.json.additions', JSON.stringify(packageAdditions, null, 2));
  
  return files;
}

/**
 * Format server class name according to naming conventions
 */
private formatServerClassName(name: string): string {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') + 'Server';
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
 */
private extractExtensions(obj: any): Record<string, any> {
  const extensions: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('x-')) {
      extensions[key] = value;
    }
  }
  
  return extensions;
}

/**
 * Parse parameters from OpenAPI spec
 */
private parseParameters(operationParams: any[] = [], pathParams: any[] = []): any[] {
  // Combine path and operation parameters
  const params = [...(pathParams || []), ...(operationParams || [])];
  
  // Process each parameter
  return params.map(param => {
    if ('$ref' in param) {
      // Handle references (simplified)
      return {
        name: 'reference',
        required: false,
        schema: {},
        in: 'query'
      };
    }
    
    return {
      name: param.name,
      required: param.required || false,
      schema: param.schema || {},
      in: param.in,
      description: param.description
    };
  });
}

/**
 * Parse request body from OpenAPI spec
 */
private parseRequestBody(requestBody: any): any {
  if ('$ref' in requestBody) {
    // Handle references (simplified)
    return {
      required: false,
      content: {}
    };
  }
  
  return {
    required: requestBody.required || false,
    content: requestBody.content || {}
  };
}

/**
 * Parse responses from OpenAPI spec
 */
private parseResponses(responses: any): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [statusCode, responseObj] of Object.entries(responses)) {
    const response = responseObj as any;
    
    if (response && '$ref' in response) {
      // Handle references (simplified)
      result[statusCode] = {
        description: 'Reference'
      };
      continue;
    }
    
    result[statusCode] = {
      description: response && response.description ? response.description : '',
      content: response && response.content ? response.content : undefined
    };
  }
  
  return result;
}
}