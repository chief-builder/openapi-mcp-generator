import { OpenAPIParser } from '../core/parser/openapi-parser';
import { IProvider } from '../core/models/provider';
// No changes needed

// Create a more sophisticated mock provider
const createMockProvider = (overrides = {}): IProvider => ({
  name: 'mock',
  version: '1.0.0',
  description: 'Mock provider for testing',
  
  parseOpenAPISpec: jest.fn((spec) => {
    // By default, use the defaultParse method of OpenAPIParser
    const parser = new OpenAPIParser({} as IProvider);
    return (parser as any).defaultParse(spec);
  }),
  
  createAuthProvider: jest.fn(() => ({
    code: 'mock code',
    name: 'mock-auth',
    type: 'mock'
  })),
  
  mapOperationsToTools: jest.fn(() => []),
  
  generateHandlers: jest.fn(() => ''),
  
  generateServerImplementation: jest.fn(() => ''),
  
  ...overrides
});

// Create a sample OpenAPI spec for testing
const createSampleSpec = () => ({
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
    description: 'API for testing'
  },
  servers: [
    { url: 'https://api.example.com/v1' }
  ],
  paths: {
    '/customers': {
      get: {
        operationId: 'listCustomers',
        summary: 'List customers',
        description: 'Get a list of customers',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10 }
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
                    data: {
                      type: 'array',
                      items: { 
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
        },
        tags: ['Customers']
      },
      post: {
        operationId: 'createCustomer',
        summary: 'Create customer',
        description: 'Create a new customer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' }
                }
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
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        tags: ['Customers']
      }
    },
    '/customers/{customerId}': {
      get: {
        operationId: 'getCustomer',
        summary: 'Get customer',
        description: 'Get a customer by ID',
        parameters: [
          {
            name: 'customerId',
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
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Customer not found'
          }
        },
        tags: ['Customers']
      },
      put: {
        operationId: 'updateCustomer',
        summary: 'Update customer',
        description: 'Update a customer',
        parameters: [
          {
            name: 'customerId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        tags: ['Customers']
      },
      delete: {
        operationId: 'deleteCustomer',
        summary: 'Delete customer',
        description: 'Delete a customer',
        parameters: [
          {
            name: 'customerId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '204': {
            description: 'No content'
          }
        },
        tags: ['Customers']
      }
    }
  },
  components: {
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization'
      }
    },
    schemas: {
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' }
        }
      }
    }
  }
});

describe('OpenAPIParser', () => {
  describe('Basic functionality', () => {
    test('creates an instance with the provided provider', () => {
      const provider = createMockProvider();
      const parser = new OpenAPIParser(provider);
      expect(parser).toBeDefined();
    });
    
    test('parses an OpenAPI spec directly', () => {
      const provider = createMockProvider();
      const parser = new OpenAPIParser(provider);
      const spec = createSampleSpec();
      
      const parsedSpec = parser.parse(spec);
      
      expect(parsedSpec).toBeDefined();
      expect(parsedSpec.title).toBe('Test API');
      expect(parsedSpec.version).toBe('1.0.0');
      expect(provider.parseOpenAPISpec).toHaveBeenCalled();
    });
  });
  
  describe('defaultParse implementation', () => {
    test('parses basic info correctly', () => {
      // Create a parser with a provider that will use the defaultParse method
      const provider = createMockProvider({
        parseOpenAPISpec: jest.fn(spec => {
          const parser = new OpenAPIParser({} as IProvider);
          return (parser as any).defaultParse(spec);
        })
      });
      
      const parser = new OpenAPIParser(provider);
      const spec = createSampleSpec();
      
      const parsedSpec = parser.parse(spec);
      
      expect(parsedSpec.title).toBe('Test API');
      expect(parsedSpec.version).toBe('1.0.0');
      expect(parsedSpec.description).toBe('API for testing');
      expect(parsedSpec.servers).toHaveLength(1);
      expect(parsedSpec.servers[0].url).toBe('https://api.example.com/v1');
    });
    
    test('parses endpoints correctly', () => {
      const provider = createMockProvider({
        parseOpenAPISpec: jest.fn(spec => {
          const parser = new OpenAPIParser({} as IProvider);
          return (parser as any).defaultParse(spec);
        })
      });
      
      const parser = new OpenAPIParser(provider);
      const spec = createSampleSpec();
      
      const parsedSpec = parser.parse(spec);
      
      expect(parsedSpec.endpoints).toBeDefined();
      expect(parsedSpec.endpoints).toHaveLength(5); // The sample has 5 operations
      
      // Check the list customers endpoint
      const listEndpoint = parsedSpec.endpoints.find(e => e.operationId === 'listCustomers');
      expect(listEndpoint).toBeDefined();
      expect(listEndpoint?.path).toBe('/customers');
      expect(listEndpoint?.method).toBe('GET');
      expect(listEndpoint?.parameters).toHaveLength(1);
      expect(listEndpoint?.parameters[0].name).toBe('limit');
      
      // Check the create customer endpoint
      const createEndpoint = parsedSpec.endpoints.find(e => e.operationId === 'createCustomer');
      expect(createEndpoint).toBeDefined();
      expect(createEndpoint?.path).toBe('/customers');
      expect(createEndpoint?.method).toBe('POST');
      expect(createEndpoint?.requestBody).toBeDefined();
      expect(createEndpoint?.requestBody?.required).toBe(true);
      
      // Check the get customer endpoint
      const getEndpoint = parsedSpec.endpoints.find(e => e.operationId === 'getCustomer');
      expect(getEndpoint).toBeDefined();
      expect(getEndpoint?.path).toBe('/customers/{customerId}');
      expect(getEndpoint?.method).toBe('GET');
      expect(getEndpoint?.parameters).toHaveLength(1);
      expect(getEndpoint?.parameters[0].name).toBe('customerId');
      expect(getEndpoint?.parameters[0].required).toBe(true);
    });
    
    test('parses security schemes correctly', () => {
      const provider = createMockProvider({
        parseOpenAPISpec: jest.fn(spec => {
          const parser = new OpenAPIParser({} as IProvider);
          return (parser as any).defaultParse(spec);
        })
      });
      
      const parser = new OpenAPIParser(provider);
      const spec = createSampleSpec();
      
      const parsedSpec = parser.parse(spec);
      
      expect(parsedSpec.securitySchemes).toBeDefined();
      expect(parsedSpec.securitySchemes.apiKey).toBeDefined();
      expect(parsedSpec.securitySchemes.apiKey.type).toBe('apiKey');
      expect(parsedSpec.securitySchemes.apiKey.in).toBe('header');
      expect(parsedSpec.securitySchemes.apiKey.name).toBe('Authorization');
    });
  });
  
  describe('Filtering options', () => {
    test('filters by includeTags', () => {
      const provider = createMockProvider({
        parseOpenAPISpec: jest.fn(spec => {
          const parser = new OpenAPIParser({} as IProvider, { includeTags: ['Users'] });
          return (parser as any).defaultParse(spec);
        })
      });
      
      const parser = new OpenAPIParser(provider, { includeTags: ['Users'] });
      
      // Add a Users tag to the spec
      const spec = createSampleSpec();
      (spec.paths as any)['/users'] = { // Explicitly cast to 'any'
        get: {
          operationId: 'listUsers',
          summary: 'List users',
          tags: ['Users']
        }
      };
      
      const parsedSpec = parser.parse(spec);
      
      // Should only include the Users endpoint
      expect(parsedSpec.endpoints).toHaveLength(1);
      expect(parsedSpec.endpoints[0].operationId).toBe('listUsers');
    });
    
    test('filters by excludeTags', () => {
      const provider = createMockProvider({
        parseOpenAPISpec: jest.fn(spec => {
          const parser = new OpenAPIParser({} as IProvider, { excludeTags: ['Customers'] });
          return (parser as any).defaultParse(spec);
        })
      });
      
      const parser = new OpenAPIParser(provider, { excludeTags: ['Customers'] });
      
      // Add a Users tag to the spec
      const spec = createSampleSpec();
      (spec.paths as any)['/users'] = { // Explicitly cast to 'any'
        get: {
          operationId: 'listUsers',
          summary: 'List users',
          tags: ['Users']
        }
      };
      
      const parsedSpec = parser.parse(spec);
      
      // Should exclude all Customers endpoints
      expect(parsedSpec.endpoints).toHaveLength(1);
      expect(parsedSpec.endpoints[0].operationId).toBe('listUsers');
    });
    
    test('filters by includeOperations', () => {
      const provider = createMockProvider({
        parseOpenAPISpec: jest.fn(spec => {
          const parser = new OpenAPIParser({} as IProvider, { 
            includeOperations: ['getCustomer', 'updateCustomer'] 
          });
          return (parser as any).defaultParse(spec);
        })
      });
      
      const parser = new OpenAPIParser(provider, { 
        includeOperations: ['getCustomer', 'updateCustomer'] 
      });
      
      const spec = createSampleSpec();
      
      const parsedSpec = parser.parse(spec);
      
      // Should only include the specified operations
      expect(parsedSpec.endpoints).toHaveLength(2);
      expect(parsedSpec.endpoints.map(e => e.operationId)).toContain('getCustomer');
      expect(parsedSpec.endpoints.map(e => e.operationId)).toContain('updateCustomer');
    });
    
    test('filters by excludeOperations', () => {
      const provider = createMockProvider({
        parseOpenAPISpec: jest.fn(spec => {
          const parser = new OpenAPIParser({} as IProvider, { 
            excludeOperations: ['deleteCustomer'] 
          });
          return (parser as any).defaultParse(spec);
        })
      });
      
      const parser = new OpenAPIParser(provider, { 
        excludeOperations: ['deleteCustomer'] 
      });
      
      const spec = createSampleSpec();
      
      const parsedSpec = parser.parse(spec);
      
      // Should exclude the specified operation
      expect(parsedSpec.endpoints.map(e => e.operationId)).not.toContain('deleteCustomer');
    });
  });
  
  describe('Error handling', () => {
    test('throws error for missing openapi version', () => {
      const provider = createMockProvider();
      const parser = new OpenAPIParser(provider);
      
      const invalidSpec = {
        info: {
          title: 'Invalid API',
          version: '1.0.0'
        },
        paths: {}
      };
      
      expect(() => parser.parse(invalidSpec)).toThrow('missing openapi version');
    });
    
    test('throws error for missing info field', () => {
      const provider = createMockProvider();
      const parser = new OpenAPIParser(provider);
      
      const invalidSpec = {
        openapi: '3.0.0',
        paths: {}
      };
      
      expect(() => parser.parse(invalidSpec)).toThrow('missing info field');
    });
    
    test('throws error for missing paths field', () => {
      const provider = createMockProvider();
      const parser = new OpenAPIParser(provider);
      
      const invalidSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Invalid API',
          version: '1.0.0'
        }
      };
      
      expect(() => parser.parse(invalidSpec)).toThrow('missing paths field');
    });
    
    test('throws error for unsupported OpenAPI version', () => {
      const provider = createMockProvider();
      const parser = new OpenAPIParser(provider);
      
      const invalidSpec = {
        openapi: '2.0.0', // Not supported
        info: {
          title: 'Invalid API',
          version: '1.0.0'
        },
        paths: {}
      };
      
      expect(() => parser.parse(invalidSpec)).toThrow('Unsupported OpenAPI version');
    });
  });
});