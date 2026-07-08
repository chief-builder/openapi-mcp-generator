/**
 * Generic OpenAPI parser with provider-specific extension points
 */

import * as fs from 'fs-extra';
import { OpenAPIV3 } from 'openapi-types';
import {
  IParsedEndpoint,
  IParsedParameter,
  IParsedRequestBody,
  IParsedResponse,
  IParsedSpec,
  IParserOptions
} from '../models/parser-types';
import { IProvider } from '../models/provider';
import { BaseProvider } from '../models/base-provider';

export class OpenAPIParser {
  private provider: IProvider;
  private options: IParserOptions;

  /**
   * Create a new OpenAPI parser
   * 
   * @param provider Provider implementation for API-specific logic
   * @param options Parser options
   */
  constructor(provider: IProvider, options: IParserOptions = {}) {
    this.provider = provider;
    this.options = options;
  }

  /**
   * Parse an OpenAPI specification from a file
   * 
   * @param specPath Path to the OpenAPI specification file
   * @returns Parsed specification
   */
  public async parseFromFile(specPath: string): Promise<IParsedSpec> {
    try {
      const fileContent = await fs.readFile(specPath, 'utf8');
      let spec: any;
      
      // Determine if JSON or YAML based on file extension
      if (specPath.endsWith('.json')) {
        spec = JSON.parse(fileContent);
      } else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
        // Note: In a real implementation, we would use a YAML parser library
        throw new Error('YAML parsing not implemented. Please use JSON format.');
      } else {
        throw new Error('Unsupported file format. Please use JSON or YAML.');
      }
      
      return this.parse(spec);
    } catch (error) {
      throw new Error(`Failed to parse OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse an OpenAPI specification
   * 
   * @param spec The raw OpenAPI specification
   * @returns Parsed specification
   */
  public parse(spec: any): IParsedSpec {
    // Validate OpenAPI version
    this.validateSpec(spec);

    // If provider has custom parsing logic, use it
    // But use the defaultParse as a fallback if the provider delegates back
    if (this.provider.parseOpenAPISpec !== BaseProvider.prototype.parseOpenAPISpec) {
      return this.provider.parseOpenAPISpec(spec);
    }

    // Use default parsing logic otherwise
    return this.defaultParse(spec);
  }

  /**
   * Default implementation for parsing an OpenAPI specification
   * 
   * @param spec The raw OpenAPI specification
   * @returns Parsed specification
   */
  public defaultParse(spec: any): IParsedSpec {
    // Extract basic info
    const openApiSpec = spec as OpenAPIV3.Document;
    
    // Parse endpoints
    const endpoints = this.parseEndpoints(openApiSpec);
    
    // Filter endpoints if needed
    const filteredEndpoints = this.filterEndpoints(endpoints);
    
    return {
      title: openApiSpec.info.title,
      version: openApiSpec.info.version,
      description: openApiSpec.info.description,
      servers: openApiSpec.servers || [],
      endpoints: filteredEndpoints,
      securitySchemes: this.getSecuritySchemes(openApiSpec),
      components: openApiSpec.components || { schemas: {} }
    };
  }

  /**
   * Filter endpoints based on parser options
   * 
   * @param endpoints Parsed endpoints
   * @returns Filtered endpoints
   */
  private filterEndpoints(endpoints: IParsedEndpoint[]): IParsedEndpoint[] {
    let result = endpoints;
    
    // Filter by included tags
    if (this.options.includeTags && this.options.includeTags.length > 0) {
      result = result.filter(endpoint => 
        endpoint.tags.some(tag => this.options.includeTags!.includes(tag))
      );
    }
    
    // Filter by excluded tags
    if (this.options.excludeTags && this.options.excludeTags.length > 0) {
      result = result.filter(endpoint => 
        !endpoint.tags.some(tag => this.options.excludeTags!.includes(tag))
      );
    }
    
    // Filter by included operations
    if (this.options.includeOperations && this.options.includeOperations.length > 0) {
      result = result.filter(endpoint => 
        this.options.includeOperations!.includes(endpoint.operationId)
      );
    }
    
    // Filter by excluded operations
    if (this.options.excludeOperations && this.options.excludeOperations.length > 0) {
      result = result.filter(endpoint => 
        !this.options.excludeOperations!.includes(endpoint.operationId)
      );
    }
    
    return result;
  }

  /**
   * Parse endpoints from OpenAPI specification
   * 
   * @param spec OpenAPI specification
   * @returns Parsed endpoints
   */
  private parseEndpoints(spec: OpenAPIV3.Document): IParsedEndpoint[] {
    const endpoints: IParsedEndpoint[] = [];
    
    // Iterate through all paths and methods
    Object.entries(spec.paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;
      
      // Skip parameters at path level
      const operations = Object.entries(pathItem).filter(
        ([method]) => !['parameters', '$ref'].includes(method)
      );
      
      // Process each operation (HTTP method) for this path
      operations.forEach(([method, operation]) => {
        if (!this.isHttpMethod(method) || !operation) return;
        
        const operationObj = operation as OpenAPIV3.OperationObject;
        
        // Skip deprecated operations if not included
        if (operationObj.deprecated && !this.options.includeDeprecated) {
          return;
        }
        
        const operationId = operationObj.operationId || `${method}${this.pathToMethodName(path)}`;
        
        // Extract standard fields
        const endpoint: IParsedEndpoint = {
          path,
          method: method.toUpperCase(),
          operationId,
          summary: operationObj.summary || '',
          description: operationObj.description || '',
          parameters: this.parseParameters(operationObj.parameters, pathItem.parameters),
          responses: this.parseResponses(operationObj.responses || {}),
          tags: operationObj.tags || [],
          extensions: this.extractExtensions(operationObj)
        };
        
        // Add request body if present
        if (operationObj.requestBody) {
          endpoint.requestBody = this.parseRequestBody(operationObj.requestBody);
        }
        
        // Add security requirements if present
        if (operationObj.security) {
          endpoint.security = operationObj.security;
        }
        
        endpoints.push(endpoint);
      });
    });
    
    return endpoints;
  }
  
  /**
   * Validate OpenAPI specification
   * 
   * @param spec OpenAPI specification
   */
  private validateSpec(spec: any): void {
    // Check if spec is an object
    if (!spec || typeof spec !== 'object') {
      throw new Error('Invalid OpenAPI specification: not an object');
    }
    
    // Check for openapi version field
    if (!spec.openapi) {
      throw new Error('Invalid OpenAPI specification: missing openapi version');
    }
    
    // Check for info field
    if (!spec.info) {
      throw new Error('Invalid OpenAPI specification: missing info field');
    }
    
    // Check for paths field
    if (!spec.paths) {
      throw new Error('Invalid OpenAPI specification: missing paths field');
    }
    
    // Check openapi version
    const version = spec.openapi.split('.');
    const major = parseInt(version[0], 10);
    
    if (major < 3) {
      throw new Error('Unsupported OpenAPI version: only OpenAPI 3.x is supported');
    }
  }
  
  /**
   * Extract OpenAPI extensions
   *
   * @param obj Object to extract extensions from
   * @param enableCustomExtensions Whether to include custom extensions
   * @returns Object with extensions
   */
  public static extractExtensions(obj: any, enableCustomExtensions: boolean = false): { [key: string]: any } {
    const extensions: { [key: string]: any } = {};

    if (!enableCustomExtensions) {
      return extensions;
    }

    Object.entries(obj).forEach(([key, value]) => {
      if (key.startsWith('x-')) {
        extensions[key] = value;
      }
    });

    return extensions;
  }

  /**
   * Instance method for backward compatibility
   */
  public extractExtensions(obj: any): { [key: string]: any } {
    return OpenAPIParser.extractExtensions(obj, this.options.customExtensions);
  }

  /**
   * Parse parameters from OpenAPI specification
   *
   * @param operationParameters Operation parameters
   * @param pathParameters Path parameters
   * @returns Parsed parameters
   */
  public static parseParameters(
    operationParameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] | undefined,
    pathParameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] | undefined
  ): IParsedParameter[] {
    // Combine path-level and operation-level parameters
    const combinedParams = [
      ...(pathParameters || []),
      ...(operationParameters || [])
    ];

    // Parse each parameter
    return combinedParams.map(param => {
      // Handle reference objects
      if ('$ref' in param) {
        // In a real implementation, we would resolve the reference
        return {
          name: 'reference',
          required: false,
          schema: {},
          in: 'query',
          description: 'Reference parameter (not implemented)'
        };
      }

      const paramObj = param as OpenAPIV3.ParameterObject;

      const parsedParam: IParsedParameter = {
        name: paramObj.name,
        required: paramObj.required || false,
        schema: paramObj.schema || {},
        in: paramObj.in,
      };

      if (paramObj.description) {
        parsedParam.description = paramObj.description;
      }

      return parsedParam;
    });
  }

  /**
   * Instance method for backward compatibility
   */
  public parseParameters(
    operationParameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] | undefined,
    pathParameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] | undefined
  ): IParsedParameter[] {
    return OpenAPIParser.parseParameters(operationParameters, pathParameters);
  }

  /**
   * Parse request body from OpenAPI specification
   *
   * @param requestBody Request body
   * @returns Parsed request body
   */
  public static parseRequestBody(
    requestBody: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject
  ): IParsedRequestBody {
    // Handle reference objects
    if ('$ref' in requestBody) {
      // In a real implementation, we would resolve the reference
      return {
        required: false,
        content: {}
      };
    }

    const requestBodyObj = requestBody as OpenAPIV3.RequestBodyObject;

    return {
      required: requestBodyObj.required || false,
      content: requestBodyObj.content || {}
    };
  }

  /**
   * Instance method for backward compatibility
   */
  public parseRequestBody(
    requestBody: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject
  ): IParsedRequestBody {
    return OpenAPIParser.parseRequestBody(requestBody);
  }

  /**
   * Parse responses from OpenAPI specification
   *
   * @param responses Responses
   * @returns Parsed responses
   */
  public static parseResponses(responses: OpenAPIV3.ResponsesObject): { [statusCode: string]: IParsedResponse } {
    const parsedResponses: { [statusCode: string]: IParsedResponse } = {};

    Object.entries(responses).forEach(([statusCode, response]) => {
      // Handle reference objects
      if ('$ref' in response) {
        // In a real implementation, we would resolve the reference
        parsedResponses[statusCode] = {
          description: 'Reference response (not implemented)'
        };
        return;
      }

      const responseObj = response as OpenAPIV3.ResponseObject;

      parsedResponses[statusCode] = {
        description: responseObj.description || '',
        content: responseObj.content
      };
    });

    return parsedResponses;
  }

  /**
   * Instance method for backward compatibility
   */
  public parseResponses(responses: OpenAPIV3.ResponsesObject): { [statusCode: string]: IParsedResponse } {
    return OpenAPIParser.parseResponses(responses);
  }
  
  /**
   * Get security schemes from OpenAPI specification
   * 
   * @param spec OpenAPI specification
   * @returns Security schemes
   */
  private getSecuritySchemes(spec: OpenAPIV3.Document): Record<string, any> {
    if (!spec.components || !spec.components.securitySchemes) {
      return {};
    }
    
    return spec.components.securitySchemes;
  }
  
  /**
   * Check if a string is a valid HTTP method
   *
   * @param method HTTP method
   * @returns Whether the method is valid
   */
  public static isHttpMethod(method: string): boolean {
    return ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(method.toLowerCase());
  }

  /**
   * Instance method for backward compatibility
   */
  public isHttpMethod(method: string): boolean {
    return OpenAPIParser.isHttpMethod(method);
  }

  /**
   * Convert a path to a method name
   *
   * @param path Path
   * @returns Method name
   */
  public static pathToMethodName(path: string): string {
    return path
      .split('/')
      .filter(Boolean)
      .map(segment => segment.replace(/[^a-zA-Z0-9]/g, ''))
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join('');
  }

  /**
   * Instance method for backward compatibility
   */
  public pathToMethodName(path: string): string {
    return OpenAPIParser.pathToMethodName(path);
  }
}