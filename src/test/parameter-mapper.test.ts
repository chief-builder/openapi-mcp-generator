// parameter-mapper.test.ts
import {
    mapStripeParametersToSchema,
    mapStripeResponsesToSchema,
    operationIdToToolName,
    capitalizeString
  } from '../providers/stripe/parameter-mapper';
  import { IParsedEndpoint } from '../core/models/parser-types';
  import { MCPCapabilityType } from '../core/models/mcp-types';
  
  describe('Stripe Parameter Mapper', () => {
    test('capitalizeString capitalizes first letter only', () => {
      expect(capitalizeString('test')).toBe('Test');
      expect(capitalizeString('TEST')).toBe('TEST');
      expect(capitalizeString('t')).toBe('T');
      expect(capitalizeString('')).toBe('');
    });
  
    test('operationIdToToolName converts operation IDs correctly', () => {
      // Test resource.method format
      expect(operationIdToToolName('customers.create')).toBe('createCustomers');
      expect(operationIdToToolName('customers.retrieve')).toBe('getCustomers');
      expect(operationIdToToolName('customers.update')).toBe('updateCustomers');
      expect(operationIdToToolName('customers.delete')).toBe('deleteCustomers');
      expect(operationIdToToolName('customers.list')).toBe('listCustomerss');
      
      // Test non-standard formats
      expect(operationIdToToolName('create_customer')).toBe('createCustomer');
      expect(operationIdToToolName('get-customer')).toBe('getCustomer');
    });
  
    test('mapStripeParametersToSchema maps parameters correctly', () => {
      const mockOperation: IParsedEndpoint = {
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
          },
          {
            name: 'expand',
            required: false,
            schema: { type: 'array', items: { type: 'string' } },
            in: 'query',
            description: 'Fields to expand'
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        },
        tags: ['Customers'],
        extensions: {}
      };
  
      const schema = mapStripeParametersToSchema(mockOperation);
      
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties?.customer).toBeDefined();
      expect(schema.properties?.expand).toBeDefined();
      expect(schema.required).toContain('customer');
    });
  
    test('mapStripeResponsesToSchema maps responses correctly', () => {
      const mockOperation: IParsedEndpoint = {
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
        tags: ['Customers'],
        extensions: {}
      };
  
      const schema = mapStripeResponsesToSchema(mockOperation);
      
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties?.id).toBeDefined();
      expect(schema.properties?.name).toBeDefined();
      expect(schema.properties?.email).toBeDefined();
    });
  
    test('mapStripeResponsesToSchema handles missing response schema', () => {
      const mockOperation: IParsedEndpoint = {
        path: '/v1/customers/{customer}',
        method: 'GET',
        operationId: 'customers.retrieve',
        summary: 'Get customer',
        description: 'Retrieves a customer by ID',
        parameters: [],
        responses: {
          '204': {
            description: 'No content',
            // No content or schema
          }
        },
        tags: ['Customers'],
        extensions: {}
      };
  
      const schema = mapStripeResponsesToSchema(mockOperation);
      
      // Should return a default schema
      expect(schema.type).toBe('object');
      expect(schema.description).toBeDefined();
    });
  });