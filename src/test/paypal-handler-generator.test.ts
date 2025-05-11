/**
 * Tests for PayPal Handler Generator
 */
import { 
  generatePayPalHandler, 
  IPayPalHandlerOptions,
  extractResourceFromOperationId,
  extractMethodFromOperationId
} from '../providers/paypal/handler-generator';
import { IParsedEndpoint } from '../core/models/parser-types';

describe('PayPal Handler Generator', () => {
  // Create a sample operation for testing
  const createSampleOperation = (overrides: Partial<IParsedEndpoint> = {}): IParsedEndpoint => {
    return {
      path: '/v1/payments/orders',
      method: 'POST',
      operationId: 'orders/create',
      summary: 'Create an order',
      description: 'Creates a PayPal order.',
      parameters: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                intent: { type: 'string', enum: ['CAPTURE', 'AUTHORIZE'] },
                purchase_units: { 
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Order created successfully',
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        }
      },
      tags: ['Orders'],
      extensions: {},
      ...overrides
    };
  };

  describe('generatePayPalHandler', () => {
    test('generates basic handler with default options', () => {
      const operation = createSampleOperation();
      const result = generatePayPalHandler(operation);
      
      // Check for key elements in the generated code
      expect(result).toContain('private async createOrders(params');
      expect(result).toContain('const paypal = this.getPayPalClient(authContext)');
      expect(result).toContain('Handler for orders/create');
      expect(result).toContain('Creates a PayPal order.');
      expect(result).toContain('throw this.transformPayPalError(error)');
    });

    test('generates handler with type annotations when includeTypes is true', () => {
      const operation = createSampleOperation();
      const options: IPayPalHandlerOptions = {
        includeTypes: true
      };
      
      const result = generatePayPalHandler(operation, options);
      
      expect(result).toContain('params: any');
      expect(result).toContain('): any');
    });

    test('generates handler without type annotations when includeTypes is false', () => {
      const operation = createSampleOperation();
      const options: IPayPalHandlerOptions = {
        includeTypes: false
      };
      
      const result = generatePayPalHandler(operation, options);
      
      expect(result).toContain('params');
      expect(result).not.toContain('params: any');
      expect(result).not.toContain('): any');
    });

    test('includes operation description in comments when provided', () => {
      const operation = createSampleOperation({
        description: 'A detailed description of the order creation process.'
      });
      
      const result = generatePayPalHandler(operation);
      
      expect(result).toContain('A detailed description of the order creation process.');
    });

    test('handles operations without descriptions', () => {
      const operation = createSampleOperation({
        description: undefined
      });
      
      const result = generatePayPalHandler(operation);
      
      expect(result).toContain('Handler for orders/create');
      expect(result).not.toContain('undefined');
    });

    test('generates handler with camelCase operation ID', () => {
      const operation = createSampleOperation({
        operationId: 'createOrder'
      });
      
      const result = generatePayPalHandler(operation);
      
      expect(result).toContain('private async createOrder');
    });
  });

  describe('extractResourceFromOperationId', () => {
    test('extracts resource from resource/method pattern', () => {
      expect(extractResourceFromOperationId('orders/create')).toBe('orders');
      expect(extractResourceFromOperationId('payments/capture')).toBe('payments');
      expect(extractResourceFromOperationId('subscriptions/cancel')).toBe('subscriptions');
    });

    test('extracts resource from camelCase pattern', () => {
      expect(extractResourceFromOperationId('createOrder')).toBe('order');
      expect(extractResourceFromOperationId('getPayment')).toBe('payment');
      expect(extractResourceFromOperationId('updateSubscription')).toBe('subscription');
      expect(extractResourceFromOperationId('deleteInvoice')).toBe('invoice');
      expect(extractResourceFromOperationId('listItems')).toBe('items');
    });

    test('handles versioned operation IDs', () => {
      expect(extractResourceFromOperationId('v1/orders/create')).toBe('orders');
      expect(extractResourceFromOperationId('v2/payments/capture')).toBe('payments');
    });

    test('returns empty string for invalid or unrecognized operation IDs', () => {
      expect(extractResourceFromOperationId('')).toBe('');
      expect(extractResourceFromOperationId('invalid')).toBe('');
    });
  });

  describe('extractMethodFromOperationId', () => {
    test('extracts method from resource/method pattern', () => {
      expect(extractMethodFromOperationId('orders/create')).toBe('create');
      expect(extractMethodFromOperationId('payments/capture')).toBe('capture');
      expect(extractMethodFromOperationId('subscriptions/cancel')).toBe('cancel');
    });

    test('extracts method from camelCase pattern', () => {
      expect(extractMethodFromOperationId('createOrder')).toBe('create');
      expect(extractMethodFromOperationId('getPayment')).toBe('get');
      expect(extractMethodFromOperationId('updateSubscription')).toBe('update');
      expect(extractMethodFromOperationId('deleteInvoice')).toBe('delete');
      expect(extractMethodFromOperationId('listItems')).toBe('list');
    });

    test('handles versioned operation IDs', () => {
      expect(extractMethodFromOperationId('v1/orders/create')).toBe('create');
      expect(extractMethodFromOperationId('v2/payments/capture')).toBe('capture');
    });

    test('returns empty string for invalid or unrecognized operation IDs', () => {
      expect(extractMethodFromOperationId('')).toBe('');
      expect(extractMethodFromOperationId('invalid')).toBe('');
    });
  });
});