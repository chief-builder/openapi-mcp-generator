/**
 * Tests for the ProviderRegistry
 */

import { IProvider, ProviderRegistry } from '../core';

// Mock provider implementation
class MockProvider implements IProvider {
  readonly name = 'mock';
  readonly version = '1.0.0';
  readonly description = 'Mock provider for testing';

  parseOpenAPISpec(spec: any) {
    return {
      title: 'Mock API',
      version: '1.0.0',
      servers: [],
      endpoints: [],
      securitySchemes: {},
      components: {
        schemas: {}
      }
    };
  }

  createAuthProvider(config: any) {
    return {
      code: 'mock code',
      name: 'mock-auth',
      type: 'mock'
    };
  }

  mapOperationsToTools(operations: any[]) {
    return [];
  }

  generateHandlers(operations: any[], options: any) {
    return '';
  }

  generateServerImplementation(spec: any, config: any) {
    return '';
  }
}

describe('ProviderRegistry', () => {
  // Clear the registry before each test
  beforeEach(() => {
    // Use the clearProviders method to reset the registry
    ProviderRegistry.clearProviders();
  });

  test('registers a provider', () => {
    const provider = new MockProvider();
    ProviderRegistry.registerProvider(provider);
    expect(ProviderRegistry.hasProvider('mock')).toBe(true);
  });

  test('gets a registered provider', () => {
    const provider = new MockProvider();
    ProviderRegistry.registerProvider(provider);
    const retrievedProvider = ProviderRegistry.getProvider('mock');
    expect(retrievedProvider).toBe(provider);
  });

  test('throws error when getting non-existent provider', () => {
    expect(() => ProviderRegistry.getProvider('non-existent')).toThrow('Provider not found');
  });

  test('returns all registered providers', () => {
    const provider1 = new MockProvider();
    const provider2 = { ...provider1, name: 'mock2' };
    
    ProviderRegistry.registerProvider(provider1);
    ProviderRegistry.registerProvider(provider2 as IProvider);
    
    const allProviders = ProviderRegistry.getAllProviders();
    expect(allProviders.length).toBe(2);
    expect(allProviders.map(p => p.name).sort()).toEqual(['mock', 'mock2']);
  });

  test('checks if a provider is registered', () => {
    const provider = new MockProvider();
    ProviderRegistry.registerProvider(provider);
    
    expect(ProviderRegistry.hasProvider('mock')).toBe(true);
    expect(ProviderRegistry.hasProvider('non-existent')).toBe(false);
  });
});