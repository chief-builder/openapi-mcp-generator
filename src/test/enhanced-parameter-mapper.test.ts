// Comprehensive parameter-mapper.test.ts
import {
    mapStripeParametersToSchema,
    mapStripeResponsesToSchema,
    operationIdToToolName,
    capitalizeString
  } from '../providers/stripe/parameter-mapper';
  import { IParsedEndpoint } from '../core/models/parser-types';
  
  describe('Stripe Parameter Mapper', () => {
    describe('capitalizeString', () => {
      test('capitalizes first letter only', () => {
        expect(capitalizeString('test')).toBe('Test');
        expect(capitalizeString('TEST')).toBe('TEST');
        expect(capitalizeString('t')).toBe('T');
        expect(capitalizeString('')).toBe('');
      });
    });
  
    describe('operationIdToToolName', () => {
      test('handles resource.method format', () => {
        expect(operationIdToToolName('customers.create')).toBe('createCustomers');
        expect(operationIdToToolName('customers.retrieve')).toBe('getCustomers');
        expect(operationIdToToolName('customers.update')).toBe('updateCustomers');
        expect(operationIdToToolName('customers.delete')).toBe('deleteCustomers');
        expect(operationIdToToolName('customers.list')).toBe('listCustomerss');
      });
      
      test('handles non-standard formats', () => {
        expect(operationIdToToolName('create_customer')).toBe('createCustomer');
        expect(operationIdToToolName('get-customer')).toBe('getCustomer');
        expect(operationIdToToolName('updateCustomerSource')).toBe('updateCustomerSource');
      });
      
      test('handles edge cases', () => {
        expect(operationIdToToolName('')).toBe('unknownTool');
        expect(operationIdToToolName('resource.custom_method')).toBe('custom_methodResource');
      });
    });
  
    describe('mapStripeParametersToSchema', () => {
      test('maps URL path parameters', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers/{customer}',
          method: 'GET',
          operationId: 'customers.retrieve',
          summary: 'Get customer',
          description: 'Retrieves a customer by ID',
          parameters: [
            {
              name: 'customer',
              required: true,
              schema: { type: 'string' },
              in: 'path',
              description: 'Customer ID'
            }
          ],
          responses: {},
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeParametersToSchema(operation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties?.customer).toBeDefined();
        expect(schema.properties?.customer.type).toBe('string');
        expect(schema.required).toContain('customer');
      });
      
      test('maps query parameters', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers',
          method: 'GET',
          operationId: 'customers.list',
          summary: 'List customers',
          description: 'List all customers',
          parameters: [
            {
              name: 'limit',
              required: false,
              schema: { type: 'integer', default: 10 },
              in: 'query',
              description: 'Limit'
            },
            {
              name: 'starting_after',
              required: false,
              schema: { type: 'string' },
              in: 'query',
              description: 'Starting after'
            }
          ],
          responses: {},
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeParametersToSchema(operation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties?.limit).toBeDefined();
        expect(schema.properties?.limit.type).toBe('integer');
        expect(schema.properties?.starting_after).toBeDefined();
      });
      
      test('adds list operation parameters automatically', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers',
          method: 'GET',
          operationId: 'customers.list',
          summary: 'List customers',
          description: 'List all customers',
          parameters: [],
          responses: {},
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeParametersToSchema(operation);
        
        expect(schema.properties?.limit).toBeDefined();
        expect(schema.properties?.starting_after).toBeDefined();
        expect(schema.properties?.ending_before).toBeDefined();
      });
      
      test('maps request body parameters', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers',
          method: 'POST',
          operationId: 'customers.create',
          summary: 'Create customer',
          description: 'Create a new customer',
          parameters: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string' },
                    name: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {},
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeParametersToSchema(operation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties?.email).toBeDefined();
        expect(schema.properties?.email.type).toBe('string');
        expect(schema.properties?.name).toBeDefined();
        expect(schema.required).toContain('email');
      });
      
      test('adds id parameter for get/update/delete operations', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers/{customer}',
          method: 'DELETE',
          operationId: 'customers.delete',
          summary: 'Delete customer',
          description: 'Delete a customer',
          parameters: [],
          responses: {},
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeParametersToSchema(operation);
        
        expect(schema.properties?.id).toBeDefined();
        expect(schema.properties?.id.type).toBe('string');
        expect(schema.required).toContain('id');
      });
    });
  
    describe('mapStripeResponsesToSchema', () => {
      test('maps 200 response schema', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers/{customer}',
          method: 'GET',
          operationId: 'customers.retrieve',
          summary: 'Get customer',
          description: 'Retrieves a customer by ID',
          parameters: [],
          responses: {
            '200': {
              description: 'Successful response',
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
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeResponsesToSchema(operation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties?.id).toBeDefined();
        expect(schema.properties?.id.type).toBe('string');
        expect(schema.properties?.name).toBeDefined();
        expect(schema.properties?.email).toBeDefined();
      });

      test('maps 201 response schema if 200 not available', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers',
          method: 'POST',
          operationId: 'customers.create',
          summary: 'Create customer',
          description: 'Create a new customer',
          parameters: [],
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
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeResponsesToSchema(operation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties?.id).toBeDefined();
        expect(schema.properties?.name).toBeDefined();
        expect(schema.properties?.email).toBeDefined();
      });
      
      test('maps any 2xx response schema if 200/201 not available', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers/{customer}',
          method: 'DELETE',
          operationId: 'customers.delete',
          summary: 'Delete customer',
          description: 'Delete a customer',
          parameters: [],
          responses: {
            '204': {
              description: 'No content'
            }
          },
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeResponsesToSchema(operation);
        
        // Should provide a default schema
        expect(schema.type).toBe('object');
        expect(schema.description).toBeDefined();
      });
      
      test('provides default schema when no content available', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers/{customer}',
          method: 'DELETE',
          operationId: 'customers.delete',
          summary: 'Delete customer',
          description: 'Delete a customer',
          parameters: [],
          responses: {
            '204': {
              description: 'No content',
              // No content field
            }
          },
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeResponsesToSchema(operation);
        
        // Should provide a default schema
        expect(schema.type).toBe('object');
        expect(schema.description).toBeDefined();
      });
      
      test('handles non-JSON content types', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/files/file/contents',
          method: 'GET',
          operationId: 'files.contents',
          summary: 'Get file contents',
          description: 'Get file contents',
          parameters: [],
          responses: {
            '200': {
              description: 'File contents',
              content: {
                'application/octet-stream': {
                  schema: { 
                    type: 'string',
                    format: 'binary'
                  }
                }
              }
            }
          },
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeResponsesToSchema(operation);
        
        expect(schema.type).toBe('string');
        expect(schema.format).toBe('binary');
      });
      
      test('handles response without schema', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers/{customer}',
          method: 'GET',
          operationId: 'customers.retrieve',
          summary: 'Get customer',
          description: 'Retrieves a customer by ID',
          parameters: [],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  // No schema
                }
              }
            }
          },
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeResponsesToSchema(operation);
        
        // Should provide a default schema
        expect(schema.type).toBe('object');
        expect(schema.description).toBeDefined();
      });
      
      test('handles response without content', () => {
        const operation: IParsedEndpoint = {
          path: '/v1/customers/{customer}',
          method: 'GET',
          operationId: 'customers.retrieve',
          summary: 'Get customer',
          description: 'Retrieves a customer by ID',
          parameters: [],
          responses: {
            '200': {
              description: 'Successful response'
              // No content field
            }
          },
          tags: [],
          extensions: {}
        };
  
        const schema = mapStripeResponsesToSchema(operation);
        
        // Should provide a default schema
        expect(schema.type).toBe('object');
        expect(schema.description).toBeDefined();
      });
    });
  });