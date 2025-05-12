// src/test/integration/full-integration.test.ts
import * as path from 'path';
import * as fs from 'fs-extra';
import { ProviderRegistry } from '../../core/registry/provider-registry';
import { OpenAPIParser } from '../../core/parser/openapi-parser';
import { MCPGenerator } from '../../core/generator/mcp-generator';
import { StripeProvider } from '../../providers/stripe/provider';

// Test configuration
const config = {
  testSpecPath: path.resolve(__dirname, '../../../specs/test/test-spec.json'),
  outputDir: path.resolve(__dirname, '../../../test-output'),
  serverPort: 9091
};

// Create a simplified test spec
const sampleSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
    description: 'API for integration testing'
  },
  paths: {
    '/customers': {
      get: {
        operationId: 'listCustomers',
        summary: 'List customers',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' }
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

describe('End-to-End Integration', () => {
  beforeAll(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(config.outputDir);
    
    // Create test spec if it doesn't exist
    if (!fs.existsSync(config.testSpecPath)) {
      await fs.ensureDir(path.dirname(config.testSpecPath));
      await fs.writeJSON(config.testSpecPath, sampleSpec, { spaces: 2 });
    }
    
    // Register providers
    ProviderRegistry.registerProvider(new StripeProvider());
  });
  
  afterAll(async () => {
    // Clean up test output
    // Uncomment to clean up after tests (can be useful to keep for debugging)
    // if (fs.existsSync(config.outputDir)) {
    //   await fs.remove(config.outputDir);
    // }
  });
  
  test('Generate server files from spec', async () => {
    // 1. Parse OpenAPI spec
    const provider = ProviderRegistry.getProvider('stripe');
    const parser = new OpenAPIParser(provider);
    const parsedSpec = await parser.parseFromFile(config.testSpecPath);
    
    expect(parsedSpec).toBeDefined();
    expect(parsedSpec.title).toBe('Test API');
    
    // 2. Generate MCP server
    const generator = new MCPGenerator();
    const result = await generator.generate(parsedSpec, provider, {
      serverName: 'test-integration',
      serverVersion: '1.0.0',
      serverDescription: 'Test integration server',
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
      'src/cli.ts'
    ];
    
    for (const file of criticalFiles) {
      const filePath = path.join(config.outputDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = await fs.readFile(filePath, 'utf8');
      expect(content.length).toBeGreaterThan(0);
    }
    
    // Log instructions for manually testing the server
    console.log('\n');
    console.log('=========================================');
    console.log('Server files generated at:', config.outputDir);
    console.log('To manually test the server:');
    console.log(`1. cd ${config.outputDir}`);
    console.log('2. npm install');
    console.log('3. npm run build');
    console.log('4. npm start');
    console.log('=========================================');
    console.log('\n');
  });
});