// src/test/integration/paypal-integration.test.ts
import * as path from 'path';
import * as fs from 'fs-extra';
import { ProviderRegistry } from '../../core/registry/provider-registry';
import { OpenAPIParser } from '../../core/parser/openapi-parser';
import { MCPGenerator } from '../../core/generator/mcp-generator';
import { PayPalProvider } from '../../providers/paypal/provider';

// Test configuration
const config = {
  testSpecPath: path.resolve(__dirname, '../../../specs/paypal/openapi/spec3.json'),
  outputDir: path.resolve(__dirname, '../../../test-output-paypal'),
  serverPort: 9092
};

// Create a simplified test spec
const sampleSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PayPal API',
    version: '1.0.0',
    description: 'API for integration testing'
  },
  paths: {
    '/v1/payments': {
      get: {
        operationId: 'v1/payments/list',
        summary: 'List payments',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    payments: {
                      type: 'array',
                      items: {
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
            }
          }
        }
      }
    }
  }
};

describe('PayPal Integration', () => {
  beforeAll(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(config.outputDir);
    
    // Create test spec if it doesn't exist
    if (!fs.existsSync(config.testSpecPath)) {
      await fs.ensureDir(path.dirname(config.testSpecPath));
      await fs.writeJSON(config.testSpecPath, sampleSpec, { spaces: 2 });
    }
    
    // Register providers
    ProviderRegistry.registerProvider(new PayPalProvider());
  });
  
  test('Generate PayPal server files from spec', async () => {
    // 1. Parse OpenAPI spec
    const provider = ProviderRegistry.getProvider('paypal');
    const parser = new OpenAPIParser(provider);
    const parsedSpec = await parser.parseFromFile(config.testSpecPath);
    
    expect(parsedSpec).toBeDefined();
    expect(parsedSpec.title).toBe('Orders');
    
    // 2. Generate MCP server
    const generator = new MCPGenerator();
    const result = await generator.generate(parsedSpec, provider, {
      serverName: 'paypal-integration',
      serverVersion: '1.0.0',
      serverDescription: 'PayPal integration server',
      outputDir: config.outputDir,
      httpPort: config.serverPort
    });
    
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    
    // 3. Verify critical files exist
    const criticalFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/cli.ts',
      'src/paypal-auth-provider.ts',
      'src/paypal-types.ts'
    ];
    
    for (const file of criticalFiles) {
      const filePath = path.join(config.outputDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = await fs.readFile(filePath, 'utf8');
      expect(content.length).toBeGreaterThan(0);
    }
  });
});