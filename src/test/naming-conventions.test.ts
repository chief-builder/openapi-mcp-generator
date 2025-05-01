import * as naming from '../core/models/naming-conventions';

describe('Naming Conventions', () => {
  test('kebabToPascalCase converts correctly', () => {
    expect(naming.kebabToPascalCase('test-string')).toBe('TestString');
    expect(naming.kebabToPascalCase('stripe-mcp-server')).toBe('StripeMcpServer');
    expect(naming.kebabToPascalCase('')).toBe('');
  });

  test('camelToKebabCase converts correctly', () => {
    expect(naming.camelToKebabCase('testString')).toBe('test-string');
    expect(naming.camelToKebabCase('stripeMcpServer')).toBe('stripe-mcp-server');
    expect(naming.camelToKebabCase('')).toBe('');
  });

  test('pascalToKebabCase converts correctly', () => {
    expect(naming.pascalToKebabCase('TestString')).toBe('test-string');
    expect(naming.pascalToKebabCase('StripeMcpServer')).toBe('stripe-mcp-server');
    expect(naming.pascalToKebabCase('')).toBe('');
  });

  test('snakeToCamelCase converts correctly', () => {
    expect(naming.snakeToCamelCase('test_string')).toBe('testString');
    expect(naming.snakeToCamelCase('stripe_mcp_server')).toBe('stripeMcpServer');
    expect(naming.snakeToCamelCase('')).toBe('');
  });

  test('snakeToPascalCase converts correctly', () => {
    expect(naming.snakeToPascalCase('test_string')).toBe('TestString');
    expect(naming.snakeToPascalCase('stripe_mcp_server')).toBe('StripeMcpServer');
    expect(naming.snakeToPascalCase('')).toBe('');
  });

  test('formatServerClassName formats correctly', () => {
    expect(naming.formatServerClassName('stripe')).toBe('StripeServer');
    expect(naming.formatServerClassName('stripe-mcp')).toBe('StripeMcpServer');
  });

  test('formatProviderInterfaceName formats correctly', () => {
    expect(naming.formatProviderInterfaceName('stripe')).toBe('IStripeProvider');
    expect(naming.formatProviderInterfaceName('custom-api')).toBe('ICustomApiProvider');
  });

  test('formatResourceFileName formats correctly', () => {
    expect(naming.formatResourceFileName('customerOperations')).toBe('customer-operations');
    expect(naming.formatResourceFileName('PaymentIntents')).toBe('payment-intents');
  });
});