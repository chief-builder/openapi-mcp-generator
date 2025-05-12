/**
 * Integration tests for BaseProvider implementation
 * 
 * Tests the BaseProvider class with different provider implementations
 */

import { OpenAPIParser, BaseProvider, ProviderRegistry } from '../../core';
import { IParsedSpec, IParsedEndpoint } from '../../core/models/parser-types';
import { IMCPTool } from '../../core/models/mcp-types';
import { IAuthProviderConfig, IProviderConfig } from '../../core/models/provider';

/**
 * A minimal test provider implementation using BaseProvider
 */
class TestProvider extends BaseProvider {
  readonly name = 'test-provider';
  readonly version = '1.0.0';
  readonly description = 'Test Provider for Integration Tests';
  
  protected get templatesDir(): string {
    return 'src/test/resources/test-templates';
  }
  
  createAuthProvider(config: IAuthProviderConfig) {
    return {
      code: 'export class TestAuthProvider { authenticate() { return { token: "test-token" }; } }',
      name: 'test-auth-provider',
      type: 'api-key'
    };
  }
  
  generateHandlers(operations: IParsedEndpoint[]) {
    return `
      async function handleTest() {
        return { success: true };
      }
    `;
  }
  
  generateServerImplementation(spec: IParsedSpec, config: IProviderConfig) {
    return `
      export class TestServer {
        constructor() {}
        async start() {}
        async stop() {}
      }
    `;
  }
}

describe('BaseProvider Integration Tests', () => {
  let testProvider: TestProvider;
  let testSpec: IParsedSpec;
  
  beforeEach(() => {
    // Create a test provider
    testProvider = new TestProvider();
    
    // Register it with the provider registry
    ProviderRegistry.registerProvider(testProvider);
    
    // Create a simple test spec
    testSpec = {
      title: 'Test API',
      version: '1.0.0',
      description: 'API for testing',
      servers: [{ url: 'https://api.example.com' }],
      endpoints: [
        {
          path: '/test',
          method: 'GET',
          operationId: 'getTest',
          summary: 'Get a test',
          description: 'Get a test resource',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          tags: [],
          extensions: {}
        },
        {
          path: '/test',
          method: 'POST',
          operationId: 'createTest',
          summary: 'Create a test',
          description: 'Create a new test resource',
          parameters: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' }
                  },
                  required: ['name']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          tags: [],
          extensions: {}
        }
      ],
      securitySchemes: {},
      components: { schemas: {} }
    };
  });
  
  afterEach(() => {
    // Clean up the registry
    ProviderRegistry.removeProvider(testProvider.name);
  });
  
  test('should properly map operations to tools', () => {
    // Test that operations are correctly mapped to MCP tools
    const tools = testProvider.mapOperationsToTools(testSpec.endpoints);
    
    // Check that we have the correct number of tools
    expect(tools).toHaveLength(2);
    
    // Check that the first tool is mapped correctly
    expect(tools[0]).toMatchObject({
      id: 'getTest',
      name: 'getTest',
      description: 'Get a test resource',
      requiresAuth: true
    });
    
    // Check that the second tool is mapped correctly
    expect(tools[1]).toMatchObject({
      id: 'createTest',
      name: 'createTest',
      description: 'Create a new test resource',
      requiresAuth: true
    });
    
    // Check tool annotations
    expect(tools[0].annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    });
    
    expect(tools[1].annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    });
  });
  
  test('should map parameters to schema correctly', () => {
    // Get tools with parameters
    const tools = testProvider.mapOperationsToTools(testSpec.endpoints);
    
    // Check GET parameters
    expect(tools[0].parameters).toMatchObject({
      type: 'object',
      properties: {
        id: { 
          type: 'string',
          description: expect.any(String)
        }
      },
      required: ['id']
    });
    
    // Check POST parameters
    expect(tools[1].parameters).toMatchObject({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: expect.any(String)
        }
      },
      required: ['name']
    });
  });
  
  test('should map responses to schema correctly', () => {
    // Get tools with responses
    const tools = testProvider.mapOperationsToTools(testSpec.endpoints);
    
    // Both should have the same response schema
    const expectedSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' }
      }
    };
    
    // Check GET response
    expect(tools[0].returns).toMatchObject(expectedSchema);
    
    // Check POST response
    expect(tools[1].returns).toMatchObject(expectedSchema);
  });
  
  test('should parse OpenAPI spec correctly', () => {
    // Create a minimal OpenAPI spec
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API Description'
      },
      paths: {
        '/test/{id}': {
          get: {
            operationId: 'getTest',
            summary: 'Get Test',
            description: 'Get a test by ID',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' }
              }
            ],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    // Parse the spec
    const parsedSpec = testProvider.parseOpenAPISpec(openApiSpec);
    
    // Check the parsed spec
    expect(parsedSpec).toMatchObject({
      title: 'Test API',
      version: '1.0.0',
      description: 'Test API Description'
    });
    
    // Check that endpoints were parsed correctly
    expect(parsedSpec.endpoints).toHaveLength(1);
    expect(parsedSpec.endpoints[0]).toMatchObject({
      path: '/test/{id}',
      method: 'GET',
      operationId: 'getTest',
      summary: 'Get Test',
      description: 'Get a test by ID'
    });
  });
  
  test('should work with OpenAPIParser', () => {
    // Create a parser with the test provider
    const parser = new OpenAPIParser(testProvider);
    
    // Create a minimal OpenAPI spec
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/test': {
          get: {
            operationId: 'getTest',
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        }
      }
    };
    
    // Parse the spec
    const parsedSpec = parser.parse(openApiSpec);
    
    // Check the parsed spec
    expect(parsedSpec).toBeDefined();
    expect(parsedSpec.title).toBe('Test API');
    expect(parsedSpec.endpoints).toHaveLength(1);
  });
});