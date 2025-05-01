// src/test/integration/parser-generator-integration.test.ts
import { OpenAPIParser } from '../../core/parser/openapi-parser';
import { MCPGenerator } from '../../core/generator/mcp-generator';
import { ProviderRegistry } from '../../core/registry/provider-registry';
import { StripeProvider } from '../../providers/stripe/provider';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('Parser-Generator Integration', () => {
  const outputDir = path.resolve(__dirname, '../../../test-output-pg');
  const mockSpecPath = path.resolve(__dirname, '../../../test-resources/mock-spec.json');
  
  beforeAll(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(outputDir);
    
    // Create a mock spec file if it doesn't exist
    if (!fs.existsSync(mockSpecPath)) {
      await fs.ensureDir(path.dirname(mockSpecPath));
      
      const mockSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Mock API',
          version: '1.0.0',
          description: 'API for parser-generator integration testing'
        },
        paths: {
          '/items': {
            get: {
              operationId: 'listItems',
              summary: 'List items',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
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
      };
      
      await fs.writeJSON(mockSpecPath, mockSpec, { spaces: 2 });
    }
    
    // Register provider
    ProviderRegistry.registerProvider(new StripeProvider());
  });
  
  afterAll(async () => {
    // Clean up test output
    if (fs.existsSync(outputDir)) {
      await fs.remove(outputDir);
    }
  });
  
  test('Parser and Generator work together correctly', async () => {
    // Get provider
    const provider = ProviderRegistry.getProvider('stripe');
    
    // Create parser with provider
    const parser = new OpenAPIParser(provider);
    
    // Parse the spec
    const parsedSpec = await parser.parseFromFile(mockSpecPath);
    
    expect(parsedSpec).toBeDefined();
    expect(parsedSpec.title).toBe('Mock API');
    expect(parsedSpec.endpoints).toBeDefined();
    
    // Create generator
    const generator = new MCPGenerator();
    
    // Generate server
    const result = await generator.generate(parsedSpec, provider, {
      serverName: 'test-pg',
      serverVersion: '1.0.0',
      outputDir
    });
    
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    
    // Check that critical files were generated
    const criticalFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/cli.ts'
    ];
    
    for (const file of criticalFiles) {
      const filePath = path.join(outputDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = await fs.readFile(filePath, 'utf8');
      expect(content.length).toBeGreaterThan(0);
    }
  });
});