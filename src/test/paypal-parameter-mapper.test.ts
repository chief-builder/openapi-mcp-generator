import {
    mapPayPalParametersToSchema,
    mapPayPalResponsesToSchema,
    operationIdToToolName,
    capitalizeString,
    determineToolAnnotations
  } from '../providers/paypal/parameter-mapper';
  import { IParsedEndpoint } from '../core/models/parser-types';
  
  describe('PayPal Parameter Mapper', () => {
    // Helper function to create a basic mock endpoint
    const createMockEndpoint = (overrides: Partial<IParsedEndpoint> = {}): IParsedEndpoint => ({
      path: '/v1/payments/{payment_id}',
      method: 'GET',
      operationId: 'v1/payments/get',
      summary: 'Get payment',
      description: 'Retrieves a payment by ID',
      parameters: [],
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
      tags: ['Payments'],
      extensions: {},
      ...overrides
    });

    describe('capitalizeString', () => {
      test('capitalizes first letter only', () => {
        expect(capitalizeString('test')).toBe('Test');
        expect(capitalizeString('TEST')).toBe('TEST');
        expect(capitalizeString('t')).toBe('T');
        expect(capitalizeString('')).toBe('');
        expect(capitalizeString(null as unknown as string)).toBe('');
      });
    });
  
    describe('operationIdToToolName', () => {
      test('converts resource/method operation IDs correctly', () => {
        expect(operationIdToToolName('v1/payments/create')).toBe('createPayments');
        expect(operationIdToToolName('v1/payments/get')).toBe('getPayments');
        expect(operationIdToToolName('v2/orders/update')).toBe('updateOrders');
        expect(operationIdToToolName('v1/payments/delete')).toBe('deletePayments');
        expect(operationIdToToolName('v1/payments/list')).toBe('listPaymentss');
      });

      test('handles operation IDs without version prefix', () => {
        expect(operationIdToToolName('payments/create')).toBe('createPayments');
        expect(operationIdToToolName('orders/get')).toBe('getOrders');
      });

      test('handles operation IDs that don\'t follow resource/method pattern', () => {
        expect(operationIdToToolName('get_payment_status')).toBe('getPaymentStatus');
        expect(operationIdToToolName('update-payment-details')).toBe('updatePaymentDetails');
        expect(operationIdToToolName('CancelSubscription')).toBe('cancelSubscription');
      });

      test('handles empty or undefined operation IDs', () => {
        expect(operationIdToToolName('')).toBe('unknownTool');
        expect(operationIdToToolName(undefined as unknown as string)).toBe('unknownTool');
      });

      test('handles custom method names', () => {
        expect(operationIdToToolName('payments/capture')).toBe('capturePayments');
        expect(operationIdToToolName('orders/authorize')).toBe('authorizeOrders');
      });
    });
  
    describe('mapPayPalParametersToSchema', () => {
      test('maps path and query parameters correctly', () => {
        const mockOperation = createMockEndpoint({
          parameters: [
            {
              name: 'payment_id',
              required: true,
              schema: { type: 'string' },
              in: 'path',
              description: 'Payment ID'
            },
            {
              name: 'fields',
              required: false,
              schema: { type: 'string' },
              in: 'query',
              description: 'Fields to include'
            }
          ]
        });
  
        const schema = mapPayPalParametersToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        expect(schema.properties?.payment_id).toBeDefined();
        expect(schema.properties?.payment_id.type).toBe('string');
        expect(schema.properties?.payment_id.description).toBe('Payment ID');
        expect(schema.properties?.fields).toBeDefined();
        expect(schema.properties?.fields.type).toBe('string');
        expect(schema.required).toContain('payment_id');
        expect(schema.required).not.toContain('fields');
      });

      test('skips reference parameters', () => {
        const mockOperation = createMockEndpoint({
          parameters: [
            {
              name: 'reference',
              required: true,
              schema: { type: 'string' },
              in: 'query',
              description: 'Reference parameter'
            }
          ]
        });
  
        const schema = mapPayPalParametersToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties?.reference).toBeUndefined();
      });

      test('adds request body parameters for POST operations', () => {
        const mockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/payments/create',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['intent', 'purchase_units'],
                  properties: {
                    intent: { 
                      type: 'string',
                      description: 'Intent of the payment'
                    },
                    purchase_units: {
                      type: 'array',
                      description: 'Purchase units'
                    }
                  }
                }
              }
            }
          }
        });
  
        const schema = mapPayPalParametersToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        expect(schema.properties?.intent).toBeDefined();
        expect(schema.properties?.intent.type).toBe('string');
        expect(schema.properties?.purchase_units).toBeDefined();
        expect(schema.properties?.purchase_units.type).toBe('array');
        expect(schema.required).toContain('intent');
        expect(schema.required).toContain('purchase_units');
      });

      test('handles content types other than application/json', () => {
        const mockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/payments/create',
          requestBody: {
            required: true,
            content: {
              'application/x-www-form-urlencoded': {
                schema: {
                  type: 'object',
                  properties: {
                    grant_type: { 
                      type: 'string',
                      description: 'Grant type'
                    }
                  }
                }
              }
            }
          }
        });
  
        const schema = mapPayPalParametersToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        expect(schema.properties?.grant_type).toBeDefined();
        expect(schema.properties?.grant_type.type).toBe('string');
      });

      test('adds id parameter for get operations with resource pattern', () => {
        const mockOperation = createMockEndpoint({
          operationId: 'v1/payment/get'
        });
  
        const schema = mapPayPalParametersToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        expect(schema.properties?.id).toBeDefined();
        expect(schema.properties?.id.type).toBe('string');
        expect(schema.properties?.id.description).toBe('payment ID');
        expect(schema.required).toContain('id');
      });

      test('adds common pagination parameters for list operations', () => {
        const mockOperation = createMockEndpoint({
          operationId: 'v1/payments/list'
        });
  
        const schema = mapPayPalParametersToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        expect(schema.properties?.page).toBeDefined();
        expect(schema.properties?.page_size).toBeDefined();
        expect(schema.properties?.sort_by).toBeDefined();
        expect(schema.properties?.sort_order).toBeDefined();
        
        expect(schema.properties?.page.type).toBe('integer');
        expect(schema.properties?.page.default).toBe(1);
        expect(schema.properties?.page_size.type).toBe('integer');
        expect(schema.properties?.sort_order.enum).toEqual(['asc', 'desc']);
      });

      test('does not override existing pagination parameters', () => {
        const mockOperation = createMockEndpoint({
          operationId: 'v1/payments/list',
          parameters: [
            {
              name: 'page',
              required: false,
              schema: { 
                type: 'integer',
                default: 5
              },
              in: 'query',
              description: 'Custom page parameter'
            }
          ]
        });
  
        const schema = mapPayPalParametersToSchema(mockOperation);
        
        expect(schema.properties?.page).toBeDefined();
        expect(schema.properties?.page.default).toBe(5);
        expect(schema.properties?.page.description).toBe('Custom page parameter');
      });

      test('handles operation without operationId', () => {
        const mockOperation = createMockEndpoint({
          operationId: undefined
        });
  
        const schema = mapPayPalParametersToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
      });
    });
  
    describe('mapPayPalResponsesToSchema', () => {
      test('maps successful responses correctly', () => {
        const mockOperation = createMockEndpoint({
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { 
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      status: { type: 'string' },
                      amount: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        });
  
        const schema = mapPayPalResponsesToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        expect(schema.properties?.id).toBeDefined();
        expect(schema.properties?.status).toBeDefined();
        expect(schema.properties?.amount).toBeDefined();
      });

      test('handles 201 responses if 200 is not available', () => {
        const mockOperation = createMockEndpoint({
          responses: {
            '201': {
              description: 'Created successfully',
              content: {
                'application/json': {
                  schema: { 
                    type: 'object',
                    properties: {
                      id: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        });
  
        const schema = mapPayPalResponsesToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        expect(schema.properties?.id).toBeDefined();
        expect(schema.description).toBe('Created successfully');
      });

      test('handles other 2xx responses if 200 and 201 are not available', () => {
        const mockOperation = createMockEndpoint({
          responses: {
            '204': {
              description: 'No content',
              content: {
                'application/json': {
                  schema: { 
                    type: 'object',
                    description: 'Empty response'
                  }
                }
              }
            }
          }
        });
  
        const schema = mapPayPalResponsesToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        // The function prioritizes the schema's description over the response description
        expect(schema.description).toBe('Empty response');
      });

      test('returns default schema when no success response is found', () => {
        const mockOperation = createMockEndpoint({
          responses: {
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: { 
                    type: 'object',
                    properties: {
                      error: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        });
  
        const schema = mapPayPalResponsesToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.description).toBe('PayPal API response');
      });

      test('returns default schema when response has no content', () => {
        const mockOperation = createMockEndpoint({
          responses: {
            '200': {
              description: 'Success'
            }
          }
        });
  
        const schema = mapPayPalResponsesToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        // The function returns a default description when response has no content
        expect(schema.description).toBe('PayPal API response');
      });

      test('handles content types other than application/json', () => {
        const mockOperation = createMockEndpoint({
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/xml': {
                  schema: { 
                    type: 'object',
                    properties: {
                      result: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        });
  
        const schema = mapPayPalResponsesToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.properties?.result).toBeDefined();
      });

      test('adds description to response schema if not present', () => {
        const mockOperation = createMockEndpoint({
          responses: {
            '200': {
              description: 'Custom description',
              content: {
                'application/json': {
                  schema: { 
                    type: 'object'
                  }
                }
              }
            }
          }
        });
  
        const schema = mapPayPalResponsesToSchema(mockOperation);
        
        expect(schema.type).toBe('object');
        expect(schema.description).toBe('Custom description');
      });
    });

    describe('singularize', () => {
      // Test for the private singularize function through the formatToolTitle function
      test('handles singularizing words correctly', () => {
        // The singularize function is private, but it's used by formatToolTitle
        // which is used by determineToolAnnotations
        
        // Test for words ending in 'ies'
        const mockOperation1 = createMockEndpoint({
          operationId: 'v1/categories/get'
        });
        const annotations1 = determineToolAnnotations(mockOperation1);
        expect(annotations1.title).toBe('Get Category');
        
        // Test for words ending in regular 's'
        const mockOperation2 = createMockEndpoint({
          operationId: 'v1/orders/get'
        });
        const annotations2 = determineToolAnnotations(mockOperation2);
        expect(annotations2.title).toBe('Get Order');
        
        // Test for words not ending in 's'
        const mockOperation3 = createMockEndpoint({
          operationId: 'v1/payment/get'
        });
        const annotations3 = determineToolAnnotations(mockOperation3);
        expect(annotations3.title).toBe('Get Payment');
        
        // Test for words ending in 'ss' (should not be singularized)
        const mockOperation4 = createMockEndpoint({
          operationId: 'v1/process/get'
        });
        const annotations4 = determineToolAnnotations(mockOperation4);
        expect(annotations4.title).toBe('Get Process');
      });
    });

    describe('formatToolTitle', () => {
      // Test for the private formatToolTitle function through the determineToolAnnotations function
      test('formats operation IDs into tool titles', () => {
        // Resource/action pattern
        let mockOperation = createMockEndpoint({
          operationId: 'v1/payments/create'
        });
        let annotations = determineToolAnnotations(mockOperation);
        expect(annotations.title).toBe('Create Payment');
        
        // With underscores in resource name
        mockOperation = createMockEndpoint({
          operationId: 'v1/payment_tokens/create'
        });
        annotations = determineToolAnnotations(mockOperation);
        expect(annotations.title).toBe('Create Payment Token');
        
        // Non-resource/action pattern
        mockOperation = createMockEndpoint({
          operationId: 'createPayment'
        });
        annotations = determineToolAnnotations(mockOperation);
        expect(annotations.title).toBe('Create Payment');
        
        // Empty or undefined
        mockOperation = createMockEndpoint({
          operationId: ''
        });
        annotations = determineToolAnnotations(mockOperation);
        expect(annotations.title).toBe('Unknown Tool');
      });
    });
    
    describe('determineToolAnnotations', () => {
      test('sets correct title from operationId', () => {
        const mockOperation = createMockEndpoint({
          operationId: 'v1/payments/create'
        });
  
        const annotations = determineToolAnnotations(mockOperation);
        
        expect(annotations.title).toBe('Create Payment');
      });

      test('determines read-only hint based on method', () => {
        // GET should be read-only
        const getMockOperation = createMockEndpoint({
          method: 'GET'
        });
        expect(determineToolAnnotations(getMockOperation).readOnlyHint).toBe(true);
        
        // POST should not be read-only
        const postMockOperation = createMockEndpoint({
          method: 'POST'
        });
        expect(determineToolAnnotations(postMockOperation).readOnlyHint).toBe(false);
      });

      test('determines destructive hint based on method and operation ID', () => {
        // DELETE is always destructive
        const deleteMockOperation = createMockEndpoint({
          method: 'DELETE',
          operationId: 'v1/payments/delete'
        });
        expect(determineToolAnnotations(deleteMockOperation).destructiveHint).toBe(true);
        
        // POST with "cancel" in the name is destructive
        const cancelMockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/subscriptions/cancel'
        });
        expect(determineToolAnnotations(cancelMockOperation).destructiveHint).toBe(true);
        
        // Regular POST is not destructive
        const createMockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/payments/create'
        });
        expect(determineToolAnnotations(createMockOperation).destructiveHint).toBe(false);
      });

      test('tests all destructive keywords', () => {
        // Test for all destructive keywords in isDestructiveOperation
        
        // 'delete' keyword
        const deleteMockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/payments/delete'
        });
        expect(determineToolAnnotations(deleteMockOperation).destructiveHint).toBe(true);
        
        // 'remove' keyword
        const removeMockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/cart/remove_item'
        });
        expect(determineToolAnnotations(removeMockOperation).destructiveHint).toBe(true);
        
        // 'cancel' keyword
        const cancelMockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/subscriptions/cancel'
        });
        expect(determineToolAnnotations(cancelMockOperation).destructiveHint).toBe(true);
        
        // 'void' keyword
        const voidMockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/payments/void'
        });
        expect(determineToolAnnotations(voidMockOperation).destructiveHint).toBe(true);
        
        // 'expire' keyword
        const expireMockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/invoices/expire'
        });
        expect(determineToolAnnotations(expireMockOperation).destructiveHint).toBe(true);
      });

      test('determines idempotent hint based on method and operation ID', () => {
        // GET is always idempotent
        const getMockOperation = createMockEndpoint({
          method: 'GET'
        });
        expect(determineToolAnnotations(getMockOperation).idempotentHint).toBe(true);
        
        // PUT is always idempotent
        const putMockOperation = createMockEndpoint({
          method: 'PUT'
        });
        expect(determineToolAnnotations(putMockOperation).idempotentHint).toBe(true);
        
        // DELETE is considered idempotent in this implementation
        const deleteMockOperation = createMockEndpoint({
          method: 'DELETE'
        });
        expect(determineToolAnnotations(deleteMockOperation).idempotentHint).toBe(true);
        
        // POST update is idempotent
        const updateMockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/payments/update'
        });
        expect(determineToolAnnotations(updateMockOperation).idempotentHint).toBe(true);
        
        // Regular POST is not idempotent
        const createMockOperation = createMockEndpoint({
          method: 'POST',
          operationId: 'v1/payments/create'
        });
        expect(determineToolAnnotations(createMockOperation).idempotentHint).toBe(false);
      });

      test('always sets openWorldHint to true for PayPal operations', () => {
        const mockOperation = createMockEndpoint({});
        expect(determineToolAnnotations(mockOperation).openWorldHint).toBe(true);
      });

      test('handles operations with missing operationId for title', () => {
        const mockOperation = createMockEndpoint({
          operationId: undefined
        });
  
        const annotations = determineToolAnnotations(mockOperation);
        
        expect(annotations.title).toBe('Unknown Tool');
      });
    });
  });