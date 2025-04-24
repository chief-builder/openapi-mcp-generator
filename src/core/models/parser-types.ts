/**
 * Types for OpenAPI specification parsing
 */

/**
 * Parsed parameter from OpenAPI spec
 */
export interface IParsedParameter {
  name: string;
  required: boolean;
  schema: any;
  in: string;
  description?: string;
}

/**
 * Parsed request body from OpenAPI spec
 */
export interface IParsedRequestBody {
  required: boolean;
  content: {
    [contentType: string]: {
      schema?: any;
      [key: string]: any;
    };
  };
}

/**
 * Parsed response from OpenAPI spec
 */
export interface IParsedResponse {
  description: string;
  content?: {
    [contentType: string]: {
      schema?: any;
      [key: string]: any;
    };
  };
}

/**
 * Parsed endpoint from OpenAPI spec
 */
export interface IParsedEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary: string;
  description: string;
  parameters: IParsedParameter[];
  requestBody?: IParsedRequestBody;
  responses: {
    [statusCode: string]: IParsedResponse;
  };
  tags: string[];
  security?: any[];
  extensions: {
    [key: string]: any;
  };
}

/**
 * Complete parsed OpenAPI spec
 */
export interface IParsedSpec {
  title: string;
  version: string;
  description?: string;
  servers: Array<{url: string}>;
  endpoints: IParsedEndpoint[];
  securitySchemes: Record<string, any>;
  components: {
    schemas?: Record<string, any>;
    [key: string]: any;
  };
}

/**
 * Parser options
 */
export interface IParserOptions {
  /**
   * Whether to include deprecated operations
   */
  includeDeprecated?: boolean;
  
  /**
   * Tags to include in parsing
   */
  includeTags?: string[];
  
  /**
   * Tags to exclude in parsing
   */
  excludeTags?: string[];
  
  /**
   * Operations to include by ID
   */
  includeOperations?: string[];
  
  /**
   * Operations to exclude by ID
   */
  excludeOperations?: string[];
  
  /**
   * Whether to include custom extensions
   */
  customExtensions?: boolean;
}