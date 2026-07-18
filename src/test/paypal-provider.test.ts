import { PayPalProvider } from '../providers/paypal/provider';
import { IParsedSpec, IParsedEndpoint } from '../core/models/parser-types';
import { MCPCapabilityType } from '../core/models/mcp-types';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock fs and path to avoid file system operations
// Mock file system operations before importing Provider
jest.mock('fs-extra', () => {
  return {
    readFileSync: jest.fn().mockReturnValue('mock template content'),
    existsSync: jest.fn().mockReturnValue(true)
  };
});

describe('PayPalProvider', () => {
  let provider: PayPalProvider;

  // Create endpoint helper
  const createEndpoint = (overrides: Partial<IParsedEndpoint> = {}): IParsedEndpoint => ({
    path: '/v1/payments',
    method: 'GET',
    operationId: 'v1/payments/list',
    summary: 'List payments',
    description: 'List all payments',
    parameters: [],
    responses: {
      '200': {
        description: 'Success',
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

  beforeEach(() => {
    provider = new PayPalProvider();
    jest.clearAllMocks();
  });

  test('has correct name and version', () => {
    expect(provider.name).toBe('paypal');
    expect(provider.version).toBe('1.0.0');
    expect(provider.description).toBeDefined();
  });

  describe('mapOperationsToTools', () => {
    test('maps operations to tools', () => {
      const operations: IParsedEndpoint[] = [
        createEndpoint({
          path: '/v1/payments',
          method: 'POST',
          operationId: 'v1/payments/create',
          description: 'Create a new payment',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    intent: { type: 'string' }
                  }
                }
              }
            }
          }
        })
      ];

      const tools = provider.mapOperationsToTools(operations);

      expect(tools).toHaveLength(1);
      expect(tools[0].id).toBe('createPayments');
      expect(tools[0].type).toBe(MCPCapabilityType.Tool);
      expect(tools[0].parameters).toBeDefined();
      expect(tools[0].returns).toBeDefined();
      expect(tools[0].requiresAuth).toBe(true);
    });

    test('includes operation path and method in metadata', () => {
      const operations: IParsedEndpoint[] = [
        createEndpoint({
          path: '/v1/payments',
          method: 'GET',
          operationId: 'v1/payments/list'
        })
      ];

      const tools = provider.mapOperationsToTools(operations);

      expect(tools[0].metadata).toBeDefined();
      expect(tools[0].metadata?.path).toBe('/v1/payments');
      expect(tools[0].metadata?.method).toBe('GET');
      expect(tools[0].metadata?.operationId).toBe('v1/payments/list');
    });

    test('correctly sets tool annotations based on operation type', () => {
      // Test GET (read-only) operation
      const getOperation = createEndpoint({
        method: 'GET',
        operationId: 'v1/payments/get'
      });

      const getTools = provider.mapOperationsToTools([getOperation]);

      expect(getTools[0].annotations).toBeDefined();
      expect(getTools[0].annotations?.readOnlyHint).toBe(true);
      expect(getTools[0].annotations?.destructiveHint).toBe(false);

      // Test DELETE (destructive) operation
      const deleteOperation = createEndpoint({
        method: 'DELETE',
        operationId: 'v1/payments/delete'
      });

      const deleteTools = provider.mapOperationsToTools([deleteOperation]);

      expect(deleteTools[0].annotations).toBeDefined();
      expect(deleteTools[0].annotations?.readOnlyHint).toBe(false);
      expect(deleteTools[0].annotations?.destructiveHint).toBe(true);

      // Test destructive keywords
      const cancelOperation = createEndpoint({
        method: 'POST',
        operationId: 'v1/payments/cancel'
      });

      const cancelTools = provider.mapOperationsToTools([cancelOperation]);

      expect(cancelTools[0].annotations).toBeDefined();
      expect(cancelTools[0].annotations?.destructiveHint).toBe(true);
    });
  });

  describe('parseOpenAPISpec', () => {
    test('parses OpenAPI spec with PayPal-specific logic', () => {
      const rawSpec = {
        openapi: '3.0.0',
        info: {
          title: 'PayPal API',
          version: '1.0.0'
        },
        paths: {
          '/v1/payments': {
            get: {
              operationId: 'v1/payments/list',
              summary: 'List payments',
              parameters: []
            },
            post: {
              operationId: 'v1/payments/create',
              summary: 'Create payment',
              requestBody: {
                content: {
                  'application/json': {
                    schema: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      };

      const parsedSpec = provider.parseOpenAPISpec(rawSpec);

      expect(parsedSpec.title).toBe('PayPal API');
      expect(parsedSpec.version).toBe('1.0.0');
      expect(parsedSpec.endpoints).toBeDefined();
      expect(parsedSpec.endpoints.length).toBe(2);
    });

    test('handles specs with minimal data', () => {
      const minimalSpec = {
        paths: {
          '/v1/payments': {
            get: {
              // No operationId provided
              parameters: []
            }
          }
        }
      };

      const parsedSpec = provider.parseOpenAPISpec(minimalSpec);

      expect(parsedSpec.title).toBe('PayPal API'); // Default title
      expect(parsedSpec.version).toBe('1.0.0'); // Default version
      expect(parsedSpec.endpoints).toHaveLength(1);
      // Should generate operationId when not provided
      expect(parsedSpec.endpoints[0].operationId).toBeDefined();
    });

    test('skips deprecated operations', () => {
      const specWithDeprecated = {
        paths: {
          '/v1/payments': {
            get: {
              operationId: 'v1/payments/list',
              deprecated: true
            },
            post: {
              operationId: 'v1/payments/create'
            }
          }
        }
      };

      const parsedSpec = provider.parseOpenAPISpec(specWithDeprecated);

      expect(parsedSpec.endpoints).toHaveLength(1);
      expect(parsedSpec.endpoints[0].operationId).toBe('v1/payments/create');
    });

    test('skips non-HTTP methods and ref objects', () => {
      const specWithNonHttpMethods = {
        paths: {
          '/v1/payments': {
            $ref: '#/components/paths/Payments',
            parameters: [],
            get: {
              operationId: 'v1/payments/list'
            },
            invalid: {
              operationId: 'invalid'
            }
          }
        }
      };

      const parsedSpec = provider.parseOpenAPISpec(specWithNonHttpMethods);

      expect(parsedSpec.endpoints).toHaveLength(1);
      expect(parsedSpec.endpoints[0].operationId).toBe('v1/payments/list');
    });
  });

  describe('private methods accessed through public APIs', () => {
    describe('generateOperationId', () => {
      test('generates operation IDs from paths with no version prefix', () => {
        const rawSpec = {
          paths: {
            '/payments': {
              get: { summary: 'List payments' },
              post: { summary: 'Create payment' }
            },
            '/payments/{id}': {
              get: { summary: 'Get payment' },
              put: { summary: 'Update payment' },
              delete: { summary: 'Delete payment' }
            }
          }
        };

        const parsedSpec = provider.parseOpenAPISpec(rawSpec);

        const operationIds = parsedSpec.endpoints.map(e => e.operationId);

        expect(operationIds).toContain('payments/list');
        expect(operationIds).toContain('payments/create');
        expect(operationIds).toContain('payments/get');
        expect(operationIds).toContain('payments/update');
        expect(operationIds).toContain('payments/delete');
      });

      test('generates operation IDs from paths with version prefix', () => {
        const rawSpec = {
          paths: {
            '/v1/payments': {
              get: { summary: 'List payments' }
            },
            '/v2/payments/{id}/capture': {
              post: { summary: 'Capture payment' }
            }
          }
        };

        const parsedSpec = provider.parseOpenAPISpec(rawSpec);

        const operationIds = parsedSpec.endpoints.map(e => e.operationId);

        expect(operationIds).toContain('v1/payments/list');
        expect(operationIds).toContain('v2/payments/capture');
      });

      test('handles root path correctly', () => {
        const rawSpec = {
          paths: {
            '/': {
              get: { summary: 'API root' }
            }
          }
        };

        const parsedSpec = provider.parseOpenAPISpec(rawSpec);

        expect(parsedSpec.endpoints[0].operationId).toBe('getRoot');
      });
    });

    describe('operationIdToToolName', () => {
      test('converts standard PayPal operation IDs to tool names', () => {
        const operations = [
          createEndpoint({ operationId: 'v1/payments/create' }),
          createEndpoint({ operationId: 'v2/payments/get' }),
          createEndpoint({ operationId: 'v1/payments/update' }),
          createEndpoint({ operationId: 'v1/payments/delete' }),
          createEndpoint({ operationId: 'v1/payments/list' })
        ];

        const tools = provider.mapOperationsToTools(operations);

        expect(tools[0].id).toBe('createPayments');
        expect(tools[1].id).toBe('getPayments');
        expect(tools[2].id).toBe('updatePayments');
        expect(tools[3].id).toBe('deletePayments');
        expect(tools[4].id).toBe('listPaymentss');
      });

      test('handles custom operations and malformed IDs', () => {
        const operations = [
          createEndpoint({ operationId: 'v1/payments/capture' }),
          createEndpoint({ operationId: 'v1/payments/refund' }),
          createEndpoint({ operationId: '' }),
          createEndpoint({ operationId: undefined as any })
        ];

        const tools = provider.mapOperationsToTools(operations);

        expect(tools[0].id).toBe('capturePayments');
        expect(tools[1].id).toBe('refundPayments');
        expect(tools[2].id).toBe('unknownTool');
        expect(tools[3].id).toBe('unknownTool');
      });

      test('converts non-versioned IDs correctly', () => {
        const operations = [
          createEndpoint({ operationId: 'payment_method.create' })
        ];

        const tools = provider.mapOperationsToTools(operations);

        expect(tools[0].id).toBe('paymentMethodCreate');
      });
    });

    describe('formatToolTitle', () => {
      test('formats operation IDs into readable titles', () => {
        const operations = [
          createEndpoint({ operationId: 'v1/payments/create' }),
          createEndpoint({ operationId: 'v1/payment_tokens/create' }),
          createEndpoint({ operationId: 'createPayment' }),
          createEndpoint({ operationId: '' }),
          createEndpoint({ operationId: undefined as any })
        ];

        const tools = provider.mapOperationsToTools(operations);

        expect(tools[0].annotations?.title).toBe('Create Payments');
        expect(tools[1].annotations?.title).toBe('Create Payment Tokens');
        expect(tools[2].annotations?.title).toBe('Create Payment');
        expect(tools[3].annotations?.title).toBe('Unknown Tool');
        expect(tools[4].annotations?.title).toBe('Unknown Tool');
      });
    });
  });

  describe('parameter and response mapping', () => {
    test('maps parameters from URL, query, and body', () => {
      const operation = createEndpoint({
        path: '/v1/payments/{payment_id}',
        method: 'GET',
        parameters: [
          {
            name: 'payment_id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Payment ID'
          },
          {
            name: 'fields',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Fields to include'
          }
        ]
      });

      const tools = provider.mapOperationsToTools([operation]);

      const parametersSchema = tools[0].parameters;
      expect(parametersSchema.properties?.payment_id).toBeDefined();
      expect(parametersSchema.properties?.payment_id.type).toBe('string');
      expect(parametersSchema.properties?.fields).toBeDefined();
      expect(parametersSchema.required).toContain('payment_id');
    });

    test('skips reference parameters', () => {
      const operation = createEndpoint({
        parameters: [
          {
            name: 'reference',
            in: 'query',
            required: true,
            schema: { type: 'string' }
          }
        ]
      });

      const tools = provider.mapOperationsToTools([operation]);

      const parametersSchema = tools[0].parameters;
      expect(parametersSchema.properties?.reference).toBeUndefined();
    });

    test('adds request body parameters for POST operations', () => {
      const operation = createEndpoint({
        method: 'POST',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['intent'],
                properties: {
                  intent: {
                    type: 'string',
                    description: 'Intent of the payment'
                  }
                }
              }
            }
          }
        }
      });

      const tools = provider.mapOperationsToTools([operation]);

      const parametersSchema = tools[0].parameters;
      expect(parametersSchema.properties?.intent).toBeDefined();
      expect(parametersSchema.required).toContain('intent');
    });

    test('maps responses to schema', () => {
      const operation = createEndpoint({
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      });

      const tools = provider.mapOperationsToTools([operation]);

      const returnSchema = tools[0].returns;
      expect(returnSchema.type).toBe('object');
      expect(returnSchema.properties?.id).toBeDefined();
      expect(returnSchema.properties?.status).toBeDefined();
    });

    test('handles missing response content gracefully', () => {
      const operation = createEndpoint({
        responses: {
          '204': {
            description: 'No content'
          }
        }
      });

      const tools = provider.mapOperationsToTools([operation]);

      const returnSchema = tools[0].returns;
      expect(returnSchema.type).toBe('object');
      expect(returnSchema.description).toBe('PayPal API response');
    });

    test('adds common parameters for specific operation types', () => {
      // Test get operation (should add id)
      const getOperation = createEndpoint({
        operationId: 'v1/payments/get',
        path: '/v1/payments/{id}'
      });

      // Test list operation (should add pagination)
      const listOperation = createEndpoint({
        operationId: 'v1/payments/list',
        path: '/v1/payments'
      });

      const tools = provider.mapOperationsToTools([getOperation, listOperation]);

      const getParams = tools[0].parameters;
      expect(getParams.properties?.id).toBeDefined();

      const listParams = tools[1].parameters;
      expect(listParams.properties?.page_size).toBeDefined();
      expect(listParams.properties?.page).toBeDefined();
    });
  });

});
