// src/test/integration/provider-integration.test.ts
import { ProviderRegistry } from '../../core/registry/provider-registry';
import { StripeProvider } from '../../providers/stripe/provider';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('Provider Integration', () => {
  const outputDir = path.resolve(__dirname, '../../../test-output-provider');
  
  beforeAll(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(outputDir);
    
    // Register provider
    ProviderRegistry.registerProvider(new StripeProvider());
  });
  
  afterAll(async () => {
    // Clean up test output
    if (fs.existsSync(outputDir)) {
      await fs.remove(outputDir);
    }
  });
  
  test('Provider parses spec and generates server code', async () => {
    // Create a minimal test spec
    const testSpec = {
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
    
    // Get provider
    const provider = ProviderRegistry.getProvider('stripe');
    
    // Parse spec directly using provider
    const parsedSpec = provider.parseOpenAPISpec(testSpec);
    
    expect(parsedSpec).toBeDefined();
    expect(parsedSpec.title).toBe('Test API');
    expect(parsedSpec.endpoints).toBeDefined();
    expect(parsedSpec.endpoints.length).toBe(1);
    
    // Map operations to tools
    const tools = provider.mapOperationsToTools(parsedSpec.endpoints);
    
    expect(tools).toBeDefined();
    expect(tools.length).toBe(1);
    expect(tools[0].id).toBeDefined();
    
    // Generate handlers
    const handlersCode = provider.generateHandlers(parsedSpec.endpoints, {});
    
    expect(handlersCode).toBeDefined();
    expect(typeof handlersCode).toBe('string');
    expect(handlersCode.length).toBeGreaterThan(0);
    
    // Generate server implementation
    const serverCode = provider.generateServerImplementation(parsedSpec, {
      name: 'test-provider',
      version: '1.0.0'
    });
    
    expect(serverCode).toBeDefined();
    expect(typeof serverCode).toBe('string');
    expect(serverCode.length).toBeGreaterThan(0);
    
    // Generate additional files
    if (provider.generateAdditionalFiles) {
      const additionalFiles = provider.generateAdditionalFiles(parsedSpec, {
        name: 'test-provider',
        version: '1.0.0'
      });
      
      expect(additionalFiles).toBeDefined();
      expect(additionalFiles.size).toBeGreaterThan(0);
    }
  });
});