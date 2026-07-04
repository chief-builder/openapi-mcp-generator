/**
 * Tests for the OpenAPI Parser
 */

import { OpenAPIParser } from '../core/parser/openapi-parser';
import { IProvider } from '../core/models/provider';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock provider implementation
const mockProvider: IProvider = {
  name: 'mock',
  version: '1.0.0',
  description: 'Mock provider for testing',
  
  parseOpenAPISpec: jest.fn((spec) => ({
    title: spec.info?.title || 'Mock API',
    version: spec.info?.version || '1.0.0',
    servers: spec.servers || [],
    endpoints: [],
    securitySchemes: {},
    components: {
      schemas: {}
    }
  })),
  
  createAuthProvider: jest.fn(() => ({
    code: 'mock code',
    name: 'mock-auth',
    type: 'mock'
  })),
  
  mapOperationsToTools: jest.fn(() => []),
  
  generateHandlers: jest.fn(() => ''),
  
  generateServerImplementation: jest.fn(() => '')
};

describe('OpenAPIParser', () => {
  // Create a temporary spec file for testing
  let tempSpecFile: string;
  
  beforeAll(async () => {
    // Create a temporary directory for test files
    const tempDir = path.join(__dirname, 'temp');
    await fs.ensureDir(tempDir);
    
    // Create a mock OpenAPI spec file
    const mockSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'API for testing'
      },
      paths: {
        '/test': {
          get: {
            operationId: 'getTest',
            summary: 'Get test data',
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        }
      }
    };
    
    tempSpecFile = path.join(tempDir, 'test-spec.json');
    await fs.writeJSON(tempSpecFile, mockSpec);
  });
  
  afterAll(async () => {
    // Clean up temporary files
    await fs.remove(path.dirname(tempSpecFile));
  });
  
  test('creates an instance with the provided provider', () => {
    const parser = new OpenAPIParser(mockProvider);
    expect(parser).toBeDefined();
  });
  
  test('parses an OpenAPI spec file', async () => {
    const parser = new OpenAPIParser(mockProvider);
    const parsedSpec = await parser.parseFromFile(tempSpecFile);
    
    expect(parsedSpec).toBeDefined();
    expect(parsedSpec.title).toBe('Test API');
    expect(parsedSpec.version).toBe('1.0.0');
    
    // Verify that the provider's parseOpenAPISpec method was called
    expect(mockProvider.parseOpenAPISpec).toHaveBeenCalled();
  });

  test('parses the Xquik API key sample spec', async () => {
    const sampleProvider: IProvider = {
      ...mockProvider,
      parseOpenAPISpec: jest.fn((spec) => {
        const parser = new OpenAPIParser({} as IProvider);
        return (parser as any).defaultParse(spec);
      })
    };
    const parser = new OpenAPIParser(sampleProvider);
    const sampleSpecPath = path.join(__dirname, '../../specs/xquik/openapi.json');
    const parsedSpec = await parser.parseFromFile(sampleSpecPath);

    expect(parsedSpec.title).toBe('Xquik REST API Sample');
    expect(parsedSpec.servers[0].url).toBe('https://xquik.com/api/v1');
    expect(parsedSpec.securitySchemes).toHaveProperty('XquikApiKey');
    expect(parsedSpec.endpoints.map(endpoint => endpoint.operationId)).toEqual([
      'getAccount',
      'createMonitor',
      'createWebhook'
    ]);
  });
  
  test('throws an error when the spec file does not exist', async () => {
    const parser = new OpenAPIParser(mockProvider);
    await expect(parser.parseFromFile('nonexistent.json')).rejects.toThrow();
  });
});
