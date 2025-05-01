// cli.test.ts

// Import the CLI directly without mocking it
import cli from '../cli';

// Mock the dependencies that the CLI uses
jest.mock('../core/registry/provider-registry', () => ({
  ProviderRegistry: {
    getProvider: jest.fn().mockReturnValue({
      name: 'mock-provider',
      version: '1.0.0',
      description: 'Mock provider'
    }),
    getAllProviders: jest.fn().mockReturnValue([
      { name: 'stripe', version: '1.0.0', description: 'Stripe API provider' },
      { name: 'mock', version: '1.0.0', description: 'Mock provider' }
    ])
  }
}));

// Mock fs-extra for file operations
jest.mock('fs-extra', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readJSONSync: jest.fn().mockReturnValue({ version: '0.1.0' })
}));

// Mock console methods
const originalConsole = { ...console };

describe('CLI Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  test('CLI module exports properly', () => {
    // Just verify that the CLI module is loaded correctly
    expect(cli).toBeDefined();
  });
});